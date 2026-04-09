from __future__ import annotations

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.models.alert_model import Alert
from app.models.block_model import BlockedIP
from app.services.monitor.traffic_monitor import monitor
from app.services.scanner.scan_state import get_last_scan

dashboard_bp = Blueprint('dashboard', __name__)


def _count_open_ports(devices):
    total = 0
    for d in devices or []:
        ports = d.get('open_ports') or d.get('openPorts') or d.get('ports') or []
        if isinstance(ports, list):
            total += len(ports)
    return total


@dashboard_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    alerts_count = Alert.query.count()
    blocked_ips = BlockedIP.query.count()

    traffic = monitor.get_stats() or {}
    active_devices = len(traffic.keys())

    last_scan = get_last_scan()
    scan_devices = last_scan.get('devices') or []
    if scan_devices:
        active_devices = sum(1 for d in scan_devices if (d.get('state') or '').lower() == 'up')

    open_ports = _count_open_ports(scan_devices)

    ts = last_scan.get('timestamp')
    return jsonify(
        {
            "activeDevices": active_devices,
            "openPorts": open_ports,
            "alertsCount": alerts_count,
            "blockedIps": blocked_ips,
            "lastScanTarget": last_scan.get('target'),
            "lastScanAt": ts.isoformat() if ts else None,
        }
    ), 200


@dashboard_bp.route('/dashboard/details', methods=['GET'])
@jwt_required()
def get_dashboard_details():
    """Returns lightweight, UI-friendly details for dashboard popovers.

    - devices/openPorts come from the last scan results (if any)
    - alerts are capped to the latest 50
    - blocked IPs return all rows
    """
    last_scan = get_last_scan()
    devices = last_scan.get('devices') or []

    # Normalize scan device shape for UI.
    normalized_devices = []
    for d in devices:
        ip = d.get('ip')
        if not ip:
            continue
        ports = d.get('open_ports') or d.get('openPorts') or d.get('ports') or []
        if isinstance(ports, list):
            norm_ports = []
            for p in ports:
                if isinstance(p, dict):
                    port_num = p.get('port')
                    service = p.get('service')
                else:
                    port_num = p
                    service = None
                try:
                    norm_ports.append({
                        'port': int(port_num),
                        'service': (service or 'unknown'),
                    })
                except Exception:
                    continue
            norm_ports.sort(key=lambda x: x['port'])
        else:
            norm_ports = []

        normalized_devices.append({
            'ip': ip,
            'hostname': d.get('hostname') or '',
            'state': d.get('state') or '',
            'openPorts': norm_ports,
        })

    # Open ports grouped by device for UI.
    open_ports_by_device = [
        {
            'ip': d['ip'],
            'ports': d['openPorts'],
        }
        for d in normalized_devices
    ]

    alerts = Alert.query.order_by(Alert.timestamp.desc()).limit(50).all()
    alerts_result = [
        {
            'id': a.id,
            'ip': a.ip,
            'type': a.type,
            'severity': a.severity or 'medium',
            'hostname': a.hostname,
            'details': a.details,
            'timestamp': a.timestamp.isoformat() if a.timestamp else None,
        }
        for a in alerts
    ]

    blocked = BlockedIP.query.order_by(BlockedIP.timestamp.desc()).all()
    blocked_result = [
        {
            'id': b.id,
            'ip': b.ip,
            'reason': b.reason,
            'timestamp': b.timestamp.isoformat() if b.timestamp else None,
        }
        for b in blocked
    ]

    traffic = monitor.get_stats() or {}

    ts = last_scan.get('timestamp')
    return jsonify(
        {
            'devices': normalized_devices,
            'openPortsByDevice': open_ports_by_device,
            'alerts': alerts_result,
            'blockedIps': blocked_result,
            'activeTrafficIps': [{"ip": k, "requests": v} for k, v in traffic.items()],
            'lastScanTarget': last_scan.get('target'),
            'lastScanAt': ts.isoformat() if ts else None,
        }
    ), 200
