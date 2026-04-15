from __future__ import annotations

from sqlalchemy import inspect, text

from app.models.db import db


def _ensure_column(conn, inspector, table_name: str, column_name: str, ddl: str) -> None:
    columns = {col['name'] for col in inspector.get_columns(table_name)}
    normalized_name = column_name.replace('"', '')
    if normalized_name in columns:
        return
    conn.execute(text(f'ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}'))


def run_runtime_migrations() -> None:
    """Apply lightweight additive schema changes for existing local databases."""
    engine = db.engine
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        if 'alerts' in tables:
            _ensure_column(conn, inspector, 'alerts', 'first_seen', 'DATETIME')
            inspector = inspect(engine)
            _ensure_column(conn, inspector, 'alerts', 'last_seen', 'DATETIME')
            inspector = inspect(engine)
            _ensure_column(conn, inspector, 'alerts', '"count"', 'INTEGER NOT NULL DEFAULT 1')
            inspector = inspect(engine)
            _ensure_column(conn, inspector, 'alerts', 'alert_score', 'FLOAT NOT NULL DEFAULT 1.0')
            inspector = inspect(engine)
            _ensure_column(conn, inspector, 'alerts', 'status', "VARCHAR(20) NOT NULL DEFAULT 'active'")
            conn.execute(text(
                "UPDATE alerts "
                "SET first_seen = COALESCE(first_seen, timestamp), "
                "last_seen = COALESCE(last_seen, timestamp), "
                "alert_score = COALESCE(alert_score, 1.0), "
                "status = COALESCE(status, 'active')"
            ))
            conn.execute(text('CREATE INDEX IF NOT EXISTS ix_alerts_last_seen ON alerts (last_seen)'))
            conn.execute(text('CREATE INDEX IF NOT EXISTS ix_alerts_score_desc ON alerts (alert_score)'))
            conn.execute(text('CREATE INDEX IF NOT EXISTS ix_alerts_ip_type_sev ON alerts (ip, type, severity)'))

        if 'blocked_ips' in tables:
            additions = [
                ('attack_type', 'VARCHAR(120)'),
                ('details', 'TEXT'),
                ('detection_source', "VARCHAR(80) NOT NULL DEFAULT 'Manual Block'"),
                ('severity', "VARCHAR(20) NOT NULL DEFAULT 'medium'"),
                ('risk_score', 'FLOAT NOT NULL DEFAULT 0'),
                ('action_type', "VARCHAR(20) NOT NULL DEFAULT 'manual'"),
                ('source_alert_id', 'INTEGER'),
                ('request_count', 'INTEGER'),
                ('last_path', 'VARCHAR(255)'),
                ('last_method', 'VARCHAR(16)'),
                ('blocked_at', 'DATETIME'),
            ]
            for column_name, ddl in additions:
                inspector = inspect(engine)
                _ensure_column(conn, inspector, 'blocked_ips', column_name, ddl)

            conn.execute(text(
                "UPDATE blocked_ips "
                "SET detection_source = COALESCE(detection_source, 'Manual Block'), "
                "severity = COALESCE(severity, 'medium'), "
                "risk_score = COALESCE(risk_score, 0), "
                "action_type = COALESCE(action_type, 'manual'), "
                "blocked_at = COALESCE(blocked_at, timestamp)"
            ))
            conn.execute(text('CREATE INDEX IF NOT EXISTS ix_blocked_ips_severity ON blocked_ips (severity)'))
            conn.execute(text('CREATE INDEX IF NOT EXISTS ix_blocked_ips_action_type ON blocked_ips (action_type)'))
            conn.execute(text('CREATE INDEX IF NOT EXISTS ix_blocked_ips_blocked_at ON blocked_ips (blocked_at)'))
