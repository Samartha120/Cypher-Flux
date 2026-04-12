import os
from datetime import datetime, timedelta

from app.models.alert_model import Alert
from app.services.alerts.alert_aggregator import upsert_alert

def _int_env(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except Exception:
        return default


# How many requests/minute before triggering a DoS alert
DOS_THRESHOLD = _int_env('DOS_THRESHOLD', 100)  # raised from 50 — avoids false positives on normal polling

# When traffic is elevated but not yet a DoS threshold breach, emit a low severity alert.
PRE_ALERT_RATIO = float(os.environ.get('DOS_PRE_ALERT_RATIO', '0.75') or 0.75)

# How many recent alerts must exist before an IP gets auto-blocked
BLOCK_AFTER_ALERTS = _int_env('BLOCK_AFTER_ALERTS', 3)

# How recent an alert must be to count toward the block threshold (minutes)
ALERT_WINDOW_MINUTES = 5


def _dos_severity(hit_count: int) -> str:
    threshold = max(DOS_THRESHOLD, 1)
    ratio = hit_count / threshold
    # Scale severity based on how far above the threshold we are.
    if ratio >= 3.0:
        return 'critical'
    if ratio >= 2.0:
        return 'high'
    return 'medium'


class DetectionEngine:
    @staticmethod
    def analyze_traffic(ip, count):
        # 1) Low severity early warning for elevated traffic (pre-threshold)
        pre_alert_threshold = int(max(DOS_THRESHOLD, 1) * PRE_ALERT_RATIO)
        if pre_alert_threshold <= count <= DOS_THRESHOLD:
            upsert_alert(
                ip=ip,
                alert_type="Elevated Traffic",
                severity="low",
                details=f"Traffic elevated: {count} hits within 60s window (pre-alert threshold {pre_alert_threshold}/{DOS_THRESHOLD}).",
            )
            return False

        # Below pre-alert threshold: no alert.
        if count < pre_alert_threshold:
            return False

        # Check how many recent DoS alerts exist for this IP
        since = datetime.utcnow() - timedelta(minutes=ALERT_WINDOW_MINUTES)
        recent_count = Alert.query.filter(
            Alert.ip == ip,
            Alert.type == "Potential DoS Attack",
            Alert.last_seen >= since,
        ).count()

        severity = _dos_severity(count)
        
        # Upsert the DoS alert (aggregator will handle rate limiting and deduplication)
        upsert_alert(
            ip=ip,
            alert_type="Potential DoS Attack",
            severity=severity,
            details=f"Hit count {count} exceeded threshold {DOS_THRESHOLD} within 60s window (severity={severity}).",
        )
        
        recent_count += 1

        # Only return True (trigger auto-block) after repeated offences
        return recent_count >= BLOCK_AFTER_ALERTS
