"""
alert_routes.py
~~~~~~~~~~~~~~~
REST API for the alerts table.

Key features added in this revision:
  • POST /alerts  → delegates to upsert_alert() for centralized aggregation
  • GET  /alerts  → pagination + optional severity and min_score filters
  • GET  /alerts/stats → per-severity sum of counts for dashboard badge
"""

from __future__ import annotations

import logging
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.models.alert_model import Alert
from app.models.db import db

logger = logging.getLogger(__name__)
alert_bp = Blueprint('alerts', __name__)
VALID_ALERT_STATUSES = {'active', 'investigating', 'monitored', 'blocked', 'resolved'}

# ─── Serialiser ──────────────────────────────────────────────────────────────

def _serialize(a: Alert) -> dict:
    return {
        'id':          a.id,
        'ip':          a.ip,
        'type':        a.type,
        'severity':    a.severity or 'medium',
        'hostname':    a.hostname,
        'details':     a.details,
        'count':       a.count or 1,
        'alert_score': getattr(a, 'alert_score', 1.0),
        'timestamp':   a.timestamp.isoformat() if a.timestamp else None,
        'first_seen':  a.first_seen.isoformat() if getattr(a, 'first_seen', None) else None,
        'last_seen':   a.last_seen.isoformat() if getattr(a, 'last_seen', None) else None,
        'status':      getattr(a, 'status', 'active'),
    }


# ─── Routes ──────────────────────────────────────────────────────────────────

@alert_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    """List alerts with optional severity/score filter and pagination."""
    severity = request.args.get('severity', '').strip().lower() or None
    try:
        page     = max(1, int(request.args.get('page', 1)))
        per_page = min(200, max(1, int(request.args.get('per_page', 50))))
    except (ValueError, TypeError):
        page, per_page = 1, 50

    q = Alert.query.order_by(Alert.last_seen.desc())
    
    if severity and severity in ('critical', 'high', 'medium', 'low'):
        q = q.filter(Alert.severity == severity)
        
    try:
        min_score = float(request.args.get('min_score', 0))
        if min_score > 0:
            q = q.filter(Alert.alert_score >= min_score)
    except (ValueError, TypeError):
        pass

    offset = (page - 1) * per_page
    alerts = q.offset(offset).limit(per_page).all()
    total  = q.count()

    return jsonify({
        'items':    [_serialize(a) for a in alerts],
        'total':    total,
        'page':     page,
        'per_page': per_page,
        'pages':    (total + per_page - 1) // per_page if per_page else 1,
    }), 200


@alert_bp.route('/alerts/stats', methods=['GET'])
@jwt_required()
def get_alert_stats():
    """Return per-severity counts — useful for dashboard badges."""
    from sqlalchemy import func
    rows = (
        db.session.query(Alert.severity, func.sum(Alert.count).label('total'))
        .group_by(Alert.severity)
        .all()
    )
    stats = {r.severity: int(r.total or 0) for r in rows}
    return jsonify({
        'critical': stats.get('critical', 0),
        'high':     stats.get('high',     0),
        'medium':   stats.get('medium',   0),
        'low':      stats.get('low',      0),
        'total':    sum(stats.values()),
    }), 200


@alert_bp.route('/alerts', methods=['POST'])
@jwt_required()
def create_alert():
    """Persist a detected alert using the centralized aggregator.
    
    Handles deduplication, rate limiting, and LOW severity sampling automatically.
    """
    from app.services.alerts.alert_aggregator import upsert_alert
    
    data = request.get_json() or {}
    ip         = str(data.get('ip') or '').strip()
    alert_type = str(data.get('type') or data.get('alert_type') or '').strip()

    if not ip or not alert_type:
        return jsonify({'msg': 'ip and type are required'}), 400

    severity = str(data.get('severity') or 'medium').strip().lower()
    
    # Optional explicitly provided timestamp from the client
    ts = None
    if raw_ts := data.get('timestamp'):
        try:
            ts = datetime.fromisoformat(str(raw_ts).replace('Z', '+00:00'))
        except Exception:
            pass

    alert = upsert_alert(
        ip=ip,
        alert_type=alert_type,
        severity=severity,
        details=str(data.get('details') or '').strip() or None,
        hostname=str(data.get('hostname') or '').strip() or None,
        timestamp=ts,
    )
    
    if not alert:
        # Aggregator dropped it (rate limited or sampled away)
        return jsonify({'msg': 'Alert dropped (rate limited or sampled)'}), 429
        
    return jsonify(_serialize(alert)), 200


@alert_bp.route('/alerts/cleanup', methods=['POST'])
@jwt_required()
def manual_cleanup():
    """Manually trigger the retention cleanup (admin/ops endpoint)."""
    from app.services.alerts.alert_cleanup import cleanup_old_alerts
    totals = cleanup_old_alerts()
    return jsonify({'deleted': totals, 'msg': 'Cleanup complete'}), 200


@alert_bp.route('/alerts/<int:alert_id>/status', methods=['PUT'])
@jwt_required()
def update_alert_status(alert_id: int):
    """Persist SOC action state for an alert (monitor/block/resolve)."""
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({'msg': 'Alert not found'}), 404

    data = request.get_json() or {}
    status = str(data.get('status') or '').strip().lower()
    if status not in VALID_ALERT_STATUSES:
        return jsonify({'msg': 'Invalid status'}), 400

    alert.status = status
    db.session.commit()
    return jsonify(_serialize(alert)), 200
