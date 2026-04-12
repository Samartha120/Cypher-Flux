from datetime import datetime

from app.models.db import db


class UserSetting(db.Model):
    __tablename__ = 'user_settings'

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    dos_filter_enabled = db.Column(db.Boolean, nullable=False, default=True)
    threat_threshold = db.Column(db.Integer, nullable=False, default=50)
    smtp_alerts_enabled = db.Column(db.Boolean, nullable=False, default=True)
    log_digest_frequency = db.Column(db.String(20), nullable=False, default='hourly')
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<UserSetting user_id={self.user_id}>"