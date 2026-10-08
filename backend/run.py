import sys
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure the backend root is in Python sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import config
from app.routes.auth_routes import router as auth_router

app = FastAPI(
    title="LearnSmart Adaptive Quiz System - Auth & OTP Backend",
    description="Backend service providing real email OTP generation, secure hashing, and verification.",
    version="1.0.0"
)

# Enable CORS for frontend Vite dev server (port 3000, 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth_router)

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "LearnSmart Auth API",
        "port": config.PORT,
        "resend_configured": bool(config.RESEND_API_KEY),
        "smtp_configured": bool(config.SMTP_USER and config.SMTP_PASS)
    }

if __name__ == "__main__":
    port = config.PORT
    print(f"Starting LearnSmart Backend on http://127.0.0.1:{port}")
    uvicorn.run("run:app", host="0.0.0.0", port=port, reload=True)
