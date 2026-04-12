"""
Migration: adds first_seen, last_seen, alert_score, and status columns to the alerts
table in the PostgreSQL database. Safe to run multiple times.

Usage:
    cd cypherflux-backend
    python migrate_alert_v2.py
"""
import os
import sys
from pathlib import Path
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent / '.env', override=False)

db_url = os.environ.get('DATABASE_URL')
if not db_url:
    user     = os.environ.get('DB_USER', 'postgres')
    password = os.environ.get('DB_PASSWORD', '')
    host     = os.environ.get('DB_HOST', 'localhost')
    port     = os.environ.get('DB_PORT', '5432')
    name     = os.environ.get('DB_NAME', 'Cypherflux')
    if password:
        db_url = f"postgresql://{user}:{quote_plus(password)}@{host}:{port}/{name}"
    else:
        db_url = f"postgresql://{user}@{host}:{port}/{name}"

print(f"[connect] {db_url.split('@')[-1]}")

try:
    import psycopg2
    conn = psycopg2.connect(db_url)
    conn.autocommit = False
except ImportError:
    try:
        import psycopg
        conn = psycopg.connect(db_url)
    except ImportError:
        print("[error] Neither psycopg2 nor psycopg is installed.")
        sys.exit(1)

cur = conn.cursor()

# Fetch existing columns in alerts table
cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'alerts'
""")
existing = {row[0] for row in cur.fetchall()}

if not existing:
    print("[skip] 'alerts' table does not exist yet — it will be created by db.create_all() on next startup.")
    conn.close()
    sys.exit(0)

migrations = [
    ("first_seen",  "TIMESTAMP"),
    ("last_seen",   "TIMESTAMP"),
    ("alert_score", "FLOAT NOT NULL DEFAULT 1.0"),
    ("status",      "VARCHAR(20) NOT NULL DEFAULT 'active'"),
]

for col_name, col_def in migrations:
    if col_name not in existing:
        cur.execute(f"ALTER TABLE alerts ADD COLUMN {col_name} {col_def}")
        print(f"[added] alerts.{col_name}")
    else:
        print(f"[skip]  alerts.{col_name} already exists")

# Backfill dates if first_seen is null
cur.execute("UPDATE alerts SET first_seen = timestamp, last_seen = timestamp WHERE first_seen IS NULL")
print("[backfill] synchronized first_seen/last_seen for existing rows")

# Add indexes
indexes = [
    ("ix_alerts_last_seen", "CREATE INDEX ix_alerts_last_seen ON alerts (last_seen)"),
    ("ix_alerts_score_desc", "CREATE INDEX ix_alerts_score_desc ON alerts (alert_score DESC)"),
]

for idx_name, idx_stmt in indexes:
    cur.execute(f"SELECT 1 FROM pg_class WHERE relname = '{idx_name}'")
    if not cur.fetchone():
        try:
            cur.execute(idx_stmt)
            print(f"[indexed] {idx_name}")
        except Exception as e:
            print(f"[warn] Failed to create index {idx_name}: {e}")
            conn.rollback()
            continue
    else:
        print(f"[skip]  index {idx_name} already exists")

conn.commit()
conn.close()
print("[done] Migration complete. Restart the backend.")
