"""WSGI entrypoint for production servers (e.g., Render + gunicorn)."""

from __future__ import annotations

import os

from app import create_app
from app.models.db import db

app = create_app()


def _truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


# Render/Gunicorn won't execute app.py's __main__ path, so create tables here.
# This is intentionally lightweight (no migrations). It is safe to call on every start.
if _truthy(os.environ.get("AUTO_CREATE_TABLES", "1")):
    with app.app_context():
        db.create_all()
