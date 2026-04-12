"""
add_alert_count_column.py
~~~~~~~~~~~~~~~~~~~~~~~~~
One-time migration: safely adds the `count` column to the `alerts` table.

Usage:
    cd cypherflux-backend
    python add_alert_count_column.py

Safe to re-run — skips if the column already exists.
"""

import sys
import os

# Make sure we can import the app from this directory.
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.models.db import db


def run():
    app = create_app()
    with app.app_context():
        engine = db.engine

        with engine.connect() as conn:
            # Detect dialect
            dialect = engine.dialect.name  # 'postgresql', 'sqlite', etc.

            if dialect == 'postgresql':
                # Check if column already exists via information_schema
                result = conn.execute(
                    db.text(
                        "SELECT column_name FROM information_schema.columns "
                        "WHERE table_name='alerts' AND column_name='count'"
                    )
                )
                exists = result.fetchone() is not None
            elif dialect == 'sqlite':
                result = conn.execute(db.text("PRAGMA table_info(alerts)"))
                rows = result.fetchall()
                exists = any(row[1] == 'count' for row in rows)
            else:
                print(f'[Migration] Unsupported dialect: {dialect}. '
                      'Run the ALTER TABLE manually.')
                return

            if exists:
                print('[Migration] Column `count` already exists — nothing to do.')
                return

            print('[Migration] Adding `count` column to alerts table...')
            conn.execute(
                db.text('ALTER TABLE alerts ADD COLUMN "count" INTEGER NOT NULL DEFAULT 1')
            )
            conn.commit()
            print('[Migration] Done. Column `count` added successfully.')


if __name__ == '__main__':
    run()
