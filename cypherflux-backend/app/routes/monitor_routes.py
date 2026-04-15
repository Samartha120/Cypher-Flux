from flask import Blueprint, jsonify
from app.services.monitor.traffic_monitor import monitor

monitor_bp = Blueprint('monitor', __name__)

@monitor_bp.route('/monitor', methods=['GET'])
def get_traffic():
    return jsonify({
        "items": monitor.get_detailed_stats(),
        "timeline": monitor.get_timeline(),
        "summary": monitor.get_summary(),
    }), 200
