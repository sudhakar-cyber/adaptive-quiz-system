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


config = Config()
