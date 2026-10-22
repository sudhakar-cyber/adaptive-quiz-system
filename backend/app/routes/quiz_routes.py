from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from app.controllers import quiz_controller
from app.middleware.auth_middleware import get_current_user_from_token
from app.middleware.role_check import require_educator_or_admin, require_student

router = APIRouter(prefix="/api/quizzes", tags=["Quizzes"])

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
def list_quizzes(
    authorization: Optional[str] = Header(None),
    x_user_uid: Optional[str] = Header(None, alias="X-User-UID"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
):
    """
    Returns published quizzes for students/public, and all quizzes (including drafts) for educators/admins.
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
            role = user.get("role", role)
        except HTTPException:
            pass

    return quiz_controller.get_all_quizzes(role=role, current_user=user)

@router.get("/published")
def list_published_quizzes():
    """Explicit endpoint returning only published quizzes for students."""
    return quiz_controller.get_all_quizzes(role="student")

@router.get("/analytics")
def get_analytics(current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    """Computes real analytics from database submissions without mock data."""
    return quiz_controller.compute_real_analytics()

@router.get("/{quiz_id}")
def get_quiz_details(
    quiz_id: str,
    authorization: Optional[str] = Header(None),
    x_user_uid: Optional[str] = Header(None, alias="X-User-UID"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
):
    role = "student"
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
            role = user.get("role", role)
        except HTTPException:
            pass
    quiz = quiz_controller.get_quiz_by_id(quiz_id, role=role)
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
    """Allows educator or admin to update a quiz."""
    data = req.dict()
    data["id"] = quiz_id
    return quiz_controller.create_or_upsert_quiz(data, current_user)

@router.delete("/{quiz_id}")
def remove_quiz(
    quiz_id: str,
    current_user: Dict[str, Any] = Depends(require_educator_or_admin)
):
    """Allows educator or admin to delete a quiz."""
    success = quiz_controller.delete_quiz(quiz_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
    return {"success": True, "message": f"Quiz {quiz_id} deleted."}

@router.post("/{quiz_id}/attempt")
def submit_quiz_attempt(
    quiz_id: str,
    req: AttemptRequest,
    current_user: Dict[str, Any] = Depends(require_student)
):
    """Enforces authentication and records a student quiz attempt with real score calculations."""
    try:
        return quiz_controller.record_student_attempt(quiz_id, req.dict(), current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
