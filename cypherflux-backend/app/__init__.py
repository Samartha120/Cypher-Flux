from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.config import Config
from app.models.db import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize Extensions
    db.init_app(app)
    CORS(app)
    JWTManager(app)
    
    # Register Blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.scan_routes import scan_bp
    from app.routes.monitor_routes import monitor_bp
    from app.routes.detect_routes import detect_bp
    from app.routes.alert_routes import alert_bp
    from app.routes.log_routes import log_bp
    from app.routes.block_routes import block_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(scan_bp, url_prefix='/api')
    app.register_blueprint(monitor_bp, url_prefix='/api')
    app.register_blueprint(detect_bp, url_prefix='/api')
    app.register_blueprint(alert_bp, url_prefix='/api')
    app.register_blueprint(log_bp, url_prefix='/api')
    app.register_blueprint(block_bp, url_prefix='/api')
    
    return app
