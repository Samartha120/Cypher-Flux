"""
System logs service for CypherFlux.
"""
from datetime import datetime
from app.models.log_model import SystemLog
from app.models.db import db

class LogsService:
    @staticmethod
    def create_log(event_type, message, level="INFO", user_id=None, extra_data=None):
        """Create a new system log entry."""
        new_log = SystemLog(
            event_type=event_type,
            message=message,
            level=level,
            user_id=user_id,
            extra_data=extra_data,
            timestamp=datetime.utcnow()
        )
        db.session.add(new_log)
        db.session.commit()
        return new_log

    @staticmethod
    def get_logs(filters=None, limit=100, offset=0):
        """Retrieve system logs with optional filtering."""
        query = SystemLog.query
        
        if filters:
            if 'level' in filters:
                query = query.filter_by(level=filters['level'])
            if 'event_type' in filters:
                query = query.filter_by(event_type=filters['event_type'])
            if 'user_id' in filters:
                query = query.filter_by(user_id=filters['user_id'])

        return query.order_by(SystemLog.timestamp.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def clear_old_logs(days=30):
        """Remove logs older than a specific number of days."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        SystemLog.query.filter(SystemLog.timestamp < cutoff).delete()
        db.session.commit()
