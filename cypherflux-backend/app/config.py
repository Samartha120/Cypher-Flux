import os
from typing import Optional
from urllib.parse import quote_plus

from dotenv import load_dotenv


load_dotenv()


def _normalize_database_url(url: str) -> str:
    # SQLAlchemy defaults 'postgresql://' to the psycopg2 driver unless a driver is specified.
    # This project uses psycopg (v3), so normalize common forms.
    if url.startswith('postgresql+psycopg://'):
        return url
    if url.startswith('postgresql://'):
        return url.replace('postgresql://', 'postgresql+psycopg://', 1)
    if url.startswith('postgres://'):
        return url.replace('postgres://', 'postgresql+psycopg://', 1)
    return url


def _build_postgres_url_from_parts() -> Optional[str]:
    user = os.environ.get('DB_USER')
    password = os.environ.get('DB_PASSWORD')
    host = os.environ.get('DB_HOST')
    port = os.environ.get('DB_PORT', '5432')
    name = os.environ.get('DB_NAME')

    if not all([user, host, name]):
        return None

    if password:
        safe_password = quote_plus(password)
        return f"postgresql+psycopg://{user}:{safe_password}@{host}:{port}/{name}"

    return f"postgresql+psycopg://{user}@{host}:{port}/{name}"

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'super-secret-cipherflux-key')
    
    # Preferred: set DATABASE_URL to a full SQLAlchemy URL, e.g.
    # postgresql+psycopg://postgres:<password>@localhost:5432/Cypherflux
    # Alternatively, set DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_NAME.
    _raw_database_url = os.environ.get('DATABASE_URL')
    SQLALCHEMY_DATABASE_URI = (
        _normalize_database_url(_raw_database_url) if _raw_database_url else None
    ) or _build_postgres_url_from_parts() or 'sqlite:///cypherflux.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'super-secret-jwt-key')
    JWT_ACCESS_TOKEN_EXPIRES = 3600 # 1 hour
