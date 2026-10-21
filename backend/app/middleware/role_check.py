from typing import List, Callable, Dict, Any
from fastapi import Depends, HTTPException, status
from app.middleware.auth_middleware import get_current_user_from_token

def require_roles(allowed_roles: List[str]) -> Callable:
    """
    Returns a FastAPI dependency that verifies the authenticated user has one of the allowed roles.
    Raises HTTP 403 Forbidden if user's role is not authorized.
    """
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user_from_token)) -> Dict[str, Any]:
        user_role = (current_user.get("role") or "student").lower()
        normalized_allowed = [r.lower() for r in allowed_roles]

        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles} roles. Your role is '{user_role}'."
            )
        return current_user

    return role_checker

# Predefined role dependencies
require_student = require_roles(["student", "educator", "admin"])
require_educator_or_admin = require_roles(["educator", "admin"])
require_admin = require_roles(["admin"])
