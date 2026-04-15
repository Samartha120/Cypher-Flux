from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.models.alert_model import Alert
from app.models.block_model import BlockedIP
from app.models.db import db


SEVERITY_RANK = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1,
}


def _norm_severity(value: Optional[str]) -> str:
    sev = str(value or 'medium').strip().lower()
    if sev in SEVERITY_RANK:
        return sev
    return 'medium'


def _clamp_risk(value: Optional[float], severity: str, request_count: Optional[int]) -> float:
    try:
        if value is not None:
            return max(0.0, min(100.0, float(value)))
    except Exception:
        pass

    base = {
        'critical': 92.0,
        'high': 72.0,
        'medium': 48.0,
        'low': 24.0,
    }.get(severity, 48.0)
    burst = min(20.0, float(max(0, int(request_count or 0))) * 0.15)
    return round(min(100.0, base + burst), 2)


def serialize_block(block: BlockedIP) -> dict:
    return {
        'id': block.id,
        'ip': block.ip,
        'reason': block.reason,
        'attackType': block.attack_type,
        'details': block.details,
        'detectionSource': block.detection_source,
        'severity': block.severity or 'medium',
        'riskScore': float(block.risk_score or 0),
        'actionType': block.action_type or 'manual',
        'sourceAlertId': block.source_alert_id,
        'requestCount': block.request_count,
        'lastPath': block.last_path,
        'lastMethod': block.last_method,
        'blockedAt': block.blocked_at.isoformat() if block.blocked_at else None,
        'timestamp': block.timestamp.isoformat() if block.timestamp else None,
    }


def is_ip_blocked(ip: str) -> Optional[BlockedIP]:
    value = str(ip or '').strip()
    if not value:
        return None

    block_all = BlockedIP.query.filter_by(ip='0.0.0.0/0').first()
    if block_all:
        return block_all
    return BlockedIP.query.filter_by(ip=value).first()


def create_or_update_block(
    *,
    ip: str,
    reason: Optional[str] = None,
    attack_type: Optional[str] = None,
    details: Optional[str] = None,
    detection_source: Optional[str] = None,
    severity: Optional[str] = None,
    risk_score: Optional[float] = None,
    action_type: Optional[str] = None,
    source_alert_id: Optional[int] = None,
    request_count: Optional[int] = None,
    last_path: Optional[str] = None,
    last_method: Optional[str] = None,
    blocked_at: Optional[datetime] = None,
) -> BlockedIP:
    normalized_ip = str(ip or '').strip()
    if normalized_ip == '0.0.0.0':
        normalized_ip = '0.0.0.0/0'

    severity_norm = _norm_severity(severity)
    action_norm = str(action_type or 'manual').strip().lower() or 'manual'

    inferred_alert = None
    if source_alert_id:
        inferred_alert = Alert.query.get(int(source_alert_id))

    block = BlockedIP.query.filter_by(ip=normalized_ip).first()
    now = blocked_at or datetime.utcnow()
    attack = attack_type or (inferred_alert.type if inferred_alert else None)
    reason_text = reason or attack or 'Manual block'
    detail_text = details or (inferred_alert.details if inferred_alert else None)
    source_text = detection_source or ('Alerts' if inferred_alert else 'Manual Block')
    effective_request_count = request_count
    if effective_request_count is None and inferred_alert is not None:
        effective_request_count = getattr(inferred_alert, 'count', None)
    risk = _clamp_risk(risk_score, severity_norm, effective_request_count)

    if not block:
        block = BlockedIP(
            ip=normalized_ip,
            reason=reason_text[:255],
            attack_type=(attack or '')[:120] or None,
            details=(detail_text or '').strip() or None,
            detection_source=(source_text or 'Manual Block')[:80],
            severity=severity_norm,
            risk_score=risk,
            action_type=(action_norm or 'manual')[:20],
            source_alert_id=source_alert_id,
            request_count=effective_request_count,
            last_path=(last_path or '')[:255] or None,
            last_method=(last_method or '')[:16] or None,
            blocked_at=now,
            timestamp=now,
        )
        db.session.add(block)
        db.session.commit()
        return block

    if reason_text:
        block.reason = reason_text[:255]
    if attack:
        block.attack_type = attack[:120]
    if detail_text:
        block.details = detail_text
    if source_text:
        block.detection_source = source_text[:80]
    if severity_norm and SEVERITY_RANK.get(severity_norm, 0) >= SEVERITY_RANK.get(block.severity or 'low', 0):
        block.severity = severity_norm
    block.risk_score = max(float(block.risk_score or 0), risk)
    if action_norm:
        block.action_type = action_norm[:20]
    if source_alert_id:
        block.source_alert_id = source_alert_id
    if effective_request_count is not None:
        block.request_count = effective_request_count
    if last_path:
        block.last_path = last_path[:255]
    if last_method:
        block.last_method = last_method[:16]
    block.blocked_at = now
    block.timestamp = now
    db.session.commit()
    return block
