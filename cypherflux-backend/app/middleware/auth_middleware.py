from flask import request, jsonify
from app.models.block_model import BlockedIP
from app.models.db import db
from app.services.monitor.traffic_monitor import monitor
from app.services.detection.detection_engine import DetectionEngine

def setup_middleware(app):
    @app.before_request
    def security_firewall():
        # Allow CORS preflight requests and static assets through safely
        if request.method == 'OPTIONS' or request.endpoint == 'static':
            return
        
        ip = request.remote_addr
        if not ip:
            return

        # 1. HARD BLOCK CHECK: Intercept already banned IPs immediately
        is_blocked = BlockedIP.query.filter_by(ip=ip).first()
        if is_blocked:
            return jsonify({
                "error": "Forbidden. IP Address is permanently banned.", 
                "reason": is_blocked.reason
            }), 403

        # 2. TRAFFIC LOGGING: Increment request counter for velocity profiling
        hit_count = monitor.log_request(ip)

        # 3. ACTIVE THREAT DETECTION: Send telemetry to engine
        is_attack = DetectionEngine.analyze_traffic(ip, hit_count)
        
        if is_attack:
            # 4. COUNTERMEASURE: Trigger permanent ban
            new_block = BlockedIP(ip=ip, reason="Automated DoS Firewall Protection")
            db.session.add(new_block)
            db.session.commit()

            return jsonify({
                "error": "Connection Terminated. Automated DoS protection triggered."
            }), 403
