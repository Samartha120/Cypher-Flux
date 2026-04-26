"""
alert_aggregator.py
~~~~~~~~~~~~~~~~~~~
Centralised alert upsert logic for CypherFlux.

ALL alert creation (both from the REST route and the detection engine) must
go through `upsert_alert()`.  This ensures:

  1. Aggregation   — same (ip, type, severity) within AGGREGATE_WINDOW seconds
                     mutates one row instead of inserting a new one.
  2. LOW sampling  — only 1-in-N LOW severity events are persisted to DB.
  3. Global rate   — a token-bucket limits total alert writes per second to
                     prevent the DB being slammed during an attack storm.
  4. Scoring       — alert_score is kept fresh on every upsert.

Env knobs (all optional, defaults shown):
  ALERT_AGGREGATE_WINDOW=300      seconds to group identical events (5 min)
  ALERT_MAX_PER_SEC=50            global write token-bucket capacity
  LOW_SEVERITY_SAMPLE_RATE=5      store 1-in-N LOW alerts (set to 1 to store all)
"""

from __future__ import annotations

import logging
import math
import os
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Optional

from app.models.alert_model import Alert, compute_alert_score
from app.models.db import db

logger = logging.getLogger(__name__)

# ── Config from env ───────────────────────────────────────────────────────────

def _int_env(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except Exception:
        return default

AGGREGATE_WINDOW:      int = _int_env('ALERT_AGGREGATE_WINDOW',  300)   # seconds
MAX_PER_SEC:           int = _int_env('ALERT_MAX_PER_SEC',         50)   # token bucket
LOW_SAMPLE_RATE:       int = _int_env('LOW_SEVERITY_SAMPLE_RATE',   5)   # 1-in-N

# ── Global token-bucket rate limiter ─────────────────────────────────────────
# Controls total alert DB writes per second across all source IPs.

_bucket_lock      = Lock()
_bucket_tokens    = float(MAX_PER_SEC)
_bucket_last_fill = time.monotonic()


def _acquire_token() -> bool:
    """Attempt to consume one write token.  Returns False if rate-limited."""
    global _bucket_tokens, _bucket_last_fill
    with _bucket_lock:
        now   = time.monotonic()
        delta = now - _bucket_last_fill
        # Refill at MAX_PER_SEC tokens/second, capped at MAX_PER_SEC
        _bucket_tokens = min(float(MAX_PER_SEC), _bucket_tokens + delta * MAX_PER_SEC)
        _bucket_last_fill = now
        if _bucket_tokens >= 1.0:
            _bucket_tokens -= 1.0
            return True
        return False


# ── LOW-severity sampling counters ────────────────────────────────────────────
# Per (ip, type) counter; every N-th event is saved; rest are dropped.

_sample_lock: Lock = Lock()
_sample_counters: dict[tuple, int] = defaultdict(int)


def _should_sample_low(ip: str, alert_type: str) -> bool:
    """Return True if this LOW alert should be persisted (1-in-LOW_SAMPLE_RATE)."""
    if LOW_SAMPLE_RATE <= 1:
        return True
    key = (ip, alert_type)
    with _sample_lock:
        _sample_counters[key] += 1
        return (_sample_counters[key] % LOW_SAMPLE_RATE) == 1


# ── Core upsert ───────────────────────────────────────────────────────────────

def upsert_alert(
    ip:          str,
    alert_type:  str,
    severity:    str  = 'medium',
    details:     Optional[str] = None,
    hostname:    Optional[str] = None,
    timestamp:   Optional[datetime] = None,
) -> Optional[Alert]:
    """Create or aggregate an alert record.

    Returns the Alert ORM object (either updated or newly inserted),
    or None if the alert was dropped (rate-limited / sampled away).

    This function commits its own DB transaction.  Do NOT wrap in an
    outer db.session.begin() or the caller's rollback will conflict.
    """

    # ── Normalise inputs ─────────────────────────────────────────────────────
    ip         = str(ip or '').strip()
    alert_type = str(alert_type or '').strip()
    severity   = str(severity or 'medium').strip().lower()

    if not ip or not alert_type:
        logger.debug('[Aggregator] Dropped: missing ip or type')
        return None

    if severity not in ('critical', 'high', 'medium', 'low'):
        severity = 'medium'

    # ── LOW severity sampling ─────────────────────────────────────────────────
    if severity == 'low' and not _should_sample_low(ip, alert_type):
        logger.debug('[Aggregator] Sampled away LOW alert from %s (%s)', ip, alert_type)
        return None

    # ── Global rate limit ─────────────────────────────────────────────────────
    if not _acquire_token():
        logger.warning('[Aggregator] Global rate limit hit — dropping alert %s from %s', alert_type, ip)
        return None

    now = datetime.now(tz=timezone.utc).replace(tzinfo=None)

    try:
        # ── Aggregation window lookup ─────────────────────────────────────────
        window_start = now - timedelta(seconds=AGGREGATE_WINDOW)
        existing: Optional[Alert] = (
            Alert.query
            .filter(Alert.ip       == ip)
            .filter(Alert.type     == alert_type)
            .filter(Alert.severity == severity)
            .filter(Alert.last_seen >= window_start)
            .order_by(Alert.last_seen.desc())
            .with_for_update(skip_locked=True)   # avoid write conflicts
            .first()
        )

        if existing:
            # ── UPDATE path ───────────────────────────────────────────────────
            existing.count      = (existing.count or 1) + 1
            existing.last_seen  = now
            existing.alert_score = compute_alert_score(severity, existing.count)
            if details:
                existing.details = details    # keep detail message fresh
            db.session.commit()
            logger.debug(
                '[Aggregator] Aggregated %s from %s (count=%d score=%.2f)',
                alert_type, ip, existing.count, existing.alert_score,
            )
            return existing

        # ── INSERT path ───────────────────────────────────────────────────────
        first_ts  = timestamp.replace(tzinfo=None) if (timestamp and timestamp.tzinfo) else (timestamp or now)
        new_score = compute_alert_score(severity, 1)

        new_alert = Alert(
            ip          = ip,
            type        = alert_type,
            severity    = severity,
            hostname    = (str(hostname or '').strip() or None),
            details     = (str(details  or '').strip() or None),
            timestamp   = first_ts,    # legacy compat field
            first_seen  = first_ts,
            last_seen   = now,
            count       = 1,
            alert_score = new_score,
            status      = 'active',
        )
        db.session.add(new_alert)
        db.session.commit()

        # ── SMTP Breach Alert Logic ──────────────────────────────────────────
        # If this is a new critical alert, check if email notifications are enabled.
        if severity == 'critical':
            try:
                from app.models.user_setting_model import UserSetting
                from app.models.user_model import User
                from app.services.email.email_service import send_breach_alert
                
                # Fetch global security policy (primary admin settings)
                policy = UserSetting.query.first()
                if policy and policy.smtp_alerts_enabled:
                    # Send to the primary admin account
                    admin = User.query.get(policy.user_id)
                    if admin and admin.email:
                        send_breach_alert(admin.email, {
                            "ip": ip,
                            "type": alert_type,
                            "severity": severity,
                            "details": details or "No additional forensic data available."
                        })
            except Exception as email_err:
                logger.error('[Aggregator] Failed to trigger breach email: %s', email_err)

        logger.debug(
            '[Aggregator] Inserted new alert id=%d %s %s (score=%.2f)',
            new_alert.id, severity, alert_type, new_score,
        )
        return new_alert

    except Exception as exc:
        db.session.rollback()
        logger.error('[Aggregator] DB error during upsert: %s', exc)
        return None
