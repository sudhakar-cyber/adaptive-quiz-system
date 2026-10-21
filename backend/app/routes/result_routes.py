from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from app.controllers import quiz_controller
from app.middleware.auth_middleware import get_current_user_from_token
from app.middleware.role_check import require_educator_or_admin, require_student

router = APIRouter(prefix="/api/results", tags=["Results & Analytics"])

@router.get("/submissions")
def get_submissions(current_user: Dict[str, Any] = Depends(require_student)):
    """
    Returns submissions. Role-enforced:
    Students receive only their own submissions.
    Educators and Admins receive all cohort submissions.
    """
    role = current_user.get("role", "student")
    return quiz_controller.get_all_submissions(role=role, current_user=current_user)

@router.get("/analytics")
def get_analytics_metrics(current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    """Computes real analytics from database submissions without mock data."""
    return quiz_controller.compute_real_analytics()
