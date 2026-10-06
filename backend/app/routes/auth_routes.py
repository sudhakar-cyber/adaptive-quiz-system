from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.controllers import auth_controller

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class SendOtpRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

class ValidateTokenRequest(BaseModel):
    email: str
    token: str

@router.post("/send-otp")
def send_otp_endpoint(req: SendOtpRequest):
    result = auth_controller.request_otp(req.email)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to send verification code.")
        )
    return result

@router.post("/resend-otp")
def resend_otp_endpoint(req: SendOtpRequest):
    result = auth_controller.request_otp(req.email)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to resend verification code.")
        )
    return result

@router.post("/verify-otp")
def verify_otp_endpoint(req: VerifyOtpRequest):
    result = auth_controller.verify_otp(req.email, req.otp)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Verification failed.")
        )
    return result

@router.post("/validate-token")
def validate_token_endpoint(req: ValidateTokenRequest):
    is_valid = auth_controller.validate_verification_token(req.email, req.token)
    return {"valid": is_valid}

@router.get("/smtp-status")
def smtp_status_endpoint():
    return auth_controller.get_smtp_status()
