from app import create_app
from app.models.db import db
from dotenv import load_dotenv
from pathlib import Path
import os

# Load environment from cypherflux-backend/.env regardless of current working directory
load_dotenv(dotenv_path=Path(__file__).resolve().parent / '.env', override=False)

app = create_app()

def initialize_db():
    with app.app_context():
        db.create_all()

if __name__ == '__main__':
    initialize_db()
    debug_mode = os.environ.get('FLASK_DEBUG', '0').strip().lower() in {'1', 'true', 'yes', 'on'}
    use_reloader = os.environ.get('FLASK_USE_RELOADER', '0').strip().lower() in {'1', 'true', 'yes', 'on'}
    app.run(host='0.0.0.0', port=5000, debug=debug_mode, use_reloader=use_reloader)
