import re
import time
import secrets
import hashlib
import hmac
import threading
from typing import Dict, Any, Optional
from config import config
from app.utils.email_service import send_otp_email

# In-memory thread-safe storage for OTP state and verification tickets
_lock = threading.Lock()

# Format:
# _otp_store[normalized_email] = {
#     "hash": str,
#     "expires_at": float,
#     "attempts": int,
#     "last_sent_at": float,
#     "resend_history": list[float]
# }
_otp_store: Dict[str, Dict[str, Any]] = {}

# Format:
# _verified_tokens[token_hex] = {
#     "email": str,
#     "expires_at": float
# }
_verified_tokens: Dict[str, Dict[str, Any]] = {}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()

def _hash_otp(email: str, otp: str) -> str:
    salt = config.OTP_SECRET_SALT
    data = f"{salt}:{email}:{otp}".encode("utf-8")
    return hashlib.sha256(data).hexdigest()

def request_otp(email: str) -> Dict[str, Any]:
    norm_email = _normalize_email(email)
    if not norm_email or not EMAIL_REGEX.match(norm_email):
        return {"success": False, "error": "Invalid email address format. Please enter a valid email."}

    now = time.time()

    with _lock:
        existing = _otp_store.get(norm_email)
        if existing:
            # Check resend cooldown
            time_since_last = now - existing.get("last_sent_at", 0)
            cooldown = config.OTP_RESEND_COOLDOWN_SECONDS
            if time_since_last < cooldown:
                remaining = int(cooldown - time_since_last)
                return {
                    "success": False,
                    "error": f"Please wait {remaining} seconds before requesting a new verification code.",
                    "cooldownRemaining": remaining
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

        # Generate a secure 6-digit numeric OTP (100000 - 999999)
        raw_otp = f"{secrets.randbelow(900000) + 100000}"
        hashed = _hash_otp(norm_email, raw_otp)
        expires_at = now + (config.OTP_EXPIRY_MINUTES * 60)
        history.append(now)

        # Store only hashed OTP with expiration time
        _otp_store[norm_email] = {
            "hash": hashed,
            "expires_at": expires_at,
            "attempts": 0,
            "last_sent_at": now,
            "resend_history": history
        }

    # Dispatch the real email via SMTP
    sent, msg = send_otp_email(norm_email, raw_otp)
    if not sent:
        # If sending failed, clean up the pending OTP to avoid locking the user
        with _lock:
            _otp_store.pop(norm_email, None)
        return {"success": False, "error": msg}

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
        return {"success": False, "error": "Email and 6-digit verification code are required."}

    if not clean_otp.isdigit() or len(clean_otp) != 6:
        return {"success": False, "error": "Verification code must be exactly 6 digits."}

    now = time.time()

    with _lock:
        record = _otp_store.get(norm_email)
        if not record:
            return {
                "success": False,
                "error": "No active verification code found for this email. Please click Resend Code."
            }

        # Check expiration
        if now > record["expires_at"]:
            _otp_store.pop(norm_email, None)
            return {
                "success": False,
                "error": "Verification code has expired. Please request a new code."
            }

        # Check max attempts limit
        if record["attempts"] >= config.OTP_MAX_ATTEMPTS:
            _otp_store.pop(norm_email, None)
            return {
                "success": False,
                "error": "Too many incorrect attempts. Please request a new verification code."
            }

        # Verify hash in constant time
        computed_hash = _hash_otp(norm_email, clean_otp)
        is_valid = hmac.compare_digest(computed_hash, record["hash"])

        if not is_valid:
            record["attempts"] += 1
            remaining = config.OTP_MAX_ATTEMPTS - record["attempts"]
            return {
                "success": False,
                "error": f"Incorrect verification code. ({remaining} attempt{'s' if remaining != 1 else ''} remaining)."
            }

        # Success: remove used OTP and issue a short-lived verification token (15 mins)
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
    configured = bool(config.SMTP_USER and config.SMTP_PASS)
    return {
        "smtpConfigured": configured,
        "host": config.SMTP_HOST if configured else None,
        "user": config.SMTP_USER if configured else None,
        "secure": config.SMTP_SECURE,
        "port": config.SMTP_PORT
    }
