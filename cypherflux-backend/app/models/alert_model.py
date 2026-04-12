"""
alert_model.py
~~~~~~~~~~~~~~
SQLAlchemy model for the `alerts` table.

Schema v2 changes:
  • first_seen  — original timestamp of the first detection (never mutated on aggregation)
  • last_seen   — updated to now() on every count increment
  • alert_score — float importance score; recalculated on every upsert
                  formula: severity_weight × log2(count + 1)
                  CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1
  • timestamp   — retained for backwards-compat (equals first_seen on new rows;
                  legacy rows pre-v2 still carry their old value here)
"""

from __future__ import annotations

import math
from datetime import datetime

from app.models.db import db

# Weight per severity level used for alert_score calculation.
SEVERITY_WEIGHTS: dict[str, float] = {
    'critical': 4.0,
    'high':     3.0,
    'medium':   2.0,
    'low':      1.0,
}


def compute_alert_score(severity: str, count: int) -> float:
    """Return a float importance score for an alert.

    Formula: severity_weight × log2(count + 1)
    A single CRITICAL alert scores 4.0.
    A 100-count LOW alert scores 1 × log2(101) ≈ 6.66 — still meaningful
    but a sustained CRITICAL storm at 100 hits scores 28+.
    """
    weight = SEVERITY_WEIGHTS.get(str(severity).lower(), 1.0)
    return round(weight * math.log2(max(count, 1) + 1), 4)


class Alert(db.Model):
    __tablename__ = 'alerts'

    id         = db.Column(db.Integer,  primary_key=True)
    ip         = db.Column(db.String(50),  nullable=False, index=True)   # source IP
    type       = db.Column(db.String(100), nullable=False)
    severity   = db.Column(db.String(20),  nullable=False, default='medium', index=True)
    hostname   = db.Column(db.String(120), nullable=True)
    details    = db.Column(db.Text,        nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    # `timestamp` is kept for backwards-compat with older migration scripts.
    # All new code should read first_seen / last_seen instead.
    timestamp  = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    first_seen = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    last_seen  = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # ── Aggregation ───────────────────────────────────────────────────────────
    # Instead of inserting duplicate rows, increment this counter.
    count      = db.Column(db.Integer, nullable=False, default=1)

    # ── Scoring ───────────────────────────────────────────────────────────────
    # Pre-computed importance score; used for long-term storage ranking.
    alert_score = db.Column(db.Float, nullable=False, default=1.0, index=True)

    # Status tracking
    status     = db.Column(db.String(20), nullable=False, default='active')  # active | resolved

    # ── Composite index for aggregation look-ups ───────────────────────────────
    __table_args__ = (
        db.Index('ix_alerts_ip_type_sev', 'ip', 'type', 'severity'),
        db.Index('ix_alerts_last_seen',   'last_seen'),
        db.Index('ix_alerts_score_desc',  'alert_score'),
    )
