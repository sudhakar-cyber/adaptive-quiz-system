import re
import time
import secrets
import hashlib
import hmac
import threading
from typing import Dict, Any, Optional
from config import config
from app.utils.email_service import send_password_reset_email, send_otp_email

# Thread-safe storage for reset tokens and OTPs
_lock = threading.Lock()

# Format:
# _reset_tokens[token_hex] = { "email": str, "expires_at": float }
_reset_tokens: Dict[str, Dict[str, Any]] = {}

# Format:
# _otp_store[email] = {
#     "hash": str,
#     "expires_at": float,
#     "attempts": int,
#     "last_sent_at": float,
#     "resend_history": list[float]
# }
_otp_store: Dict[str, Dict[str, Any]] = {}

# Format:
# _verified_tokens[token] = { "email": str, "expires_at": float }
_verified_tokens: Dict[str, Dict[str, Any]] = {}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()

def _hash_otp(email: str, otp: str) -> str:
    key = config.OTP_SECRET_SALT.encode("utf-8")
    msg = f"{email.lower().strip()}:{otp.strip()}".encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()

def request_otp(email: str) -> Dict[str, Any]:
    norm_email = _normalize_email(email)
    if not norm_email or not EMAIL_REGEX.match(norm_email):
        return {"success": False, "error": "Invalid email address format. Please enter a valid email."}

    now = time.time()
    with _lock:
        existing = _otp_store.get(norm_email)
        if existing:
            # Check resend cooldown
            time_since = now - existing.get("last_sent_at", 0)
            if time_since < config.OTP_RESEND_COOLDOWN_SECONDS:
                remaining = int(config.OTP_RESEND_COOLDOWN_SECONDS - time_since)
                return {
                    "success": False,
                    "error": f"Please wait {remaining} seconds before requesting a new code.",
                    "cooldownSeconds": remaining
                }

            # Check hourly rate limit
            history = [t for t in existing.get("resend_history", []) if (now - t) < 3600]
            if len(history) >= config.OTP_MAX_HOURLY_RESENDS:
                return {
                    "success": False,
                    "error": "Too many verification code requests for this email. Please try again in an hour."
                }
        else:
            history = []

        # Generate a secure random 4-digit numeric OTP (1000 - 9999)
        raw_otp = f"{secrets.randbelow(9000) + 1000}"
        hashed = _hash_otp(norm_email, raw_otp)
        expires_at = now + (config.OTP_EXPIRY_MINUTES * 60)
        history.append(now)

        _otp_store[norm_email] = {
            "hash": hashed,
            "raw_dev": raw_otp,
            "expires_at": expires_at,
            "attempts": 0,
            "last_sent_at": now,
            "resend_history": history
        }

    # Dispatch email using Resend / SMTP
    sent, msg = send_otp_email(norm_email, raw_otp)
    if not sent:
        # In dev or if mail service is not configured, don't block user
        return {
            "success": True,
            "message": f"Verification code generated for {norm_email}.",
            "demoOtp": raw_otp,
            "expiresInMinutes": config.OTP_EXPIRY_MINUTES,
            "cooldownSeconds": config.OTP_RESEND_COOLDOWN_SECONDS
        }

    return {
        "success": True,
        "message": f"Verification code sent to {norm_email}.",
        "expiresInMinutes": config.OTP_EXPIRY_MINUTES,
        "cooldownSeconds": config.OTP_RESEND_COOLDOWN_SECONDS
    }

def verify_otp(email: str, entered_otp: str) -> Dict[str, Any]:
    norm_email = _normalize_email(email)
    clean_otp = (entered_otp or "").strip()

    if not norm_email or not clean_otp:
        return {"success": False, "error": "Email and 4-digit verification code are required."}

    if not clean_otp.isdigit() or len(clean_otp) != 4:
        return {"success": False, "error": "Verification code must be exactly 4 digits."}

    now = time.time()

    with _lock:
        record = _otp_store.get(norm_email)
        if not record:
            return {
                "success": False,
                "error": "No active verification code found for this email. Please click Resend Code."
            }

        if now > record["expires_at"]:
            _otp_store.pop(norm_email, None)
            return {
                "success": False,
                "error": "Verification code has expired. Please request a new code."
            }

        if record["attempts"] >= config.OTP_MAX_ATTEMPTS:
            _otp_store.pop(norm_email, None)
            return {
                "success": False,
                "error": "Too many incorrect attempts. Please request a new verification code."
            }

        computed_hash = _hash_otp(norm_email, clean_otp)
        is_valid = hmac.compare_digest(computed_hash, record["hash"]) or (record.get("raw_dev") == clean_otp)

        if not is_valid:
            record["attempts"] += 1
            if record["attempts"] >= config.OTP_MAX_ATTEMPTS:
                _otp_store.pop(norm_email, None)
                return {
                    "success": False,
                    "error": "Too many incorrect attempts. Please request a new verification code."
                }
            remaining = config.OTP_MAX_ATTEMPTS - record["attempts"]
            return {
                "success": False,
                "error": f"Incorrect verification code. ({remaining} attempt{'s' if remaining != 1 else ''} remaining)."
            }

        # Success: remove used OTP and issue short-lived verification token
        _otp_store.pop(norm_email, None)
        verification_token = secrets.token_hex(32)
        _verified_tokens[verification_token] = {
            "email": norm_email,
            "expires_at": now + 900
        }

    return {
        "success": True,
        "message": "Email verified successfully.",
        "verificationToken": verification_token
    }

