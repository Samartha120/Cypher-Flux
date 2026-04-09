from flask import Blueprint, jsonify
from app.services.monitor.traffic_monitor import monitor

monitor_bp = Blueprint('monitor', __name__)

@monitor_bp.route('/monitor', methods=['GET'])
def get_traffic():
    stats = monitor.get_stats()
    # Format into chart friendly list [{ip: count}]
    result = [{"ip": k, "requests": v} for k, v in stats.items()]
    return jsonify(result), 200
