import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.db import get_connection
from app.middleware.auth_middleware import get_current_user_from_token
from app.middleware.role_check import require_authenticated, require_educator_or_admin
from app.controllers import tracking_controller
from app.notifications import notification_service

logger = logging.getLogger("notification_routes")
router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class SendNotificationRequest(BaseModel):
    title: str
    message: str = ""
    category: str = "general"
    recipientType: str = "all"          # 'student' | 'educator' | 'admin' | 'all'
    recipientId: Optional[str] = None
    link: Optional[str] = None


def _recipient_rows(conn, recipient_type: str, current_user: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Resolves who a sender is allowed to notify."""
    role = (current_user.get("role") or "").lower()

    if role == "admin":
        if recipient_type == "student":
            cur = conn.execute("SELECT id, name, email, role FROM users WHERE role = 'student' AND is_active = 1")
        elif recipient_type == "educator":
            cur = conn.execute("SELECT id, name, email, role FROM users WHERE role = 'educator' AND is_active = 1")
        elif recipient_type == "admin":
            cur = conn.execute("SELECT id, name, email, role FROM users WHERE role = 'admin' AND is_active = 1")
        else:
            cur = conn.execute("SELECT id, name, email, role FROM users WHERE is_active = 1")
        return [dict(r) for r in cur.fetchall()]

    # Educators may only notify their own cohort students.
    cohort = tracking_controller.educator_cohort_ids(conn, current_user)
    if not cohort:
        cur = conn.execute("SELECT id, name, email, role FROM users WHERE role = 'student' AND is_active = 1")
        return [dict(r) for r in cur.fetchall()]
    placeholders = ", ".join(["?"] * len(cohort))
    cur = conn.execute(
        f"SELECT id, name, email, role FROM users WHERE id IN ({placeholders}) AND role = 'student'",
        tuple(cohort),
    )
    return [dict(r) for r in cur.fetchall()]


@router.get("")
def list_notifications(
    limit: int = 50,
    unread_only: bool = False,
    current_user: Dict[str, Any] = Depends(require_authenticated),
):
    """Returns the notifications addressed to the signed-in account."""
    recipient_id = current_user.get("id") or current_user.get("uid")
    with get_connection() as conn:
        where = "recipient_id = ?"
        params: List[Any] = [recipient_id]
        if unread_only:
            where += " AND is_read = 0"
        params.append(max(1, min(int(limit or 50), 200)))
        cur = conn.execute(
            f"SELECT * FROM notifications WHERE {where} ORDER BY created_at DESC LIMIT ?",
            tuple(params),
        )
        rows = [notification_service.serialize_notification(dict(r)) for r in cur.fetchall()]

        unread_cur = conn.execute(
            "SELECT COUNT(*) AS c FROM notifications WHERE recipient_id = ? AND is_read = 0",
            (recipient_id,),
        )
        unread_row = unread_cur.fetchone()
        unread = int(unread_row["c"]) if unread_row else 0

        return {"notifications": rows, "unreadCount": unread, "total": len(rows)}


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(require_authenticated),
):
    recipient_id = current_user.get("id") or current_user.get("uid")
    with get_connection() as conn:
        cur = conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?",
            (notification_id, recipient_id),
        )
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Notification not found.")
        return {"success": True, "id": notification_id, "isRead": True}


@router.post("/read-all")
def mark_all_notifications_read(current_user: Dict[str, Any] = Depends(require_authenticated)):
    recipient_id = current_user.get("id") or current_user.get("uid")
    with get_connection() as conn:
        cur = conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE recipient_id = ? AND is_read = 0",
            (recipient_id,),
        )
        conn.commit()
        return {"success": True, "updated": cur.rowcount}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(require_authenticated),
):
    recipient_id = current_user.get("id") or current_user.get("uid")
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM notifications WHERE id = ? AND recipient_id = ?",
            (notification_id, recipient_id),
        )
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Notification not found.")
        return {"success": True, "id": notification_id}


@router.post("", status_code=status.HTTP_201_CREATED)
def send_notification(
    req: SendNotificationRequest,
    current_user: Dict[str, Any] = Depends(require_educator_or_admin),
):
    """
    Sends a notification to students or educators.

    Admins may reach anyone. Educators may only reach their own cohort.
    """
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="A title is required.")

    recipient_type = (req.recipientType or "all").strip().lower()
    if recipient_type not in ("student", "educator", "admin", "all"):
        raise HTTPException(status_code=400, detail="Invalid recipientType.")

    with get_connection() as conn:
        if req.recipientId:
            cur = conn.execute(
                "SELECT id, name, email, role FROM users WHERE id = ? OR LOWER(email) = LOWER(?)",
                (req.recipientId, req.recipientId),
            )
            row = cur.fetchone()
            recipients = [dict(row)] if row else []
        else:
            recipients = _recipient_rows(conn, recipient_type, current_user)

        if not recipients:
            raise HTTPException(status_code=404, detail="No matching recipients found.")

        created = notification_service.broadcast_notification(
            conn,
            recipients,
            title=req.title.strip(),
            message=req.message,
            category=req.category or "general",
            link=req.link,
            entity_type="broadcast",
            entity_id=None,
            actor=current_user,
        )
        notification_service.log_activity(
            conn,
            current_user,
            action="notification.sent",
            entity_type="notification",
            entity_id=None,
            summary=f"{current_user.get('name')} sent '{req.title}' to {created} recipient(s)",
            metadata={"recipientType": recipient_type, "count": created},
        )

        # The sender keeps a copy of the broadcast in their own centre, so the
        # "sent" history lives in MySQL as well.
        notification_service.create_notification(
            conn,
            recipient_id=current_user.get("id") or current_user.get("uid"),
            recipient_role=(current_user.get("role") or "educator"),
            title=f"Sent: {req.title.strip()}",
            message=f"Delivered to {created} recipient(s): \"{req.message}\"",
            category="sent",
            link=req.link,
            entity_type="broadcast",
            entity_id=None,
            actor=current_user,
        )
        conn.commit()

        return {
            "success": True,
            "sent": created,
            "recipients": [r.get("email") for r in recipients],
        }
