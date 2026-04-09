from flask import Blueprint, Response, jsonify, request, stream_with_context
from flask_jwt_extended import decode_token, get_jwt_identity, jwt_required

from app.models.db import db
from app.models.notification_model import Notification
from app.models.token_blocklist_model import TokenBlocklist

import json
import time

notification_bp = Blueprint('notifications', __name__)


def _clamp(s: str, n: int) -> str:
    s = '' if s is None else str(s)
    return s[:n]


def _serialize(n: Notification):
    return {
        'id': n.id,
        'user_id': n.user_id,
        'event_type': n.event_type,
        'title': n.title,
        'message': n.message,
        'severity': n.severity,
        'source_ip': n.source_ip,
        'user_agent': n.user_agent,
        'is_read': bool(n.is_read),
        'created_at': n.created_at.isoformat() if n.created_at else None,
    }


@notification_bp.route('/notifications', methods=['GET'])
@jwt_required()
def list_notifications():
    user_id = get_jwt_identity()
    try:
        uid = int(user_id)
    except Exception:
        uid = None

    q = Notification.query
    if uid is not None:
        q = q.filter((Notification.user_id == uid) | (Notification.user_id.is_(None)))

    items = q.order_by(Notification.created_at.desc()).limit(200).all()
    return jsonify([_serialize(n) for n in items]), 200


@notification_bp.route('/notifications', methods=['POST'])
@jwt_required()
def create_notification_row():
    user_id = get_jwt_identity()
    try:
        uid = int(user_id)
    except Exception:
        return jsonify({'msg': 'Invalid user context'}), 401

    data = request.get_json() or {}
    event_type = _clamp(data.get('event_type') or data.get('eventType') or 'system.event', 50)
    title = _clamp(data.get('title') or 'Notification', 120)
    message = _clamp(data.get('message') or '', 255)
    severity = _clamp(data.get('severity') or 'info', 20)

    if not message:
        return jsonify({'msg': 'message is required'}), 400

    n = Notification(
        user_id=uid,
        event_type=event_type,
        title=title,
        message=message,
        severity=severity,
        source_ip=data.get('source_ip') or data.get('sourceIp'),
        user_agent=data.get('user_agent') or data.get('userAgent'),
        is_read=bool(data.get('is_read')) if 'is_read' in data else False,
    )

    db.session.add(n)
    db.session.commit()
    return jsonify(_serialize(n)), 201


@notification_bp.route('/notifications/stream', methods=['GET'])
def stream_notifications():
    """Server-Sent Events (SSE) stream for notifications.

    Uses a token query param because EventSource cannot set Authorization headers.
    Example: /api/notifications/stream?token=<jwt>
    """

    token = request.args.get('token')
    if not token:
        return jsonify({'msg': 'Missing token'}), 401

    try:
        decoded = decode_token(token)
    except Exception:
        return jsonify({'msg': 'Invalid token'}), 401

    # Enforce token not revoked (blocklist)
    jti = decoded.get('jti')
    if not jti or TokenBlocklist.query.filter_by(jti=jti).first() is not None:
        return jsonify({'msg': 'Token revoked'}), 401

    sub = decoded.get('sub')
    try:
        uid = int(sub) if sub is not None else None
    except Exception:
        uid = None

    if uid is None:
        return jsonify({'msg': 'Invalid user context'}), 401

    # Optional starting point.
    try:
        last_id = int(request.args.get('last_id') or 0)
    except Exception:
        last_id = 0

    # If client reconnects, EventSource can provide the last event id.
    try:
        last_event_id = int(request.headers.get('Last-Event-ID') or 0)
    except Exception:
        last_event_id = 0
    if last_event_id > last_id:
        last_id = last_event_id

    def _user_query():
        q = Notification.query
        q = q.filter((Notification.user_id == uid) | (Notification.user_id.is_(None)))
        return q

    @stream_with_context
    def gen():
        nonlocal last_id
        # Initial hello to establish the stream.
        yield 'event: ready\ndata: {}\n\n'

        keepalive_at = 0.0
        last_sync_at = 0.0
        last_stats_at = 0.0
        prev_total = None
        prev_unread = None
        while True:
            # Fetch and emit any new rows.
            new_rows = (
                _user_query()
                .filter(Notification.id > last_id)
                .order_by(Notification.id.asc())
                .limit(200)
                .all()
            )

            for n in new_rows:
                last_id = n.id
                payload = json.dumps(_serialize(n), ensure_ascii=False)
                yield f'id: {n.id}\nevent: notification\ndata: {payload}\n\n'

            # Emit sync events so changes to existing rows (read/unread) and deletions/clears propagate.
            now = time.time()
            if now - last_stats_at > 6:
                last_stats_at = now
                q = _user_query()
                total = q.count()
                unread = q.filter(Notification.is_read == False).count()  # noqa: E712
                if prev_total is None or prev_unread is None or total != prev_total or unread != prev_unread:
                    prev_total = total
                    prev_unread = unread
                    last_sync_at = now
                    yield f'event: sync\ndata: {json.dumps({"total": total, "unread": unread})}\n\n'

            # Periodic sync as a safety net.
            if now - last_sync_at > 20:
                last_sync_at = now
                yield 'event: sync\ndata: {}\n\n'

            # Keep-alive comment to prevent idle timeouts.
            if now - keepalive_at > 15:
                keepalive_at = now
                yield ': keep-alive\n\n'

            time.sleep(2)

    resp = Response(gen(), mimetype='text/event-stream')
    resp.headers['Cache-Control'] = 'no-cache'
    resp.headers['X-Accel-Buffering'] = 'no'
    return resp


@notification_bp.route('/notifications/<int:notification_id>', methods=['PATCH'])
@jwt_required()
def update_notification(notification_id: int):
    user_id = get_jwt_identity()
    try:
        uid = int(user_id)
    except Exception:
        return jsonify({'msg': 'Invalid user context'}), 401

    n = Notification.query.get(notification_id)
    if not n:
        return jsonify({'msg': 'Not found'}), 404

    # Allow editing only own notifications (or global user_id=None)
    if n.user_id is not None and n.user_id != uid:
        return jsonify({'msg': 'Forbidden'}), 403

    data = request.get_json() or {}
    if 'is_read' in data:
        n.is_read = bool(data.get('is_read'))

    db.session.commit()
    return jsonify(_serialize(n)), 200


@notification_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id: int):
    user_id = get_jwt_identity()
    try:
        uid = int(user_id)
    except Exception:
        return jsonify({'msg': 'Invalid user context'}), 401

    n = Notification.query.get(notification_id)
    if not n:
        return jsonify({'msg': 'Not found'}), 404

    if n.user_id is not None and n.user_id != uid:
        return jsonify({'msg': 'Forbidden'}), 403

    db.session.delete(n)
    db.session.commit()
    return jsonify({'msg': 'Deleted'}), 200


@notification_bp.route('/notifications', methods=['DELETE'])
@jwt_required()
def clear_notifications():
    user_id = get_jwt_identity()
    try:
        uid = int(user_id)
    except Exception:
        return jsonify({'msg': 'Invalid user context'}), 401

    # Clear only the caller's notifications (keep global system notifications)
    Notification.query.filter(Notification.user_id == uid).delete()
    db.session.commit()
    return jsonify({'msg': 'Cleared'}), 200
