from app.models.db import db
from app.models.alert_model import Alert

DOS_THRESHOLD = 50

class DetectionEngine:
    @staticmethod
    def analyze_traffic(ip, count):
        if count > DOS_THRESHOLD:
            # Check if alert already exists recently to avoid spam
            recent = Alert.query.filter_by(ip=ip, type="Potential DoS Attack").order_by(Alert.id.desc()).first()
            if not recent:
                new_alert = Alert(ip=ip, type="Potential DoS Attack")
                db.session.add(new_alert)
                db.session.commit()
                return True
        return False
