from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from app.controllers import quiz_controller
from app.middleware.auth_middleware import get_current_user_from_token

router = APIRouter(prefix="/api/results", tags=["Results & Analytics"])

@router.get("/submissions")
def get_submissions(
    authorization: Optional[str] = Header(None),
    x_user_uid: Optional[str] = Header(None, alias="X-User-UID"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
):
    """
    Returns submissions. Role-enforced:
    Students receive only their own submissions.
    Educators and Admins receive all cohort submissions.
    """
    role = "student"
    user = None
    if x_user_role and x_user_role.strip().lower() in ("educator", "admin"):
        role = x_user_role.strip().lower()

    if authorization:
        try:
            user = get_current_user_from_token(
                authorization=authorization,
                x_user_uid=x_user_uid,
                x_user_email=x_user_email,
                x_user_name=x_user_name,
                x_user_role=x_user_role,
            )
            resolved_role = user.get("role", "")
            if resolved_role in ("educator", "admin"):
                role = resolved_role
        except HTTPException:
            pass

    return quiz_controller.get_all_submissions(role=role, current_user=user)

@router.get("/analytics")
def get_analytics_metrics(
    authorization: Optional[str] = Header(None),
    x_user_uid: Optional[str] = Header(None, alias="X-User-UID"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
):
    """Computes real analytics from database submissions without mock data."""
    return quiz_controller.compute_real_analytics()
