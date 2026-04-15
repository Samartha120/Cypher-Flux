from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.config import Config
from app.models.db import db
from app.models.token_blocklist_model import TokenBlocklist
from app.services.db.runtime_migrations import run_runtime_migrations

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize Extensions
    db.init_app(app)
    CORS(app)

    jwt = JWTManager(app)

    @jwt.token_in_blocklist_loader
    def _is_token_revoked(_jwt_header, jwt_payload):
        jti = jwt_payload.get('jti')
        if not jti:
            return True
        return TokenBlocklist.query.filter_by(jti=jti).first() is not None

    # Register Global Security Middleware Firewall
    from app.middleware.auth_middleware import setup_middleware
    setup_middleware(app)
    
    # Register Blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.scan_routes import scan_bp
    from app.routes.monitor_routes import monitor_bp
    from app.routes.detect_routes import detect_bp
    from app.routes.alert_routes import alert_bp
    from app.routes.log_routes import log_bp
    from app.routes.block_routes import block_bp
    from app.routes.notification_routes import notification_bp
    from app.routes.dashboard_routes import dashboard_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(scan_bp, url_prefix='/api')
    app.register_blueprint(monitor_bp, url_prefix='/api')
    app.register_blueprint(detect_bp, url_prefix='/api')
    app.register_blueprint(alert_bp, url_prefix='/api')
    app.register_blueprint(log_bp, url_prefix='/api')
    app.register_blueprint(block_bp, url_prefix='/api')
    app.register_blueprint(notification_bp, url_prefix='/api')
    app.register_blueprint(dashboard_bp, url_prefix='/api')

    with app.app_context():
        db.create_all()
        run_runtime_migrations()

    # ── APScheduler jobs: cleanup & batch flush ───────────────────────────────
    # Cleanup runs every 2 hours. Batch flush runs every 10 seconds.
    _start_schedulers(app)

    return app


def _start_schedulers(app: Flask) -> None:
    """Start the background APScheduler jobs.

    Uses a daemon thread so it won't block process exit.
    Guarded against double-start when Flask reloader forks the process.
    """
    import os
    import logging

    # Werkzeug reloader spawns a child process with WERKZEUG_RUN_MAIN=true.
    # We only want the scheduler running in the child (actual server) process.
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'false':
        return

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
    except ImportError:
        logging.getLogger(__name__).warning(
            '[Scheduler] apscheduler not installed — skipping background jobs. '
            'Run: pip install apscheduler'
        )
        return

    logger = logging.getLogger(__name__)

    def _cleanup_job():
        with app.app_context():
            from app.services.alerts.alert_cleanup import cleanup_old_alerts
            cleanup_old_alerts()

    def _batch_job():
        with app.app_context():
            from app.services.alerts.alert_batch_writer import flush_alert_batch
            flush_alert_batch()

    scheduler = BackgroundScheduler(daemon=True)
    
    # Run the cleanup shortly after startup and then every 2 hours.
    scheduler.add_job(
        _cleanup_job,
        trigger='interval',
        hours=2,
        id='alert_cleanup',
        replace_existing=True,
    )
    
    # Run the batch flush every 10 seconds.
    scheduler.add_job(
        _batch_job,
        trigger='interval',
        seconds=10,
        id='alert_batch_flush',
        replace_existing=True,
    )
    
    scheduler.start()
    logger.info('[Scheduler] APScheduler started: Cleanup (2h), Batch Flush (10s).')
