from app import create_app
from app.models.db import db
from dotenv import load_dotenv

# Load PostgreSQL config from .env
load_dotenv()

app = create_app()

def initialize_db():
    with app.app_context():
        db.create_all()

if __name__ == '__main__':
    initialize_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
