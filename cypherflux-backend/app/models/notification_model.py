from datetime import datetime

from app.models.db import db


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True, index=True)

    event_type = db.Column(db.String(50), nullable=False)  # e.g. auth.login, auth.password_change
    title = db.Column(db.String(120), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    severity = db.Column(db.String(20), nullable=False, default='info')  # info|success|warning|critical

    source_ip = db.Column(db.String(64), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)

    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
