from typing import Any, Dict
from fastapi import APIRouter, Depends

from app.controllers import analytics_controller
from app.middleware.auth_middleware import get_current_user_from_token
from app.middleware.role_check import require_authenticated, require_educator_or_admin, require_roles

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

require_student_only = require_roles(["student"])


@router.get("/overview")
def get_overview(current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    """Stat-card numbers for the admin and educator dashboards, scoped by role."""
    return analytics_controller.compute_overview(current_user)


@router.get("/growth")
def get_growth(
    timeframe: str = "6 Months",
    current_user: Dict[str, Any] = Depends(require_educator_or_admin),
):
    """Real account growth derived from users.created_at."""
    return {"points": analytics_controller.compute_growth(current_user, timeframe), "timeframe": timeframe}


@router.get("/categories")
def get_categories(current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    """Quiz counts per category for the caller's visible quizzes."""
    return {"categories": analytics_controller.compute_category_distribution(current_user)}


@router.get("/student-benchmark")
def get_student_benchmark(current_user: Dict[str, Any] = Depends(require_student_only)):
    """Anonymised class benchmark (average + spread) for the signed-in student."""
    return analytics_controller.compute_student_benchmark(current_user)


@router.get("")
def get_analytics(current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    """Full role-scoped analytics payload."""
    return analytics_controller.compute_analytics(current_user)
