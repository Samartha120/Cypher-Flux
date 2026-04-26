"""
Block service for managing IP address restrictions in CypherFlux.
"""
from datetime import datetime, timedelta
from app.models.block_model import BlockedIP
from app.models.db import db

class BlockService:
    @staticmethod
    def block_ip(ip_address, reason, duration_hours=24, user_id=None):
        """Add an IP address to the blocklist."""
        expires_at = datetime.utcnow() + timedelta(hours=duration_hours)
        new_block = BlockedIP(
            ip_address=ip_address,
            reason=reason,
            user_id=user_id,
            expires_at=expires_at,
            timestamp=datetime.utcnow()
        )
        db.session.add(new_block)
        db.session.commit()
        return new_block

    @staticmethod
    def unblock_ip(ip_address):
        """Remove an IP address from the blocklist."""
        block = BlockedIP.query.filter_by(ip_address=ip_address).first()
        if block:
            db.session.delete(block)
            db.session.commit()
            return True
        return False

    @staticmethod
    def is_ip_blocked(ip_address):
        """Check if a specific IP address is currently blocked."""
        block = BlockedIP.query.filter_by(ip_address=ip_address).first()
        if block and block.expires_at > datetime.utcnow():
            return True
        return False

    @staticmethod
    def get_all_blocks():
        """Retrieve all current IP address blocks."""
        return BlockedIP.query.all()

    @staticmethod
    def cleanup_expired_blocks():
        """Remove expired blocks from the database."""
        BlockedIP.query.filter(BlockedIP.expires_at < datetime.utcnow()).delete()
        db.session.commit()
