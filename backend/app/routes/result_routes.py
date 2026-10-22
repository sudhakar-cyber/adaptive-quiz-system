from typing import Any, Dict
from fastapi import APIRouter, Depends

from app.controllers import quiz_controller
from app.controllers import analytics_controller
from app.middleware.auth_middleware import get_current_user_from_token
from app.middleware.role_check import require_authenticated, require_educator_or_admin

router = APIRouter(prefix="/api/results", tags=["Results & Analytics"])


@router.get("/submissions")
def get_submissions(current_user: Dict[str, Any] = Depends(require_authenticated)):
    """
    Returns submissions, scoped by the caller's role:

    Students  -> only their own submissions.
    Educators -> attempts on their own quizzes plus attempts by their cohort.
    Admins    -> every submission on the platform.
    """
    role = (current_user.get("role") or "student").lower()
    return quiz_controller.get_all_submissions(role=role, current_user=current_user)


@router.get("/analytics")
def get_analytics_metrics(current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    """Role-scoped analytics computed from stored database submissions."""
    return analytics_controller.compute_analytics(current_user)
