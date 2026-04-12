"""
alert_cleanup.py
~~~~~~~~~~~~~~~~
Severity-based data-retention cleanup for the `alerts` table.

Retention windows:
  CRITICAL  → 30 days
  HIGH      → 14 days
  MEDIUM    →  7 days
  LOW       →  3 days

Designed to be called by APScheduler (every 2 hours) or invoked manually via
the CLI / a management endpoint.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from app.models.alert_model import Alert
from app.models.db import db

logger = logging.getLogger(__name__)

# Seconds to keep per severity level.
RETENTION = {
    'critical': 30 * 24 * 3600,
    'high':     14 * 24 * 3600,
    'medium':    7 * 24 * 3600,
    'low':       3 * 24 * 3600,
}


def cleanup_old_alerts() -> dict[str, int]:
    """Delete alerts that exceed their severity-based retention window.

    Returns a dict mapping severity → number of rows deleted.
    Safe to call from any thread (uses a nested db.session context).
    """
    now = datetime.now(tz=timezone.utc).replace(tzinfo=None)  # DB stores naive UTC
    totals: dict[str, int] = {}

    try:
        for severity, max_age_secs in RETENTION.items():
            cutoff = now - timedelta(seconds=max_age_secs)
            deleted = (
                Alert.query
                .filter(Alert.severity == severity)
                .filter(Alert.last_seen < cutoff)
                .delete(synchronize_session=False)
            )
            if deleted:
                totals[severity] = deleted

        # Aggressively prune uninteresting LOW severity noise (even if fresh)
        # Any LOW alert with a score < 1.5 is just single-event noise
        pruned_low = (
            Alert.query
            .filter(Alert.severity == 'low')
            .filter(Alert.alert_score < 1.5)
            .delete(synchronize_session=False)
        )
        if pruned_low:
            totals['low_pruned'] = pruned_low

        db.session.commit()
        if totals:
            logger.info('[AlertCleanup] Deleted rows: %s', totals)
        else:
            logger.debug('[AlertCleanup] Nothing to purge.')
    except Exception as exc:
        db.session.rollback()
        logger.error('[AlertCleanup] Error during cleanup: %s', exc)

    return totals
