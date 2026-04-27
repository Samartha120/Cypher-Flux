# Cypher-Flux Backend (Flask)

This backend is a Flask API with SQLAlchemy, JWT auth, and PostgreSQL support (via `psycopg` v3).

## Render deployment (recommended)

### Option A: Blueprint
If you deploy via Render Blueprint, use the repository-level `render.yaml`.

### Option B: Manual service setup
Create a **Web Service** in Render with:

- **Runtime:** Python 3
- **Root directory:** `cypherflux-backend`
- **Build command:** `pip install -r requirements.txt`
- **Start command:**
  - `python -m gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120`

### Environment variables
Minimum:

- `DATABASE_URL` = Render Postgres connection string
- `SECRET_KEY` = any random string
- `JWT_SECRET_KEY` = any random string
- `FLASK_DEBUG` = `0`

Optional:

- `AUTO_CREATE_TABLES` = `1` (default). On startup, the service will run `db.create_all()` from `wsgi.py`.

## Notes

- Don’t use `app.run(...)` in production on Render. Gunicorn binds to Render’s `$PORT`.
- This repo uses `psycopg[binary]` (not `psycopg2-binary`).
