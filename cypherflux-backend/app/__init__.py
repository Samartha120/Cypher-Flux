import time
import logging
from urllib.parse import parse_qsl, urlencode
from flask import Flask, g, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.config import Config
from app.models.db import db
from app.models.token_blocklist_model import TokenBlocklist

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.logger.setLevel(logging.INFO)

    def _should_trace(path: str) -> bool:
        p = str(path or '')
        if p.startswith('/static'):
            return False
        if p == '/favicon.ico':
            return False
        return True

    @app.before_request
    def _api_request_timer_start():
        g._request_started_at = time.perf_counter()
        if _should_trace(request.path):
            query = request.query_string.decode('utf-8', errors='ignore') if request.query_string else ''
            full_path = f"{request.path}?{query}" if query else request.path
            req_line = f"[REQ] {request.remote_addr or '-'} {request.method} {full_path}"
            print(req_line, flush=True)

    @app.after_request
    def _log_api_response(response):
        if _should_trace(request.path):
            started_at = getattr(g, '_request_started_at', None)
            duration_ms = None
            if started_at is not None:
                duration_ms = int((time.perf_counter() - started_at) * 1000)

            query = request.query_string.decode('utf-8', errors='ignore') if request.query_string else ''
            if query:
                pairs = parse_qsl(query, keep_blank_values=True)
                safe_pairs = []
                for k, v in pairs:
                    key = str(k or '')
                    if key.lower() in {'token', 'access_token', 'authorization', 'auth'}:
                        safe_pairs.append((key, '***redacted***'))
                    else:
                        safe_pairs.append((key, v))
                safe_query = urlencode(safe_pairs)
                full_path = f"{request.path}?{safe_query}" if safe_query else request.path
            else:
                full_path = request.path
            line = f"[RES] {request.remote_addr or '-'} {request.method} {full_path} -> {response.status_code}"
            if duration_ms is not None:
                line = f"{line} ({duration_ms}ms)"

            # Print explicitly so logs are always visible in terminal output.
            print(line, flush=True)
            app.logger.info(line)
        return response
    
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
