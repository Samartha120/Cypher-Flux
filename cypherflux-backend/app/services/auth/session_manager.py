"""
Session manager service for CypherFlux.
"""
from datetime import datetime, timedelta
from app.models.session_model import UserSession
from app.models.db import db

class SessionManager:
    @staticmethod
    def create_session(user_id, token, ip_address=None, user_agent=None):
        """Create a new user session."""
        expires_at = datetime.utcnow() + timedelta(days=7)
        new_session = UserSession(
            user_id=user_id,
            token=token,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at
        )
        db.session.add(new_session)
        db.session.commit()
        return new_session

    @staticmethod
    def invalidate_session(token):
        """Invalidate a session by token."""
        session = UserSession.query.filter_by(token=token).first()
        if session:
            db.session.delete(session)
            db.session.commit()
            return True
        return False

    @staticmethod
    def cleanup_expired_sessions():
        """Remove expired sessions from the database."""
        UserSession.query.filter(UserSession.expires_at < datetime.utcnow()).delete()
        db.session.commit()