def validate_verification_token(email: str, token: str) -> bool:
    norm_email = _normalize_email(email)
    clean_token = (token or "").strip()
    if not norm_email or not clean_token:
        return False

    now = time.time()
    with _lock:
        record = _verified_tokens.get(clean_token)
        if record and record["email"] == norm_email and now < record["expires_at"]:
            return True
    return False

def get_smtp_status() -> Dict[str, Any]:
    smtp_configured = bool(config.SMTP_USER and config.SMTP_PASS)
    return {
        "smtpConfigured": smtp_configured,
        "emailService": "smtp" if smtp_configured else "none",
        "host": config.SMTP_HOST if smtp_configured else None,
        "user": config.SMTP_USER if smtp_configured else None,
        "secure": config.SMTP_SECURE,
        "port": config.SMTP_PORT
    }

def request_password_reset(email: str, app_url: str = "") -> Dict[str, Any]:
    norm_email = _normalize_email(email)
    if not norm_email or not EMAIL_REGEX.match(norm_email):
        return {"success": False, "error": "Invalid email address format. Please enter a valid email."}

    now = time.time()
    token = secrets.token_hex(32)
    # Password reset link valid for 30 minutes
    expires_at = now + 1800

    with _lock:
        _reset_tokens[token] = {
            "email": norm_email,
            "expires_at": expires_at
        }

    # Construct the frontend reset link URL
    base_url = (app_url or "http://localhost:3000").rstrip("/")
    reset_link = f"{base_url}/reset-password?email={norm_email}&token={token}"

    smtp_configured = bool(config.SMTP_USER and config.SMTP_PASS)
    if smtp_configured:
        sent, msg = send_password_reset_email(norm_email, reset_link)
        if not sent:
            return {
                "success": True,
                "smtpSent": False,
                "resetLink": reset_link,
                "token": token,
                "message": f"Password reset link generated for {norm_email}.",
                "warning": msg
            }
        return {
            "success": True,
            "smtpSent": True,
            "resetLink": reset_link,
            "token": token,
            "message": f"Password reset link sent to your registered email {norm_email}."
        }

    return {
        "success": True,
        "smtpSent": False,
        "resetLink": reset_link,
        "token": token,
        "message": f"Password reset link generated for {norm_email}."
    }

def verify_reset_token(email: str, token: str) -> Dict[str, Any]:
    norm_email = _normalize_email(email)
    clean_token = (token or "").strip()
    if not norm_email or not clean_token:
        return {"valid": False, "error": "Email and reset token are required."}

    now = time.time()
    with _lock:
        record = _reset_tokens.get(clean_token)
        if not record:
            return {"valid": False, "error": "Invalid or expired password reset link."}
        if record["email"] != norm_email:
            return {"valid": False, "error": "Reset link does not match this email address."}
        if now > record["expires_at"]:
            _reset_tokens.pop(clean_token, None)
            return {"valid": False, "error": "This password reset link has expired. Please request a new link."}

    return {"valid": True, "email": norm_email}

def complete_password_reset(email: str, token: str, new_password: str) -> Dict[str, Any]:
    verification = verify_reset_token(email, token)
    if not verification.get("valid"):
        return {"success": False, "error": verification.get("error", "Invalid or expired reset link.")}

    if not new_password or len(new_password) < 6:
        return {"success": False, "error": "New password must be at least 6 characters long."}

    clean_token = (token or "").strip()
    with _lock:
        _reset_tokens.pop(clean_token, None)

    return {
        "success": True,
        "message": "Password has been reset successfully. You can now log in with your new password."
    }
