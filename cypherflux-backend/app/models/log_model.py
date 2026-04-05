from app.models.db import db
from datetime import datetime

class Log(db.Model):
    __tablename__ = 'logs'
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(255), nullable=False)
    encrypted_data = db.Column(db.Text, nullable=True) # Text since encrypted blob
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
