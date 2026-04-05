from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity
from app.models.user_model import User
from app.models.otp_model import OTPCode
from app.models.token_blocklist_model import TokenBlocklist
from app.models.db import db
from app.services.email.email_service import send_otp_email
import bcrypt
import hmac
import os
import re
import secrets
import hashlib
from typing import Optional
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _now() -> datetime:
    return datetime.utcnow()


def _normalize_email(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    return raw.strip().lower()


def _password_strength_errors(password: str) -> list[str]:
    errors: list[str] = []
    if len(password) < 12:
        errors.append("Password must be at least 12 characters.")
    if not re.search(r"[a-z]", password):
        errors.append("Password must include a lowercase letter.")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must include an uppercase letter.")
    if not re.search(r"\d", password):
        errors.append("Password must include a number.")
    if not re.search(r"[^A-Za-z0-9]", password):
        errors.append("Password must include a symbol.")
    return errors


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False


def _otp_secret() -> str:
    return os.environ.get('OTP_SECRET') or os.environ.get('SECRET_KEY', 'cipherflux-otp-secret')


def _hash_otp(email: str, otp_code: str) -> str:
    payload = f"{email}:{otp_code}:{_otp_secret()}".encode('utf-8')
    return hashlib.sha256(payload).hexdigest()


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _issue_token(user: User) -> str:
    return create_access_token(identity=str(user.id), additional_claims={"email": user.email})


def _generate_and_send_otp(email: str) -> None:
    # Enforce basic resend cooldown (per email)
    existing = OTPCode.query.filter_by(email=email).order_by(OTPCode.id.desc()).first()
    if existing and existing.last_sent_at:
        if _now() < existing.last_sent_at + timedelta(seconds=30):
            return

    # Remove older OTP rows for this email.
    OTPCode.query.filter_by(email=email).delete()

    code = _generate_otp()
    expiry = _now() + timedelta(minutes=5)
    otp_hash = _hash_otp(email, code)

    new_otp = OTPCode(email=email, otp=otp_hash, expiry_time=expiry, attempts=0, last_sent_at=_now())
    db.session.add(new_otp)
    db.session.commit()

    send_otp_email(email, code)


def _json_error(message: str, status: int):
    return jsonify({"msg": message}), status

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = _normalize_email(data.get('email') or data.get('username'))
    password = data.get('password')

    if not email or not EMAIL_REGEX.match(email):
        return _json_error("Invalid email.", 400)
    if not password:
        return _json_error("Missing password.", 400)

    user = User.query.filter_by(email=email).first()

    if not user or not _verify_password(password, user.password_hash):
        return _json_error("Bad credentials", 401)

    if not user.is_verified:
        _generate_and_send_otp(email)
        return jsonify({"msg": "Verification required", "requires_verification": True, "email": email}), 403

    access_token = _issue_token(user)
    return jsonify(access_token=access_token), 200

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = _normalize_email(data.get('email') or data.get('username'))
    password = data.get('password')
    confirm_password = data.get('confirm_password') or data.get('confirmPassword') or data.get('confirm')

    if not email or not EMAIL_REGEX.match(email):
        return _json_error("Invalid email.", 400)
    if not password or not confirm_password:
        return _json_error("Missing password or confirm password.", 400)
    if password != confirm_password:
        return _json_error("Passwords do not match.", 400)

    pw_errors = _password_strength_errors(password)
    if pw_errors:
        return jsonify({"msg": "Weak password.", "errors": pw_errors}), 400

    if User.query.filter_by(email=email).first():
        return _json_error("Email already exists in system", 400)

    new_user = User(email=email, password_hash=_hash_password(password), is_verified=False)
    db.session.add(new_user)
    db.session.commit()

    _generate_and_send_otp(email)
    return jsonify({"msg": "Account created. Verification required.", "email": email}), 201


# Backwards-compatible alias
@auth_bp.route('/register', methods=['POST'])
def register_alias():
    return signup()

@auth_bp.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    email = _normalize_email(data.get('email') or data.get('username'))

    if not email or not EMAIL_REGEX.match(email):
        return _json_error("Invalid email.", 400)
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "No user found."}), 404

    if user.is_verified:
        return jsonify({"msg": "Account already verified."}), 200
        
    _generate_and_send_otp(email)
    return jsonify({"msg": "A fresh OTP has been successfully dispatched.", "email": email}), 200

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = _normalize_email(data.get('email') or data.get('username'))
    code = data.get('otp') or data.get('code')

    if not email or not EMAIL_REGEX.match(email):
        return _json_error("Invalid email.", 400)
    if not code or not re.fullmatch(r"\d{6}", str(code)):
        return _json_error("OTP must be a 6-digit code.", 400)

    otp_record = OTPCode.query.filter_by(email=email).order_by(OTPCode.id.desc()).first()
    
    if not otp_record:
        return jsonify({"msg": "No active verification requests found."}), 404

    if otp_record.locked_until and _now() < otp_record.locked_until:
        return jsonify({"msg": "Too many attempts. Try again later."}), 429
        
    if _now() > otp_record.expiry_time:
        OTPCode.query.filter_by(email=email).delete()
        db.session.commit()
        return jsonify({"msg": "OTP Expired! Please request a new code."}), 400

    expected_hash = otp_record.otp
    provided_hash = _hash_otp(email, str(code))
    if not hmac.compare_digest(expected_hash, provided_hash):
        otp_record.attempts = (otp_record.attempts or 0) + 1
        if otp_record.attempts >= 5:
            otp_record.locked_until = _now() + timedelta(minutes=15)
        db.session.commit()
        return jsonify({"msg": "Invalid 6-digit verification code."}), 400
        
    # Verification Success!
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "No user found."}), 404
    user.is_verified = True
    OTPCode.query.filter_by(email=email).delete()
    db.session.commit()

    access_token = _issue_token(user)
    return jsonify({"access_token": access_token, "msg": "System access granted"}), 201


# Backwards-compatible alias for existing frontend
@auth_bp.route('/verify', methods=['POST'])
def verify_alias():
    return verify_otp()

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt().get('jti')
    if jti:
        db.session.add(TokenBlocklist(jti=jti))
        db.session.commit()
    return jsonify({"msg": "Successfully logged out"}), 200
