from flask import request, jsonify
from app.models.alert_model import Alert
from app.models.log_model import Log
from app.models.db import db
from app.services.monitor.traffic_monitor import monitor
from app.services.detection.detection_engine import DetectionEngine
from app.services.encryption.classical_cypher import caesar_cipher
from app.services.response.block_service import create_or_update_block, is_ip_blocked
import ipaddress
import time
from typing import Optional

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


def _extract_client_ip(req) -> Optional[str]:
    remote_ip = req.remote_addr
    if remote_ip and _is_trusted_ip(remote_ip):
        forwarded = req.headers.get('X-Forwarded-For') or req.headers.get('X-Real-IP')
        if forwarded:
            candidate = str(forwarded).split(',')[0].strip()
            try:
                ipaddress.ip_address(candidate)
                return candidate
            except ValueError:
                pass
    return remote_ip


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

        ip = _extract_client_ip(request)
        if not ip:
            return

        hit_count = monitor.log_request(ip, path=request.path, method=request.method)

        # ── Trusted / private IPs are never subject to automated blocking. ──
        # This prevents the frontend dev server (localhost) from auto-blocking
        # itself after many rapid polling requests.
        if _is_trusted_ip(ip):
            # Still log traffic for dashboard visibility, but skip auto-block checks.
            return

        # Rate-limited request logging for live dashboards
        now = time.time()
        key = (ip, request.path)
        prev = _last_log_ts.get(key, 0)
        if now - prev >= 2.5:
            _last_log_ts[key] = now
            _write_log(f"Request observed | ip={ip} | method={request.method} | path={request.path}")

        # 1. HARD BLOCK CHECK: Intercept already banned IPs immediately
        blocked = is_ip_blocked(ip)
        if blocked:
            _write_log(f"Blocked request denied | ip={ip} | reason={blocked.reason} | path={request.path}")
            return jsonify({
                "error": "Forbidden. IP Address is permanently banned.",
                "reason": blocked.reason,
                "attackType": blocked.attack_type,
                "severity": blocked.severity,
                "source": blocked.detection_source,
            }), 403

        # 2. ACTIVE THREAT DETECTION: Send telemetry to engine
        is_attack = DetectionEngine.analyze_traffic(ip, hit_count)

        if is_attack:
            details = f"Traffic volume exceeded the automated DoS threshold with {hit_count} requests in the current 60 second window on {request.path}."
            latest_alert = (
                Alert.query
                .filter(Alert.ip == ip, Alert.type == "Potential DoS Attack")
                .order_by(Alert.last_seen.desc())
                .first()
            )
            block = create_or_update_block(
                ip=ip,
                reason="Automated DoS firewall protection triggered",
                attack_type=(latest_alert.type if latest_alert else "Potential DoS Attack"),
                details=details,
                detection_source="Traffic Monitor",
                severity=(latest_alert.severity if latest_alert else "critical"),
                risk_score=min(100.0, 88.0 + max(0, hit_count - 200) * 0.1),
                action_type="auto",
                source_alert_id=(latest_alert.id if latest_alert else None),
                request_count=hit_count,
                last_path=request.path,
                last_method=request.method,
            )

            _write_log(f"Automated DoS protection triggered | ip={ip} | hits={hit_count} | path={request.path}")

            return jsonify({
                "error": "Connection Terminated. Automated DoS protection triggered.",
                "block": {
                    "id": block.id,
                    "ip": block.ip,
                    "severity": block.severity,
                    "source": block.detection_source,
                },
            }), 403
