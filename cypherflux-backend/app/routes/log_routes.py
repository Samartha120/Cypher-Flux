from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.models.db import db
from app.models.log_model import Log
from app.services.encryption.classical_cypher import caesar_cipher

log_bp = Blueprint('logs', __name__)

@log_bp.route('/logs', methods=['GET'])
@jwt_required()
def get_logs():
    logs = Log.query.order_by(Log.timestamp.desc()).limit(50).all()
    result = []
    for lg in logs:
        # Decrypt payload for admin panel consumption
        decrypted = caesar_cipher(lg.encrypted_data, decrypt=True) if lg.encrypted_data else lg.message
        result.append({"id": lg.id, "message": lg.message, "decrypted_data": decrypted, "timestamp": lg.timestamp})
    return jsonify(result), 200

@log_bp.route('/logs', methods=['POST'])
@jwt_required()
def add_log():
    data = request.get_json()
    msg = data.get('message')
    enc = caesar_cipher(msg)
    new_log = Log(message=msg, encrypted_data=enc)
    db.session.add(new_log)
    db.session.commit()
    return jsonify({"msg": "Log added securely"}), 201
