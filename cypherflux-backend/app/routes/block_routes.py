from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.models.db import db
from app.models.block_model import BlockedIP
from app.services.response.block_service import create_or_update_block, serialize_block

block_bp = Blueprint('block', __name__)

@block_bp.route('/blocked', methods=['GET'])
@jwt_required()
def get_blocked():
    ips = BlockedIP.query.order_by(BlockedIP.blocked_at.desc(), BlockedIP.timestamp.desc()).all()
    return jsonify([serialize_block(b) for b in ips]), 200

@block_bp.route('/blocked', methods=['POST'])
@jwt_required()
def add_block():
    data = request.get_json() or {}
    ip = data.get('ip')
    reason = data.get('reason', 'Manual block')

    if not ip:
        return jsonify({"msg": "IP is required"}), 400

    block = create_or_update_block(
        ip=ip,
        reason=reason,
        attack_type=data.get('attackType') or data.get('attack_type'),
        details=data.get('details'),
        detection_source=data.get('detectionSource') or data.get('detection_source') or 'Blocked IPs',
        severity=data.get('severity'),
        risk_score=data.get('riskScore') or data.get('risk_score'),
        action_type=data.get('actionType') or data.get('action_type') or 'manual',
        source_alert_id=data.get('sourceAlertId') or data.get('source_alert_id'),
        request_count=data.get('requestCount') or data.get('request_count'),
        last_path=data.get('lastPath') or data.get('last_path'),
        last_method=data.get('lastMethod') or data.get('last_method'),
    )
    return jsonify({"msg": "IP Blocked", "item": serialize_block(block)}), 201

@block_bp.route('/blocked', methods=['DELETE'])
@jwt_required()
def purge_blocked():
    db.session.query(BlockedIP).delete()
    db.session.commit()
    return jsonify({"msg": "All IP blocks forcefully lifted."}), 200
