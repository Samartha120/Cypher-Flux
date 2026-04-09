from flask import request, jsonify
from app.models.alert_model import Alert
from app.models.block_model import BlockedIP
from app.models.log_model import Log
from app.models.db import db
from app.services.monitor.traffic_monitor import monitor
from app.services.detection.detection_engine import DetectionEngine
from app.services.encryption.classical_cypher import caesar_cipher
import ipaddress
import time

# Simple in-process rate limit for log writes to avoid DB spam.
_last_log_ts = {}

# IPs that must never be blocked by the automated firewall.
# Includes loopback (127.x.x.x, ::1) and RFC-1918 private ranges so the
# developer's own browser / frontend dev server cannot lock itself out.
_PRIVATE_NETWORKS = [
    ipaddress.ip_network('127.0.0.0/8'),    # loopback
    ipaddress.ip_network('::1/128'),         # IPv6 loopback
    ipaddress.ip_network('10.0.0.0/8'),      # RFC 1918
    ipaddress.ip_network('172.16.0.0/12'),   # RFC 1918
    ipaddress.ip_network('192.168.0.0/16'),  # RFC 1918
    ipaddress.ip_network('fc00::/7'),        # IPv6 ULA
]


def _is_trusted_ip(ip_str: str) -> bool:
    """Return True if the IP should be exempted from automated blocking."""
    if not ip_str:
        return False
    try:
        addr = ipaddress.ip_address(ip_str)
        return any(addr in net for net in _PRIVATE_NETWORKS)
    except ValueError:
        return False


def _write_log(message: str):
    try:
        enc = caesar_cipher(message) if message else None
        entry = Log(message=message[:255], encrypted_data=enc)
        db.session.add(entry)
        db.session.commit()
    except Exception:
        db.session.rollback()


def setup_middleware(app):
    @app.before_request
    def security_firewall():
        # Allow CORS preflight requests and static assets through safely
        if request.method == 'OPTIONS' or request.endpoint == 'static':
            return

        ip = request.remote_addr
        if not ip:
            return

        # ── Trusted / private IPs are never subject to automated blocking. ──
        # This prevents the frontend dev server (localhost) from auto-blocking
        # itself after many rapid polling requests.
        if _is_trusted_ip(ip):
            # Still log traffic for dashboard visibility, but skip all block checks.
            monitor.log_request(ip)
            return

        # Rate-limited request logging for live dashboards
        now = time.time()
        key = (ip, request.path)
        prev = _last_log_ts.get(key, 0)
        if now - prev >= 2.5:
            _last_log_ts[key] = now
            _write_log(f"Request observed | ip={ip} | method={request.method} | path={request.path}")

        # 1. HARD BLOCK CHECK: Intercept already banned IPs immediately
        is_blocked = BlockedIP.query.filter_by(ip=ip).first()
        if is_blocked:
            _write_log(f"Blocked request denied | ip={ip} | reason={is_blocked.reason} | path={request.path}")
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

            # Persist a critical alert for the auto-block event.
            try:
                block_alert = Alert(
                    ip=ip,
                    type="IP Auto-Blocked",
                    severity="critical",
                    details=f"Automated DoS protection triggered (hits={hit_count}, path={request.path}).",
                )
                db.session.add(block_alert)
                db.session.commit()
            except Exception:
                db.session.rollback()

            _write_log(f"Automated DoS protection triggered | ip={ip} | hits={hit_count} | path={request.path}")

            return jsonify({
                "error": "Connection Terminated. Automated DoS protection triggered."
            }), 403
