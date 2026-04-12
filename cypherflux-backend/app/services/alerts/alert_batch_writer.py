"""
alert_batch_writer.py
~~~~~~~~~~~~~~~~~~~~~
In-memory queue for batching new alert row inserts.

Aggregation UPDATE operations are cheap single-row writes and continue to
commit immediately in `upsert_alert()`.  Only **brand-new row inserts** are
queued here and flushed as a bulk INSERT every BATCH_FLUSH_INTERVAL seconds.

This reduces individual INSERT round-trips from N → 1 per flush cycle,
significantly lowering DB write pressure under a flood of distinct alerts.

Usage (scheduled by APScheduler every 10 s via __init__.py):
    from app.services.alerts.alert_batch_writer import flush_alert_batch
    flush_alert_batch()   # must be called inside an app context

NOTE: This module is OPTIONAL and complementary to the aggregator.
The aggregator already handles the common case (repeated same-IP alerts).
The batch writer handles bursts of *different* source IPs all arriving at once.
"""

from __future__ import annotations

import logging
import os
from collections import deque
from datetime import datetime, timezone
from threading import Lock
from typing import Optional

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

def _int_env(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except Exception:
        return default


BATCH_MAX_SIZE:      int = _int_env('ALERT_BATCH_MAX_SIZE',      500)   # max queued rows
BATCH_FLUSH_INTERVAL: int = _int_env('ALERT_BATCH_FLUSH_INTERVAL', 10)   # seconds (used by scheduler)

# ── Queue ─────────────────────────────────────────────────────────────────────

_queue_lock: Lock = Lock()
_pending:    deque = deque(maxlen=BATCH_MAX_SIZE)   # maxlen drops oldest on overflow


def queue_alert_insert(mapping: dict) -> None:
    """Push a raw alert dict onto the pending insert queue.

    Called by upsert_alert() on the INSERT path when batch mode is desired.
    The mapping must contain all non-nullable Alert columns.

    Thread-safe.
    """
    with _queue_lock:
        _pending.append(mapping)


def pending_count() -> int:
    """Return the number of alerts waiting to be flushed."""
    with _queue_lock:
        return len(_pending)


def flush_alert_batch() -> int:
    """Drain the queue and persist all pending rows in a single bulk INSERT.

    Returns the number of rows written.
    Must be called inside a Flask application context.
    Safe to call with an empty queue (no-op).
    """
    with _queue_lock:
        if not _pending:
            return 0
        batch = list(_pending)
        _pending.clear()

    from app.models.db import db
    from app.models.alert_model import Alert

    try:
        db.session.bulk_insert_mappings(Alert, batch)
        db.session.commit()
        logger.info('[BatchWriter] Flushed %d alert rows to DB', len(batch))
        return len(batch)
    except Exception as exc:
        db.session.rollback()
        logger.error('[BatchWriter] Bulk insert failed (%d rows dropped): %s', len(batch), exc)
        return 0
