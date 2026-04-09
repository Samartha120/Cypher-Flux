from __future__ import annotations

from typing import Optional

from flask import Request

from app.models.db import db
from app.models.notification_model import Notification


def _get_client_ip(req: Optional[Request]) -> Optional[str]:
    if not req:
        return None
    forwarded = req.headers.get('X-Forwarded-For')
    if forwarded:
        # In case of multiple proxies, the first one is the original client.
        return forwarded.split(',')[0].strip()
    return req.remote_addr


def create_notification(
    *,
    event_type: str,
    title: str,
    message: str,
    severity: str = 'info',
    user_id: Optional[int] = None,
    req: Optional[Request] = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        event_type=event_type,
        title=title,
        message=message,
        severity=severity,
        source_ip=_get_client_ip(req),
        user_agent=req.headers.get('User-Agent') if req else None,
    )
    db.session.add(n)
    db.session.commit()
    return n
