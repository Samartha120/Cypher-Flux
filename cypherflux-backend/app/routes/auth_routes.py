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
from app.services.notifications.notification_service import create_notification

auth_bp = Blueprint('auth', __name__)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_REGEX = re.compile(r"^[A-Za-z0-9_.-]{3,30}$")


def _now() -> datetime:
    return datetime.utcnow()


def _normalize_email(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    return raw.strip().lower()


def _normalize_username(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    return raw.strip()


def _password_strength_errors(password: str) -> list[str]:
    errors: list[str] = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters.")
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
    return create_access_token(
        identity=str(user.id),
        additional_claims={
            "email": user.email,
            "username": user.username,
        },
    )


def _generate_and_send_otp(email: str) -> None:
    # Enforce basic resend cooldown (per email)
    existing = OTPCode.query.filter_by(email=email).order_by(OTPCode.id.desc()).first()
    if existing and existing.last_sent_at:
        if _now() < existing.last_sent_at + timedelta(seconds=30):
            return

    # Remove older OTP rows for this email.
    OTPCode.query.filter_by(email=email).delete()

    code = _generate_otp()
    expiry = _now() + timedelta(seconds=30)
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
    identifier = data.get('identifier') or data.get('email') or data.get('username')
    password = data.get('password')

    if not identifier:
        return _json_error("Missing username or email.", 400)
    if not password:
        return _json_error("Missing password.", 400)

    if '@' in identifier:
        ident_norm = _normalize_email(identifier)
        if not ident_norm or not EMAIL_REGEX.match(ident_norm):
            return _json_error("Invalid email.", 400)
        user = User.query.filter_by(email=ident_norm).first()
    else:
        ident_norm = _normalize_username(identifier)
        if not ident_norm or not USERNAME_REGEX.match(ident_norm):
            return _json_error("Invalid username.", 400)
        user = User.query.filter_by(username=ident_norm).first()

    if not user or not _verify_password(password, user.password_hash):
        try:
            create_notification(
                event_type='auth.login_failed',
                title='Login Failed',
                message='Invalid credentials provided.',
                severity='warning',
                user_id=user.id if user else None,
                req=request,
            )
        except Exception:
            pass
        return _json_error("Bad credentials", 401)

    if not user.is_verified:
        _generate_and_send_otp(user.email)
        try:
            create_notification(
                event_type='auth.verification_required',
                title='Verification Required',
                message='OTP verification required to complete login.',
                severity='warning',
                user_id=user.id,
                req=request,
            )
        except Exception:
            pass
        return jsonify({
            "msg": "Verification required",
            "requires_verification": True,
            "username": user.username,
            "email": user.email
        }), 403

    access_token = _issue_token(user)
    try:
        create_notification(
            event_type='auth.login',
            title='Login Success',
            message='User authenticated successfully.',
            severity='success',
            user_id=user.id,
            req=request,
        )
    except Exception:
        pass
    return jsonify(access_token=access_token), 200

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = _normalize_username(data.get('username'))
    email = _normalize_email(data.get('email'))
    password = data.get('password')
    confirm_password = data.get('confirm_password') or data.get('confirmPassword') or data.get('confirm')

    if not username or not USERNAME_REGEX.match(username):
        return _json_error("Invalid username. Use 3-30 chars: letters, numbers, _ . -", 400)
    if not email or not EMAIL_REGEX.match(email):
        return _json_error("Invalid email.", 400)
    if not password or not confirm_password:
        return _json_error("Missing password or confirm password.", 400)
    if password != confirm_password:
        return _json_error("Passwords do not match.", 400)

    pw_errors = _password_strength_errors(password)
    if pw_errors:
        return jsonify({"msg": "Weak password.", "errors": pw_errors}), 400

    if User.query.filter_by(username=username).first():
        return _json_error("Username already exists in system", 400)
    if User.query.filter_by(email=email).first():
        return _json_error("Email already exists in system", 400)

    new_user = User(username=username, email=email, password_hash=_hash_password(password), is_verified=False)
    db.session.add(new_user)
    db.session.commit()

    try:
        create_notification(
            event_type='auth.signup',
            title='Account Created',
            message='New account created. OTP verification required.',
            severity='info',
            user_id=new_user.id,
            req=request,
        )
    except Exception:
        pass

    _generate_and_send_otp(email)
    return jsonify({"msg": "Account created. Verification required.", "username": username, "email": email}), 201


# Backwards-compatible alias
@auth_bp.route('/register', methods=['POST'])
def register_alias():
    return signup()

@auth_bp.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json()

    # Preferred: username (matches frontend). Backward-compatible: email.
    username = _normalize_username(data.get('username'))
    email = _normalize_email(data.get('email'))

    user: Optional[User] = None
    if username:
        if not USERNAME_REGEX.match(username):
            return _json_error("Invalid username.", 400)
        user = User.query.filter_by(username=username).first()
    elif email:
        if not EMAIL_REGEX.match(email):
            return _json_error("Invalid email.", 400)
        user = User.query.filter_by(email=email).first()
    else:
        return _json_error("Missing username (or email).", 400)

    if not user:
        return jsonify({"msg": "No user found."}), 404

    if user.is_verified:
        return jsonify({"msg": "Account already verified."}), 200

    _generate_and_send_otp(user.email)
    try:
        create_notification(
            event_type='auth.otp_sent',
            title='OTP Sent',
            message='A verification code was sent to the registered email.',
            severity='info',
            user_id=user.id,
            req=request,
        )
    except Exception:
        pass
    return jsonify({
        "msg": "A fresh OTP has been successfully dispatched.",
        "username": user.username,
        "email": user.email,
    }), 200

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    # Preferred: username (matches frontend). Backward-compatible: email.
    username = _normalize_username(data.get('username'))
    email = _normalize_email(data.get('email'))
    code = data.get('otp') or data.get('code')

    if not code or not re.fullmatch(r"\d{6}", str(code)):
        return _json_error("OTP must be a 6-digit code.", 400)

    user: Optional[User] = None
    if username:
        if not USERNAME_REGEX.match(username):
            return _json_error("Invalid username.", 400)
        user = User.query.filter_by(username=username).first()
    elif email:
        if not EMAIL_REGEX.match(email):
            return _json_error("Invalid email.", 400)
        user = User.query.filter_by(email=email).first()
    else:
        return _json_error("Missing username (or email).", 400)

    if not user:
        return jsonify({"msg": "No user found."}), 404

    email = user.email

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
    user.is_verified = True
    OTPCode.query.filter_by(email=email).delete()
    db.session.commit()

    try:
        create_notification(
            event_type='auth.otp_verified',
            title='OTP Verified',
            message='Account verification completed successfully.',
            severity='success',
            user_id=user.id,
            req=request,
        )
    except Exception:
        pass

    access_token = _issue_token(user)
    return jsonify({"access_token": access_token, "msg": "System access granted"}), 201


# Backwards-compatible alias for existing frontend
@auth_bp.route('/verify', methods=['POST'])
def verify_alias():
    return verify_otp()


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    data = request.get_json()
    current_password = data.get('current_password') or data.get('currentPassword')
    new_password = data.get('new_password') or data.get('newPassword')
    confirm_password = data.get('confirm_password') or data.get('confirmPassword')

    if not current_password or not new_password or not confirm_password:
        return _json_error("Missing password fields.", 400)
    if new_password != confirm_password:
        return _json_error("Passwords do not match.", 400)

    user = User.query.get(int(user_id))
    if not user:
        return _json_error("User not found.", 404)
    if not _verify_password(current_password, user.password_hash):
        return _json_error("Current password is incorrect.", 401)

    pw_errors = _password_strength_errors(new_password)
    if pw_errors:
        return jsonify({"msg": "Weak password.", "errors": pw_errors}), 400

    user.password_hash = _hash_password(new_password)
    db.session.commit()

    try:
        create_notification(
            event_type='auth.password_change',
            title='Password Changed',
            message='Password updated successfully.',
            severity='success',
            user_id=user.id,
            req=request,
        )
    except Exception:
        pass
    return jsonify({"msg": "Password updated."}), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt().get('jti')
    if jti:
        db.session.add(TokenBlocklist(jti=jti))
        db.session.commit()
    try:
        user_id = get_jwt_identity()
        create_notification(
            event_type='auth.logout',
            title='Logout',
            message='User session terminated.',
            severity='info',
            user_id=int(user_id) if user_id is not None else None,
            req=request,
        )
    except Exception:
        pass
    return jsonify({"msg": "Successfully logged out"}), 200
