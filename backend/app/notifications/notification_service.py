"""
Cross-dashboard tracking service.

Single place where every write that matters to the student, educator and admin
dashboards is recorded, so the three dashboards stay connected to one source of
truth (MySQL):

  * activity_log    -> who did what, visible to admin (platform wide) and to
                       educators for events that touch their own cohort.
  * notifications   -> durable, per-recipient messages with read state, so a
                       student submitting a quiz reaches the educator's queue
                       and survives a browser restart.
"""

import json
import logging
import time
import uuid
from typing import Any, Dict, Iterable, List, Optional

logger = logging.getLogger("tracking.notifications")


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def _actor_fields(actor: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    actor = actor or {}
    return {
        "actor_id": actor.get("id") or actor.get("uid") or actor.get("actor_id"),
        "actor_name": actor.get("name") or actor.get("actor_name"),
        "actor_role": (actor.get("role") or actor.get("actor_role") or "system"),
    }


def log_activity(
    conn,
    actor: Optional[Dict[str, Any]],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    summary: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Appends one entry to the platform activity log. Never raises."""
    try:
        fields = _actor_fields(actor)
        conn.execute(
            """
            INSERT INTO activity_log (
                actor_id, actor_name, actor_role, action,
                entity_type, entity_id, summary, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                fields["actor_id"],
                fields["actor_name"],
                fields["actor_role"],
                action,
                entity_type,
                entity_id,
                (summary or "")[:500] or None,
                json.dumps(metadata) if metadata else None,
            ),
        )
    except Exception as exc:  # pragma: no cover - logging must never break a write
        logger.warning(f"activity_log insert failed for action '{action}': {exc}")


def create_notification(
    conn,
    recipient_id: str,
    recipient_role: str,
    title: str,
    message: str = "",
    category: str = "general",
    link: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    actor: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """Creates one durable notification for a single recipient."""
    if not recipient_id:
        return None
    try:
        notification_id = _new_id("ntf")
        fields = _actor_fields(actor)
        conn.execute(
            """
            INSERT INTO notifications (
                id, recipient_id, recipient_role, title, message, category, link,
                entity_type, entity_id, actor_id, actor_name, actor_role,
                is_read, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
            """,
            (
                notification_id,
                recipient_id,
                (recipient_role or "student").lower(),
                title[:255],
                message,
                category,
                link,
                entity_type,
                entity_id,
                fields["actor_id"],
                fields["actor_name"],
                fields["actor_role"],
            ),
        )
        return notification_id
    except Exception as exc:  # pragma: no cover
        logger.warning(f"notification insert failed for '{title}': {exc}")
        return None


def broadcast_notification(
    conn,
    recipients: Iterable[Dict[str, Any]],
    title: str,
    message: str = "",
    category: str = "general",
    link: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    actor: Optional[Dict[str, Any]] = None,
) -> int:
    """Sends the same notification to many recipients. Returns how many were created."""
    created = 0
    seen = set()
    for recipient in recipients or []:
        if not recipient:
            continue
        rid = recipient.get("id") or recipient.get("uid")
        if not rid or rid in seen:
            continue
        seen.add(rid)
        if create_notification(
            conn,
            recipient_id=rid,
            recipient_role=recipient.get("role", "student"),
            title=title,
            message=message,
            category=category,
            link=link,
            entity_type=entity_type,
            entity_id=entity_id,
            actor=actor,
        ):
            created += 1
    return created


def notify_admins(
    conn,
    title: str,
    message: str = "",
    category: str = "admin",
    link: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    actor: Optional[Dict[str, Any]] = None,
) -> int:
    """Notifies every active admin account."""
    cur = conn.execute(
        "SELECT id, name, email, role FROM users WHERE role = 'admin' AND is_active = 1"
    )
    return broadcast_notification(
        conn,
        [dict(r) for r in cur.fetchall()],
        title=title,
        message=message,
        category=category,
        link=link,
        entity_type=entity_type,
        entity_id=entity_id,
        actor=actor,
    )


def notify_educators_of_quiz(
    conn,
    quiz: Dict[str, Any],
    title: str,
    message: str = "",
    category: str = "quiz",
    link: Optional[str] = None,
    actor: Optional[Dict[str, Any]] = None,
) -> int:
    """Notifies the educator who authored a quiz (plus admins, who oversee all quizzes)."""
    recipients: List[Dict[str, Any]] = []
    author_id = quiz.get("author_id") or quiz.get("authorId")
    author_name = quiz.get("author_name") or quiz.get("authorName")

    if author_id or author_name:
        cur = conn.execute(
            "SELECT id, name, email, role FROM users WHERE role = 'educator' AND is_active = 1 "
            "AND (id = ? OR LOWER(name) = LOWER(?))",
            (author_id or "", author_name or ""),
        )
        recipients.extend(dict(r) for r in cur.fetchall())

    count = broadcast_notification(
        conn,
        recipients,
        title=title,
        message=message,
        category=category,
        link=link,
        entity_type="quiz",
        entity_id=quiz.get("id"),
        actor=actor,
    )
    count += notify_admins(
        conn,
        title=title,
        message=message,
        category=category,
        link=link,
        entity_type="quiz",
        entity_id=quiz.get("id"),
        actor=actor,
    )
    return count


def notify_students_of_quiz(
    conn,
    quiz: Dict[str, Any],
    title: str,
    message: str = "",
    category: str = "quiz",
    link: Optional[str] = None,
    actor: Optional[Dict[str, Any]] = None,
) -> int:
    """Notifies every active student that a quiz has been published."""
    cur = conn.execute("SELECT id, name, email, role FROM users WHERE role = 'student' AND is_active = 1")
    recipients = [dict(r) for r in cur.fetchall()]
    return broadcast_notification(
        conn,
        recipients,
        title=title,
        message=message,
        category=category,
        link=link or "/dashboard",
        entity_type="quiz",
        entity_id=quiz.get("id"),
        actor=actor,
    )


def notify_student(
    conn,
    student_id: str,
    title: str,
    message: str = "",
    category: str = "student",
    link: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    actor: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    cur = conn.execute(
        "SELECT id, name, email, role FROM users WHERE id = ? AND role = 'student'",
        (student_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return create_notification(
        conn,
        recipient_id=row["id"],
        recipient_role="student",
        title=title,
        message=message,
        category=category,
        link=link,
        entity_type=entity_type,
        entity_id=entity_id,
        actor=actor,
    )


def serialize_notification(row: Dict[str, Any]) -> Dict[str, Any]:
    """Normalises a notifications row into the shape the frontend expects."""
    created = row.get("created_at")
    created_iso = created.isoformat() if hasattr(created, "isoformat") else str(created or "")
    return {
        "id": row.get("id"),
        "title": row.get("title"),
        "message": row.get("message") or "",
        "category": row.get("category") or "general",
        "link": row.get("link"),
        "entityType": row.get("entity_type"),
        "entityId": row.get("entity_id"),
        "actorName": row.get("actor_name"),
        "actorRole": row.get("actor_role"),
        "isRead": bool(row.get("is_read")),
        "createdAt": created_iso,
        "timestamp": created_iso,
    }
