from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.services.scanner.nmap_Scanner import ScannerEngine

scan_bp = Blueprint('scan', __name__)
scanner = ScannerEngine()

@scan_bp.route('/scan', methods=['POST'])
@jwt_required()
def start_scan():
    data = request.get_json() or {}
    target = data.get('target', '127.0.0.1')
    results = scanner.scan_network(target)
    return jsonify({"target": target, "devices": results}), 200
