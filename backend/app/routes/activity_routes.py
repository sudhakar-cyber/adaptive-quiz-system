import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.db import get_connection
from app.middleware.auth_middleware import get_current_user_from_token
from app.middleware.role_check import require_authenticated
from app.controllers import tracking_controller
from app.notifications import notification_service

logger = logging.getLogger("activity_routes")
router = APIRouter(prefix="/api/activity", tags=["Activity"])


class LogActivityRequest(BaseModel):
    action: str
    entity_type: Optional[str] = "quiz"
    entity_id: Optional[str] = None
    summary: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None

    class Config:
        extra = "allow"


@router.post("", status_code=status.HTTP_201_CREATED)
def record_activity(
    req: LogActivityRequest,
    current_user: Dict[str, Any] = Depends(require_authenticated),
):
    """
    Record an activity event directly into MySQL activity_log.
    Used by student and dashboard frontend for instant live telemetry (e.g. quiz started, milestone reached, session events).
    """
    actor_id = req.student_id or current_user.get("id") or current_user.get("uid") or ""
    actor_name = req.student_name or current_user.get("name") or "Student"
    actor_role = (current_user.get("role") or "student").lower()

    with get_connection() as conn:
        notification_service.log_activity(
            conn,
            actor={"id": actor_id, "name": actor_name, "role": actor_role},
            action=req.action,
            entity_type=req.entity_type,
            entity_id=req.entity_id,
            summary=req.summary or f"{actor_name} performed {req.action}",
            metadata=req.metadata,
        )
        conn.commit()

    return {"success": True, "message": "Activity recorded successfully."}


@router.get("")
def get_activity(
    limit: int = 50,
    action: Optional[str] = None,
    student_id: Optional[str] = None,
    role_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_authenticated),
):
    """
    The connected activity feed.

    Admins see every event on the platform. Educators see student events, events that touch
    their quizzes, or their cohort. Students see their own events.
    """
    role = (current_user.get("role") or "student").lower()
    user_id = current_user.get("id") or current_user.get("uid")

    with get_connection() as conn:
        clauses: List[str] = []
        params: List[Any] = []

        if role == "admin":
            # Admins monitor all platform activity across all students and educators
            pass
        elif role == "educator":
            # Educators monitor student activities, plus events on their authored quizzes, plus their own actions
            quiz_ids = tracking_controller.educator_quiz_ids(conn, current_user)
            cohort_idents = tracking_controller.educator_cohort_identifiers(conn, current_user)
            scope_parts = ["actor_role = 'student'"]
            if quiz_ids:
                placeholders = ", ".join(["?"] * len(quiz_ids))
                scope_parts.append(f"entity_id IN ({placeholders})")
                params.extend(quiz_ids)
            if cohort_idents:
                placeholders = ", ".join(["?"] * len(cohort_idents))
                scope_parts.append(f"actor_id IN ({placeholders})")
                params.extend(cohort_idents)
                scope_parts.append(f"entity_id IN ({placeholders})")
                params.extend(cohort_idents)
            scope_parts.append("actor_id = ?")
            params.append(user_id)
            clauses.append("(" + " OR ".join(scope_parts) + ")")
        else:
            # Student sees their own activity
            user_name = (current_user.get("name") or "").strip()
            name_norm = user_name.replace(" ", "").lower()
            user_email = (current_user.get("email") or "").strip().lower()
            clauses.append("""(
                actor_id = ? OR entity_id = ?
                OR LOWER(actor_name) = LOWER(?)
                OR REPLACE(LOWER(actor_name), ' ', '') = ?
                OR actor_name LIKE ?
                OR (metadata LIKE ? AND metadata IS NOT NULL)
                OR (metadata LIKE ? AND metadata IS NOT NULL)
            )""")
            params.extend([
                user_id, user_id,
                user_name, name_norm,
                f"%{user_name}%",
                f"%{user_id}%",
                f"%{user_email}%" if user_email else "%"
            ])

        if student_id and str(student_id).strip().lower() not in ("null", "undefined", "none", ""):
            sid = str(student_id).strip()
            sid_norm = sid.replace(" ", "").lower()
            clauses.append("""(
                actor_id = ? OR entity_id = ?
                OR LOWER(actor_name) = LOWER(?)
                OR REPLACE(LOWER(actor_name), ' ', '') = ?
                OR actor_name LIKE ?
                OR (metadata LIKE ? AND metadata IS NOT NULL)
            )""")
            params.extend([sid, sid, sid, sid_norm, f"%{sid}%", f"%{sid}%"])

        if action:
            clauses.append("action = ?")
            params.append(action)

        if role_filter:
            clauses.append("actor_role = ?")
            params.append(role_filter)

        if search and search.strip():
            pat = f"%{search.strip()}%"
            clauses.append("(actor_name LIKE ? OR summary LIKE ? OR action LIKE ?)")
            params.extend([pat, pat, pat])

        where = " AND ".join(clauses) if clauses else "1=1"
        params.append(max(1, min(int(limit or 50), 250)))

        cur = conn.execute(
            f"""
            SELECT id, actor_id, actor_name, actor_role, action, entity_type,
                   entity_id, summary, metadata, created_at
            FROM activity_log
            WHERE {where}
            ORDER BY created_at DESC, id DESC
            LIMIT ?
            """,
            tuple(params),
        )

        entries = []
        for row in cur.fetchall():
            item = dict(row)
            metadata = item.get("metadata")
            if isinstance(metadata, str):
                try:
                    metadata = json.loads(metadata)
                except (ValueError, TypeError):
                    metadata = None
            created = item.get("created_at")
            entries.append({
                "id": item.get("id"),
                "actorId": item.get("actor_id"),
                "actorName": item.get("actor_name"),
                "actorRole": item.get("actor_role"),
                "action": item.get("action"),
                "entityType": item.get("entity_type"),
                "entityId": item.get("entity_id"),
                "summary": item.get("summary"),
                "metadata": metadata,
                "createdAt": created.isoformat() if hasattr(created, "isoformat") else str(created or ""),
            })

        return {"entries": entries, "total": len(entries)}
