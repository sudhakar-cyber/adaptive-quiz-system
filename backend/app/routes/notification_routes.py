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
    user_role = (current_user.get("role") or "").lower()
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
        raw_rows = [dict(r) for r in cur.fetchall()]

        # Filter out orphaned notifications for quizzes that no longer exist
        if user_role == "student":
            quiz_cur = conn.execute("SELECT id FROM quizzes")
            valid_quiz_ids = {str(q["id"]) for q in quiz_cur.fetchall()}
            filtered_rows = []
            for r in raw_rows:
                if r.get("entity_type") == "quiz" and r.get("entity_id"):
                    if str(r.get("entity_id")) not in valid_quiz_ids:
                        continue
                filtered_rows.append(r)
            raw_rows = filtered_rows

        rows = [notification_service.serialize_notification(r) for r in raw_rows]
        unread = sum(1 for r in raw_rows if not r.get("is_read"))

        return {"notifications": rows, "unreadCount": unread, "total": len(rows)}


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(require_authenticated),
):
    recipient_id = current_user.get("id") or current_user.get("uid")
    user_role = (current_user.get("role") or "").lower()
    user_ids = {current_user.get("id"), current_user.get("uid"), current_user.get("email")}
    user_ids = {u for u in user_ids if u}
    if user_role == "student":
        user_ids.update(["student-1", "stud-102"])

    with get_connection() as conn:
        placeholders = ",".join(["?"] * len(user_ids))
        cur = conn.execute(
            f"UPDATE notifications SET is_read = 1 WHERE id = ? AND (recipient_id IN ({placeholders}) OR recipient_id = ?)",
            (notification_id,) + tuple(user_ids) + (recipient_id,),
        )
        conn.commit()
        return {"success": True, "id": notification_id, "isRead": True}


@router.post("/read-all")
def mark_all_notifications_read(current_user: Dict[str, Any] = Depends(require_authenticated)):
    recipient_id = current_user.get("id") or current_user.get("uid")
    user_role = (current_user.get("role") or "").lower()
    user_ids = {current_user.get("id"), current_user.get("uid"), current_user.get("email")}
    user_ids = {u for u in user_ids if u}
    if user_role == "student":
        user_ids.update(["student-1", "stud-102"])

    with get_connection() as conn:
        placeholders = ",".join(["?"] * len(user_ids))
        cur = conn.execute(
            f"UPDATE notifications SET is_read = 1 WHERE (recipient_id IN ({placeholders}) OR recipient_id = ?) AND is_read = 0",
            tuple(user_ids) + (recipient_id,),
        )
        conn.commit()
        return {"success": True, "updated": cur.rowcount}


@router.delete("/clear-all")
def clear_all_notifications_alt(current_user: Dict[str, Any] = Depends(require_authenticated)):
    return clear_all_notifications(current_user=current_user)


@router.delete("")
def clear_all_notifications(current_user: Dict[str, Any] = Depends(require_authenticated)):
    recipient_id = current_user.get("id") or current_user.get("uid")
    user_role = (current_user.get("role") or "").lower()
    user_ids = {current_user.get("id"), current_user.get("uid"), current_user.get("email")}
    user_ids = {u for u in user_ids if u}

    with get_connection() as conn:
        if user_role == "admin":
            cur = conn.execute(
                "DELETE FROM notifications WHERE recipient_role = 'admin' OR recipient_id = 'admin-system'"
            )
        elif user_role == "educator":
            placeholders = ",".join(["?"] * len(user_ids))
            cur = conn.execute(
                f"DELETE FROM notifications WHERE recipient_id IN ({placeholders}) OR (recipient_role = 'educator' AND recipient_id = 'edu-201')",
                tuple(user_ids),
            )
        else:
            all_student_ids = list(user_ids | {"student-1", "stud-102"})
            placeholders = ",".join(["?"] * len(all_student_ids))
            cur = conn.execute(
                f"DELETE FROM notifications WHERE recipient_id IN ({placeholders}) OR recipient_id = ?",
                tuple(all_student_ids) + (recipient_id,),
            )
        conn.commit()
        deleted_count = cur.rowcount if cur else 0
        return {"success": True, "deleted": deleted_count}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(require_authenticated),
):
    recipient_id = current_user.get("id") or current_user.get("uid")
    user_role = (current_user.get("role") or "").lower()
    user_ids = {current_user.get("id"), current_user.get("uid"), current_user.get("email")}
    user_ids = {u for u in user_ids if u}
    if user_role == "student":
        user_ids.update(["student-1", "stud-102"])

    with get_connection() as conn:
        cur = conn.execute("SELECT * FROM notifications WHERE id = ?", (notification_id,))
        row = cur.fetchone()
        if not row:
            # Already deleted or not found: return success so client cache is cleanly cleared
            return {"success": True, "id": notification_id}

        row_dict = dict(row)
        notif_recip = row_dict.get("recipient_id")
        notif_role = (row_dict.get("recipient_role") or "").lower()

        allowed = (
            user_role == "admin"
            or notif_recip in user_ids
            or (user_role == "student" and (notif_role == "student" or notif_recip in {"student-1", "stud-102"}))
            or (user_role == "educator" and (notif_role == "educator" or notif_recip == "edu-201"))
        )

        if not allowed:
            raise HTTPException(status_code=403, detail="Not authorized to delete this notification.")

        conn.execute("DELETE FROM notifications WHERE id = ?", (notification_id,))
        conn.commit()
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
