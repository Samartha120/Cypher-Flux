from app.models.db import db
from datetime import datetime

class BlockedIP(db.Model):
    __tablename__ = 'blocked_ips'
    id = db.Column(db.Integer, primary_key=True)
    ip = db.Column(db.String(50), nullable=False, unique=True)
    reason = db.Column(db.String(255), nullable=False)
    attack_type = db.Column(db.String(120), nullable=True)
    details = db.Column(db.Text, nullable=True)
    detection_source = db.Column(db.String(80), nullable=False, default='Manual Block')
    severity = db.Column(db.String(20), nullable=False, default='medium', index=True)
    risk_score = db.Column(db.Float, nullable=False, default=0.0)
    action_type = db.Column(db.String(20), nullable=False, default='manual', index=True)
    source_alert_id = db.Column(db.Integer, nullable=True)
    request_count = db.Column(db.Integer, nullable=True)
    last_path = db.Column(db.String(255), nullable=True)
    last_method = db.Column(db.String(16), nullable=True)
    blocked_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
