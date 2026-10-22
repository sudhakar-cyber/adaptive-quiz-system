"""
Ownership / cohort resolution shared by every dashboard.

The three dashboards are connected through two relationships that live in MySQL:

    educator  --(quizzes.author_id)-->  quiz  --(quiz_attempts.quiz_id)-->  student

    educator  --(educator_students)-->  student   (explicit cohort assignment)

`educator_quiz_ids` and `educator_cohort_ids` are the single implementation of
that graph, so the educator dashboard, the results API and the analytics API all
resolve "my students" the exact same way.
"""

import logging
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger("tracking.controller")


def _educator_keys(educator: Optional[Dict[str, Any]]) -> Dict[str, str]:
    """Identifier fields we can match an educator against `quizzes.author_*`."""
    educator = educator or {}
    return {
        "id": (educator.get("id") or educator.get("uid") or "").strip(),
        "name": (educator.get("name") or "").strip(),
    }


def educator_quiz_ids(conn, educator: Optional[Dict[str, Any]]) -> List[str]:
    """Ids of every quiz authored by this educator."""
    keys = _educator_keys(educator)
    if not keys["id"] and not keys["name"]:
        return []
    cur = conn.execute(
        "SELECT id FROM quizzes WHERE author_id = ? OR LOWER(author_name) = LOWER(?)",
        (keys["id"], keys["name"]),
    )
    return [row["id"] for row in cur.fetchall()]


def educator_cohort_ids(conn, educator: Optional[Dict[str, Any]]) -> List[str]:
    """
    Every student this educator is responsible for:
    students who attempted one of their quizzes, plus explicitly assigned students.
    """
    keys = _educator_keys(educator)
    educator_id = keys["id"]
    cohort: Set[str] = set()

    if educator_id:
        cur = conn.execute(
            "SELECT student_id FROM educator_students WHERE educator_id = ?",
            (educator_id,),
        )
        cohort.update(row["student_id"] for row in cur.fetchall() if row.get("student_id"))

    quiz_ids = educator_quiz_ids(conn, educator)
    if quiz_ids:
        placeholders = ", ".join(["?"] * len(quiz_ids))
        cur = conn.execute(
            f"""
            SELECT DISTINCT student_id FROM quiz_attempts
            WHERE quiz_id IN ({placeholders}) AND student_id IS NOT NULL AND student_id != ''
            """,
            tuple(quiz_ids),
        )
        cohort.update(row["student_id"] for row in cur.fetchall() if row.get("student_id"))

    # If no cohort has been partitioned yet, include all active students
    if not cohort:
        cur = conn.execute("SELECT id FROM users WHERE role = 'student' AND is_active = 1")
        cohort.update(row["id"] for row in cur.fetchall() if row.get("id"))

    return sorted(cohort)


def link_student_to_educator(
    conn,
    educator_id: str,
    student_id: str,
    assigned_by: Optional[str] = None,
) -> bool:
    """Adds a student to an educator's cohort. Idempotent."""
    if not educator_id or not student_id:
        return False
    try:
        conn.execute(
            """
            INSERT INTO educator_students (educator_id, student_id, assigned_by, assigned_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE assigned_by = VALUES(assigned_by)
            """,
            (educator_id, student_id, assigned_by),
        )
        return True
    except Exception as exc:  # pragma: no cover
        logger.warning(f"Failed to link student {student_id} to educator {educator_id}: {exc}")
        return False


def sync_cohort_from_attempt(conn, quiz: Dict[str, Any], student_id: str) -> None:
    """
    Called after a student submits an attempt: pulls that student into the
    educator's cohort so the educator dashboard starts tracking them.
    """
    educator_id = quiz.get("author_id") or quiz.get("authorId")
    educator_name = quiz.get("author_name") or quiz.get("authorName")
    if not educator_id and educator_name:
        cur = conn.execute(
            "SELECT id FROM users WHERE role = 'educator' AND LOWER(name) = LOWER(?)",
            (educator_name,),
        )
        row = cur.fetchone()
        if row:
            educator_id = row["id"]
    if educator_id and student_id:
        link_student_to_educator(conn, educator_id, student_id)


def educator_ids_for_students(conn, student_ids: List[str]) -> List[str]:
    """Educators explicitly linked to any of the given students."""
    if not student_ids:
        return []
    placeholders = ", ".join(["?"] * len(student_ids))
    cur = conn.execute(
        f"SELECT DISTINCT educator_id FROM educator_students WHERE student_id IN ({placeholders})",
        tuple(student_ids),
    )
    return [row["educator_id"] for row in cur.fetchall()]


def can_manage_quiz(quiz: Optional[Dict[str, Any]], current_user: Optional[Dict[str, Any]]) -> bool:
    """Admins may manage any quiz; educators only the quizzes they authored."""
    if not quiz or not current_user:
        return False
    role = (current_user.get("role") or "").lower()
    if role == "admin":
        return True
    if role != "educator":
        return False
    keys = _educator_keys(current_user)
    if keys["id"] and quiz.get("author_id") == keys["id"]:
        return True
    if keys["name"] and (quiz.get("author_name") or "").lower() == keys["name"].lower():
        return True
    return False


def visible_quiz_ids(conn, current_user: Optional[Dict[str, Any]]) -> Optional[List[str]]:
    """
    Quiz ids the caller may see in full (including drafts).
    Returns None for callers allowed to see every quiz (admin).
    """
    role = (current_user.get("role") or "").lower() if current_user else "student"
    if role == "admin":
        return None
    if role == "educator":
        return educator_quiz_ids(conn, current_user)
    return []
