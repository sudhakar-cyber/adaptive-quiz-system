import re
import time
import secrets
import hashlib
import hmac
import threading
from typing import Dict, Any, Optional
from config import config
from app.utils.email_service import send_password_reset_email

# Thread-safe storage for reset tokens
_lock = threading.Lock()

# Format:
# _reset_tokens[token_hex] = {
#     "email": str,
#     "expires_at": float
# }
_reset_tokens: Dict[str, Dict[str, Any]] = {}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()

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
