from flask import Blueprint, jsonify, request
from app.services.monitor.traffic_monitor import monitor
from app.services.detection.detection_engine import DetectionEngine

detect_bp = Blueprint('detect', __name__)

@detect_bp.route('/detect', methods=['POST'])
# No JWT here commonly to allow system to trace generic traffic pings
def simulate_traffic():
    """Simulates a ping from an IP to trigger detection logic."""
    data = request.get_json()
    ip = data.get('ip', request.remote_addr)
    
    count = monitor.log_request(ip)
    is_attack = DetectionEngine.analyze_traffic(ip, count)
    
    return jsonify({"ip": ip, "count": count, "alert_triggered": is_attack}), 200
