from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.db import get_connection
from app.middleware.role_check import require_authenticated, require_educator_or_admin
from app.controllers import tracking_controller
from app.notifications import notification_service

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


class FeedbackRequest(BaseModel):
    quizId: str
    quizTitle: Optional[str] = None
    studentName: Optional[str] = None
    studentEmail: Optional[str] = None
    clarityRating: Optional[int] = 0
    difficultyRating: Optional[int] = 0
    educatorRating: Optional[int] = 0
    comments: Optional[str] = ""

    class Config:
        extra = "allow"


def _serialize(row: Dict[str, Any]) -> Dict[str, Any]:
    created_at = row.get("created_at")
    return {
        "id": row.get("id"),
        "quizId": row.get("quiz_id"),
        "studentId": row.get("student_id"),
        "studentName": row.get("student_name"),
        "studentEmail": row.get("student_email"),
        "clarityRating": int(row.get("clarity_rating") or 0),
        "difficultyRating": int(row.get("difficulty_rating") or 0),
        "educatorRating": int(row.get("educator_rating") or 0),
        "comments": row.get("comments") or "",
        "date": created_at.strftime("%b %d, %Y") if hasattr(created_at, "strftime") else str(created_at or ""),
        "createdAt": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at or ""),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def submit_feedback(
    req: FeedbackRequest,
    current_user: Dict[str, Any] = Depends(require_authenticated),
):
    """
    Stores the feedback of a student for a quiz in MySQL and notifies the
    educator who authored the quiz.
    """
    quiz_id = (req.quizId or "").strip()
    if not quiz_id:
        raise HTTPException(status_code=400, detail="A quiz is required.")

    student_id = current_user.get("id") or current_user.get("uid")
    student_email = (current_user.get("email") or req.studentEmail or "").strip().lower()
    student_name = (current_user.get("name") or req.studentName or "Student").strip()

    with get_connection() as conn:
        quiz_row = conn.execute(
            "SELECT id, title, author_id, author_name, status FROM quizzes WHERE id = ?",
            (quiz_id,),
        ).fetchone()

        if not quiz_row:
            raise HTTPException(status_code=404, detail="Quiz not found.")

        feedback_id = f"fb-{quiz_id}-{student_id or 'anon'}-{int(datetime.now().timestamp())}"
        conn.execute(
            """
            INSERT INTO quiz_feedback (
                id, quiz_id, student_id, student_name, student_email,
                clarity_rating, difficulty_rating, educator_rating, comments, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                clarity_rating = VALUES(clarity_rating),
                difficulty_rating = VALUES(difficulty_rating),
                educator_rating = VALUES(educator_rating),
                comments = VALUES(comments),
                created_at = CURRENT_TIMESTAMP
            """,
            (
                feedback_id,
                quiz_id,
                student_id,
                student_name,
                student_email,
                int(req.clarityRating or 0),
                int(req.difficultyRating or 0),
                int(req.educatorRating or 0),
                (req.comments or "").strip(),
            ),
        )

        # The educator who authored the quiz is informed about the feedback.
        author_id = quiz_row["author_id"] or ""
        author_name = quiz_row["author_name"] or ""
        recipients: List[Dict[str, Any]] = []
        if author_id or author_name:
            cur = conn.execute(
                "SELECT id, name, email, role FROM users WHERE role = 'educator' AND is_active = 1 "
                "AND (id = ? OR LOWER(name) = LOWER(?))",
                (author_id, author_name),
            )
            recipients = [dict(r) for r in cur.fetchall()]

        notification_service.broadcast_notification(
            conn,
            recipients,
            title=f"Quiz Feedback: {quiz_row['title']}",
            message=(
                f"{student_name} rated '{quiz_row['title']}' with "
                f"{int(req.clarityRating or 0)}/5 stars: \"{(req.comments or '')[:80]}\""
            ),
            category="feedback",
            link="/educator-dashboard",
            entity_type="feedback",
            entity_id=feedback_id,
            actor=current_user,
        )

        notification_service.log_activity(
            conn,
            current_user,
            action="feedback.submitted",
            entity_type="feedback",
            entity_id=feedback_id,
            summary=f"{student_name} reviewed '{quiz_row['title']}'",
            metadata={"quizId": quiz_id, "clarityRating": int(req.clarityRating or 0)},
        )
        conn.commit()

    return {"success": True, "id": feedback_id, "quizId": quiz_id}


@router.get("")
def list_feedback(
    quizId: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_educator_or_admin),
):
    """Returns the feedback of the quizzes the educator owns (admins see all)."""
    role = (current_user.get("role") or "educator").lower()

    with get_connection() as conn:
        params: List[Any] = []
        where = "1 = 1"

        if role == "educator":
            quiz_ids = tracking_controller.educator_quiz_ids(conn, current_user)
            if not quiz_ids:
                return {"feedback": []}
            placeholders = ", ".join(["?"] * len(quiz_ids))
            where += f" AND quiz_id IN ({placeholders})"
            params.extend(quiz_ids)
        elif quizId:
            where += " AND quiz_id = ?"
            params.append(quizId)

        cur = conn.execute(
            f"SELECT * FROM quiz_feedback WHERE {where} ORDER BY created_at DESC LIMIT 200",
            tuple(params),
        )
        rows = [_serialize(dict(r)) for r in cur.fetchall()]

    return {"feedback": rows}
