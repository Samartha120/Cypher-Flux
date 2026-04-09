"""
One-time migration: adds severity, hostname, details columns to the alerts table
if they are missing. Safe to run multiple times.

Usage:
    cd cypherflux-backend
    python migrate_alerts.py
"""
import os
import sqlite3
from pathlib import Path

# Resolve the SQLite file (default location mirrors config.py fallback)
db_path = Path(__file__).resolve().parent / 'cypherflux.db'

if not db_path.exists():
    print(f"[skip] Database not found at {db_path}. Run the app first to create it.")
    raise SystemExit(0)

conn = sqlite3.connect(db_path)
cur  = conn.cursor()

# Check existing columns
cur.execute("PRAGMA table_info(alerts)")
existing = {row[1] for row in cur.fetchall()}

migrations = [
    ("severity", "TEXT NOT NULL DEFAULT 'medium'"),
    ("hostname", "TEXT"),
    ("details",  "TEXT"),
]

for col_name, col_def in migrations:
    if col_name not in existing:
        cur.execute(f"ALTER TABLE alerts ADD COLUMN {col_name} {col_def}")
        print(f"[added] alerts.{col_name}")
    else:
        print(f"[skip]  alerts.{col_name} already exists")

conn.commit()
conn.close()
print("[done] Migration complete.")
