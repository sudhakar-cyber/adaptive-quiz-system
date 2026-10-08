from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.controllers import auth_controller

router = APIRouter(prefix="/api/auth", tags=["Authentication"])



@router.get("/smtp-status")
def smtp_status_endpoint():
    return auth_controller.get_smtp_status()

class ForgotPasswordRequest(BaseModel):
    email: str
    appUrl: Optional[str] = None

class VerifyResetTokenRequest(BaseModel):
    email: str
    token: str

class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    newPassword: str

@router.post("/request-password-reset")
def request_password_reset_endpoint(req: ForgotPasswordRequest):
    result = auth_controller.request_password_reset(req.email, req.appUrl or "")
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to process password reset request.")
        )
    return result

@router.post("/verify-reset-token")
def verify_reset_token_endpoint(req: VerifyResetTokenRequest):
    result = auth_controller.verify_reset_token(req.email, req.token)
    return result

@router.post("/reset-password")
def reset_password_endpoint(req: ResetPasswordRequest):
    result = auth_controller.complete_password_reset(req.email, req.token, req.newPassword)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to reset password.")
        )
    return result

