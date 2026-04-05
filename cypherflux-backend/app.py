from app import create_app
from app.models.db import db
from app.models.user_model import User
from werkzeug.security import generate_password_hash

app = create_app()

def initialize_db():
    with app.app_context():
        db.create_all()
        # Create default admin user if none exists
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                password_hash=generate_password_hash('admin123')
            )
            db.session.add(admin)
            db.session.commit()
            print("Default admin user created (admin / admin123)")

if __name__ == '__main__':
    initialize_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
