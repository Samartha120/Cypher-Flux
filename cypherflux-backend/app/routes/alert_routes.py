from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.models.alert_model import Alert
from app.models.db import db
from datetime import datetime

alert_bp = Blueprint('alerts', __name__)


def _serialize(a: Alert):
    return {
        'id': a.id,
        'ip': a.ip,
        'type': a.type,
        'severity': a.severity or 'medium',
        'hostname': a.hostname,
        'details': a.details,
        'timestamp': a.timestamp.isoformat() if a.timestamp else None,
    }


@alert_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    severity = request.args.get('severity')  # optional filter: critical|high|medium|low
    q = Alert.query.order_by(Alert.timestamp.desc())
    if severity:
        q = q.filter(Alert.severity == severity.lower())
    alerts = q.limit(200).all()
    return jsonify([_serialize(a) for a in alerts]), 200


@alert_bp.route('/alerts', methods=['POST'])
@jwt_required()
def create_alert():
    """Persist a detected alert (called by frontend live-mode or detection engine)."""
    data = request.get_json() or {}
    ip = str(data.get('ip') or '').strip()
    alert_type = str(data.get('type') or data.get('alert_type') or '').strip()
    if not ip or not alert_type:
        return jsonify({'msg': 'ip and type are required'}), 400

    severity = str(data.get('severity') or 'medium').strip().lower()
    if severity not in ('critical', 'high', 'medium', 'low'):
        severity = 'medium'

    ts = None
    raw_ts = data.get('timestamp')
    if raw_ts:
        try:
            ts = datetime.fromisoformat(str(raw_ts).replace('Z', '+00:00'))
        except Exception:
            pass

    a = Alert(
        ip=ip,
        type=alert_type,
        severity=severity,
        hostname=str(data.get('hostname') or '').strip() or None,
        details=str(data.get('details') or '').strip() or None,
        timestamp=ts or datetime.utcnow(),
    )
    db.session.add(a)
    db.session.commit()
    return jsonify(_serialize(a)), 201
