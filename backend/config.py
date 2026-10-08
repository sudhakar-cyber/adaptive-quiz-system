import os
from dotenv import load_dotenv

# Load .env from backend directory or root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

class Config:
    PORT = int(os.getenv("PORT", 5000))
    
    # SMTP Email Configuration
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_SECURE = os.getenv("SMTP_SECURE", "false").lower() in ("true", "1", "yes")
    SMTP_USER = os.getenv("SMTP_USER", "").strip()
    SMTP_PASS = os.getenv("SMTP_PASS", "").strip()
    SMTP_FROM = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "LearnSmart Adaptive Quiz <noreply@learnsmart.edu>")).strip()
    # Resend API Configuration
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
    RESEND_FROM = os.getenv("RESEND_FROM", "LearnSmart <onboarding@resend.dev>").strip()

    # Security & Rate Limiting Settings
    OTP_SECRET_SALT = os.getenv("OTP_SECRET_SALT", "learnsmart_adaptive_quiz_secret_salt_2026_xyz").strip()
    OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", 10))
    OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", 60))
    OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", 5))
    OTP_MAX_HOURLY_RESENDS = int(os.getenv("OTP_MAX_HOURLY_RESENDS", 5))


config = Config()
