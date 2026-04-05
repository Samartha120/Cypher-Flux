import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'super-secret-cipherflux-key')
    
    # Try to load Postgres URI, optionally falling back to SQLite for local ease
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///cypherflux.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'super-secret-jwt-key')
    JWT_ACCESS_TOKEN_EXPIRES = 3600 # 1 hour
