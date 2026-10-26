from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.controllers import quiz_controller
from app.controllers import analytics_controller
from app.middleware.auth_middleware import get_current_user_from_token
from app.middleware.role_check import (
    require_admin,
    require_authenticated,
    require_educator_or_admin,
    require_roles,
)

router = APIRouter(prefix="/api/quizzes", tags=["Quizzes"])

# Only students submit attempts - educators and admins author quizzes instead.
require_student_role = require_roles(["student"])


class QuestionItem(BaseModel):
    id: Optional[Any] = None
    question: Optional[str] = ""
    options: Optional[List[Any]] = []
    correctIndex: Optional[int] = 0
    explanation: Optional[str] = ""

    class Config:
        extra = "allow"


class CreateQuizRequest(BaseModel):
    id: Optional[str] = None
    title: str
    category: Optional[str] = "General"
    difficulty: Optional[str] = "Medium"
    duration: Optional[str] = "15 mins"
    status: Optional[str] = "Active"
    description: Optional[str] = ""
    isRecommended: Optional[bool] = True
    recommendationReason: Optional[str] = None
    questions: Optional[List[Any]] = []

    class Config:
        extra = "allow"


class AttemptRequest(BaseModel):
    studentName: Optional[str] = None
    studentEmail: Optional[str] = None
    studentId: Optional[str] = None
    answers: Optional[Dict[str, Any]] = {}
    selectedAnswers: Optional[Dict[str, Any]] = {}
    score: Optional[Any] = None
    scorePercentage: Optional[Any] = None
    correctCount: Optional[int] = None
    totalQuestions: Optional[int] = None
    quizTitle: Optional[str] = None
    category: Optional[str] = None

    class Config:
        extra = "allow"


@router.get("")
def list_quizzes(current_user: Dict[str, Any] = Depends(require_authenticated)):
    """
    Returns the quizzes visible to the caller.

    Students  -> published quizzes only.
    Educators -> every published quiz plus the drafts they authored.
    Admins    -> every quiz.
    """
    role = (current_user.get("role") or "student").lower()
    return quiz_controller.get_all_quizzes(role=role, current_user=current_user)


@router.get("/published")
def list_published_quizzes(current_user: Dict[str, Any] = Depends(require_authenticated)):
    """Explicit endpoint returning only published quizzes for students."""
    return quiz_controller.get_all_quizzes(role="student", current_user=current_user)


@router.get("/analytics")
def get_analytics(current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    """Role-scoped analytics computed from stored database submissions."""
    return analytics_controller.compute_analytics(current_user)


@router.get("/{quiz_id}")
def get_quiz_details(quiz_id: str, current_user: Dict[str, Any] = Depends(require_authenticated)):
    role = (current_user.get("role") or "student").lower()
    quiz = quiz_controller.get_quiz_by_id(quiz_id, role=role, current_user=current_user)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found or not published."
        )
    return quiz


@router.post("", status_code=status.HTTP_201_CREATED)
def create_quiz(
    req: CreateQuizRequest,
    current_user: Dict[str, Any] = Depends(require_educator_or_admin)
):
    """Allows educator or admin to create a quiz. Drafts stay drafts, Active become published."""
    return quiz_controller.create_or_upsert_quiz(req.dict(), current_user)


@router.put("/{quiz_id}")
def update_quiz(
    quiz_id: str,
    req: CreateQuizRequest,
    current_user: Dict[str, Any] = Depends(require_educator_or_admin)
):
    """Allows educator or admin to update a quiz they own."""
    data = req.dict()
    data["id"] = quiz_id
    return quiz_controller.create_or_upsert_quiz(data, current_user)


@router.delete("/{quiz_id}")
def remove_quiz(
    quiz_id: str,
    current_user: Dict[str, Any] = Depends(require_educator_or_admin)
):
    """Allows educator or admin to delete a quiz they own."""
    success = quiz_controller.delete_quiz(quiz_id, current_user)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
    return {"success": True, "message": f"Quiz {quiz_id} deleted."}


class StartQuizRequest(BaseModel):
    studentName: Optional[str] = None
    studentEmail: Optional[str] = None
    studentId: Optional[str] = None
    category: Optional[str] = None
    quizTitle: Optional[str] = None

    class Config:
        extra = "allow"


@router.post("/{quiz_id}/start")
def start_quiz_session(
    quiz_id: str,
    req: StartQuizRequest,
    current_user: Dict[str, Any] = Depends(require_authenticated)
):
    """Logs when a student begins taking a quiz and notifies relevant educators."""
    return quiz_controller.start_student_quiz(quiz_id, req.dict(), current_user)


@router.post("/{quiz_id}/attempt")
def submit_quiz_attempt(
    quiz_id: str,
    req: AttemptRequest,
    current_user: Dict[str, Any] = Depends(require_student_role)
):
    """Enforces authentication and records a student quiz attempt with real score calculations."""
    try:
        return quiz_controller.record_student_attempt(quiz_id, req.dict(), current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

