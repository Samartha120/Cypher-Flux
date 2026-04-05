from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.models.alert_model import Alert

alert_bp = Blueprint('alerts', __name__)

@alert_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    alerts = Alert.query.order_by(Alert.timestamp.desc()).limit(50).all()
    result = [{"id": a.id, "ip": a.ip, "type": a.type, "timestamp": a.timestamp} for a in alerts]
    return jsonify(result), 200
