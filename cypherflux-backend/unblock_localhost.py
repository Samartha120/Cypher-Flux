"""
Emergency unblock: removes localhost/private IP blocks from the Postgres DB.
Reads connection info from the same .env the app uses.

Usage:
    cd cypherflux-backend
    python unblock_localhost.py
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent / '.env', override=False)

# Build connection URL same way config.py does
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    user     = os.environ.get('DB_USER', 'postgres')
    password = os.environ.get('DB_PASSWORD', '')
    host     = os.environ.get('DB_HOST', 'localhost')
    port     = os.environ.get('DB_PORT', '5432')
    name     = os.environ.get('DB_NAME', 'Cypherflux')
    if password:
        from urllib.parse import quote_plus
        db_url = f"postgresql://{user}:{quote_plus(password)}@{host}:{port}/{name}"
    else:
        db_url = f"postgresql://{user}@{host}:{port}/{name}"

print(f"[connect] {db_url.split('@')[-1]}")   # print only host+db, hide creds

try:
    import psycopg2
    conn = psycopg2.connect(db_url)
except ImportError:
    try:
        import psycopg
        conn = psycopg.connect(db_url)
    except ImportError:
        print("[error] Neither psycopg2 nor psycopg is installed.")
        sys.exit(1)

cur = conn.cursor()

# Remove localhost and common private range blocks
cur.execute("""
    DELETE FROM blocked_ips
    WHERE ip LIKE '127.%%'
       OR ip = '::1'
       OR ip LIKE '192.168.%%'
       OR ip LIKE '10.%%'
       OR ip LIKE '172.16.%%' OR ip LIKE '172.17.%%' OR ip LIKE '172.18.%%'
       OR ip LIKE '172.19.%%' OR ip LIKE '172.2%%.%%' OR ip LIKE '172.30.%%'
       OR ip LIKE '172.31.%%'
""")
removed = cur.rowcount
conn.commit()

cur.execute("SELECT COUNT(*) FROM blocked_ips")
remaining = cur.fetchone()[0]
conn.close()

if removed:
    print(f"[removed] {removed} localhost/private IP block(s) cleared.")
else:
    print("[info] No localhost/private IP blocks found.")

print(f"[info] Remaining blocks in DB: {remaining}")
print("[done] Restart the backend and try logging in.")
