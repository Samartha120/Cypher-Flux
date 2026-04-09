from app.models.db import db
from datetime import datetime

class Alert(db.Model):
    __tablename__ = 'alerts'
    id = db.Column(db.Integer, primary_key=True)
    ip = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(100), nullable=False)
    severity = db.Column(db.String(20), nullable=False, default='medium')  # critical|high|medium|low
    hostname = db.Column(db.String(120), nullable=True)
    details = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
