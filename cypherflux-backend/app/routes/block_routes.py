from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.models.db import db
from app.models.block_model import BlockedIP

block_bp = Blueprint('block', __name__)

@block_bp.route('/blocked', methods=['GET'])
@jwt_required()
def get_blocked():
    ips = BlockedIP.query.all()
    return jsonify([{"id": b.id, "ip": b.ip, "reason": b.reason, "timestamp": b.timestamp} for b in ips]), 200

@block_bp.route('/blocked', methods=['POST'])
@jwt_required()
def add_block():
    data = request.get_json()
    ip = data.get('ip')
    reason = data.get('reason', 'Manual block')
    
    if not BlockedIP.query.filter_by(ip=ip).first():
        new_block = BlockedIP(ip=ip, reason=reason)
        db.session.add(new_block)
        db.session.commit()
    return jsonify({"msg": "IP Blocked"}), 201
