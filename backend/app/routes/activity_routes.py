import json
import logging
from typing import Any, Dict, List
from fastapi import APIRouter, Depends

from app.db import get_connection
from app.middleware.auth_middleware import get_current_user_from_token
from app.middleware.role_check import require_authenticated
from app.controllers import tracking_controller

logger = logging.getLogger("activity_routes")
router = APIRouter(prefix="/api/activity", tags=["Activity"])


@router.get("")
def get_activity(
    limit: int = 40,
    current_user: Dict[str, Any] = Depends(require_authenticated),
):
    """
    The connected activity feed.

    Admins see every event on the platform. Educators see events that touch
    their quizzes or their cohort. Students see their own events.
    """
    role = (current_user.get("role") or "student").lower()
    user_id = current_user.get("id") or current_user.get("uid")

    with get_connection() as conn:
        clauses: List[str] = []
        params: List[Any] = []

        if role == "admin":
            pass
        elif role == "educator":
            quiz_ids = tracking_controller.educator_quiz_ids(conn, current_user)
            cohort = tracking_controller.educator_cohort_ids(conn, current_user)
            scope_parts = []
            if quiz_ids:
                placeholders = ", ".join(["?"] * len(quiz_ids))
                scope_parts.append(f"entity_id IN ({placeholders})")
                params.extend(quiz_ids)
            if cohort:
                placeholders = ", ".join(["?"] * len(cohort))
                scope_parts.append(f"actor_id IN ({placeholders})")
                params.extend(cohort)
                scope_parts.append(f"entity_id IN ({placeholders})")
                params.extend(cohort)
            scope_parts.append("actor_id = ?")
            params.append(user_id)
            if scope_parts:
                clauses.append("(" + " OR ".join(scope_parts) + ")")
        else:
            clauses.append("(actor_id = ? OR entity_id = ?)")
            params.extend([user_id, user_id])

        where = " AND ".join(clauses) if clauses else "1=1"
        params.append(max(1, min(int(limit or 40), 200)))

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
