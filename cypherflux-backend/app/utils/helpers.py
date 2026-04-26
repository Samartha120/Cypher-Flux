"""
Helper functions for CypherFlux.
"""
from datetime import datetime
import json
import uuid

def format_datetime(dt):
    """Format datetime to standard ISO format."""
    if not dt:
        return None
    return dt.isoformat()

def generate_id():
    """Generate a unique string ID."""
    return str(uuid.uuid4())

def parse_json(data):
    """Safely parse JSON string."""
    try:
        return json.loads(data) if data else {}
    except (ValueError, TypeError):
        return {}

def success_response(data=None, message="Operation successful"):
    """Standard success response format."""
    return {
        "status": "success",
        "message": message,
        "data": data
    }

def error_response(message="Operation failed", code=400):
    """Standard error response format."""
    return {
        "status": "error",
        "message": message,
        "code": code
    }
