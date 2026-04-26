"""
Alert service for handling security alerts in CypherFlux.
"""
from datetime import datetime
from app.models.alert_model import SecurityAlert
from app.models.db import db

class AlertService:
    @staticmethod
    def create_alert(title, description, severity="MEDIUM", source_ip=None, user_id=None):
        """Create a new security alert."""
        new_alert = SecurityAlert(
            title=title,
            description=description,
            severity=severity,
            source_ip=source_ip,
            user_id=user_id,
            timestamp=datetime.utcnow(),
            status="OPEN"
        )
        db.session.add(new_alert)
        db.session.commit()
        return new_alert

    @staticmethod
    def get_active_alerts():
        """Retrieve all open/active security alerts."""
        return SecurityAlert.query.filter_by(status="OPEN").order_by(SecurityAlert.timestamp.desc()).all()

    @staticmethod
    def update_alert_status(alert_id, status):
        """Update the status of a specific alert (e.g., CLOSED, INVESTIGATING)."""
        alert = SecurityAlert.query.get(alert_id)
        if alert:
            alert.status = status
            db.session.commit()
            return True
        return False
