import time
import json
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.db import get_connection
from app.middleware.auth_middleware import get_current_user_from_token
from app.middleware.role_check import (
    require_admin,
    require_authenticated,
    require_educator_or_admin,
)
from app.controllers import tracking_controller
from app.notifications import notification_service
from app.services.passwords import hash_password, verify_password

logger = logging.getLogger("user_routes")
router = APIRouter(prefix="/api/users", tags=["Users"])


class CreateStudentRequest(BaseModel):
    name: str
    email: str
    studentId: Optional[str] = None
    department: Optional[str] = "Computer Science"
    topSubject: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    avatarUrl: Optional[str] = None
    password: Optional[str] = None


class CreateEducatorRequest(BaseModel):
    name: str
    email: str
    educatorId: Optional[str] = None
    department: Optional[str] = "Computer Science"
    title: Optional[str] = "Faculty Member"
    phone: Optional[str] = None
    avatarUrl: Optional[str] = None
    password: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    studentId: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    title: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class StudentProfileRequest(BaseModel):
    """Profile fields an educator or admin may maintain for a student."""

    name: Optional[str] = None
    studentId: Optional[str] = None
    topSubject: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    avatarUrl: Optional[str] = None
    subjectMastery: Optional[List[Dict[str, Any]]] = None
    streak: Optional[int] = None
    resetProgress: Optional[bool] = None


class PasswordUpdateRequest(BaseModel):
    newPassword: str
    currentPassword: Optional[str] = None


class AssignStudentRequest(BaseModel):
    educatorId: str


def _require_admin(current_user: Dict[str, Any]) -> Dict[str, Any]:
    """Admin-only guard used by user management endpoints."""
    if (current_user.get("role") or "").lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: managing users requires the admin role.",
        )
    return current_user


@router.get("/me")
def get_current_user_profile(current_user: Dict[str, Any] = Depends(require_authenticated)):
    user_id = current_user.get("id") or current_user.get("uid")
    email = (current_user.get("email") or "").strip().lower()
    with get_connection() as conn:
        cur = conn.execute(
            "SELECT id, name, email, role, department, phone, title, student_id, is_active FROM users WHERE id = ? OR LOWER(email) = ?",
            (user_id, email)
        )
        row = cur.fetchone()
        if row:
            res = dict(row)
            res["uid"] = res["id"]
            res["studentId"] = res.get("student_id") or ("LS-2025-100" if email == "shaikaathif22@gmail.com" else None)
            res["isActive"] = bool(res.get("is_active", True))
            return res

    return {
        "id": user_id,
        "uid": user_id,
        "email": email,
        "name": current_user.get("name"),
        "role": current_user.get("role"),
        "department": current_user.get("department"),
        "phone": current_user.get("phone"),
        "title": current_user.get("title"),
        "studentId": "LS-2025-100" if email == "shaikaathif22@gmail.com" else None,
        "isActive": current_user.get("is_active", True)
    }


@router.put("/me")
def update_current_user_profile(
    req: UpdateProfileRequest,
    current_user: Dict[str, Any] = Depends(require_authenticated)
):
    """
    Updates profile details for student, educator, or admin in MySQL database.
    Automatically updates name, phone, department, student_id, and title.
    """
    user_id = current_user.get("id") or current_user.get("uid")
    email = (current_user.get("email") or "").strip().lower()
    role = current_user.get("role") or "student"

    new_name = req.name.strip() if req.name and req.name.strip() else None
    new_student_id = req.studentId.strip() if req.studentId and req.studentId.strip() else None
    new_phone = req.phone.strip() if req.phone is not None and req.phone.strip() else (req.phone if req.phone == "" else None)
    new_dept = req.department.strip() if req.department is not None and req.department.strip() else (req.department if req.department == "" else None)
    new_title = req.title.strip() if req.title is not None and req.title.strip() else (req.title if req.title == "" else None)

    with get_connection() as conn:
        # Check if user already exists
        cur = conn.execute("SELECT id, name, email, role, department, phone, title, student_id FROM users WHERE id = ? OR LOWER(email) = ?", (user_id, email))
        existing = cur.fetchone()

        if existing:
            target_id = existing["id"]
            conn.execute("""
                UPDATE users
                SET name = COALESCE(?, name),
                    phone = COALESCE(?, phone),
                    department = COALESCE(?, department),
                    title = COALESCE(?, title),
                    student_id = COALESCE(?, student_id),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (new_name, new_phone, new_dept, new_title, new_student_id, target_id))
        else:
            target_id = user_id or f"usr_{int(time.time() * 1000)}"
            conn.execute("""
                INSERT INTO users (id, name, email, role, department, phone, title, student_id, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (target_id, new_name or current_user.get("name") or "User", email, role, new_dept, new_phone, new_title, new_student_id or "LS-2025-100"))

        # If name was updated, propagate update to student_name across quiz_attempts and author_name across quizzes
        if new_name:
            conn.execute(
                "UPDATE quiz_attempts SET student_name = ? WHERE student_id = ? OR LOWER(student_email) = ?",
                (new_name, target_id, email)
            )
            conn.execute(
                "UPDATE quizzes SET author_name = ? WHERE author_id = ? OR author_id = ? OR LOWER(author_name) = LOWER(?)",
                (new_name, target_id, user_id, existing["name"] if existing else "")
            )

        notification_service.log_activity(
            conn,
            current_user,
            action="profile.updated",
            entity_type="user",
            entity_id=target_id,
            summary=f"{current_user.get('name')} updated their profile",
        )
        conn.commit()

        cur2 = conn.execute("SELECT id, name, email, role, department, phone, title, is_active FROM users WHERE id = ?", (target_id,))
        row = cur2.fetchone()
        if row:
            res = dict(row)
            res["uid"] = res["id"]
            res["isActive"] = bool(res.get("is_active", True))
            return res

    return {
        "id": user_id,
        "uid": user_id,
        "email": email,
        "name": new_name or current_user.get("name"),
        "role": role,
        "department": new_dept,
        "phone": new_phone,
        "title": new_title
    }


@router.get("/educators")
def get_educators(current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    """
    Returns educators with quiz and student statistics.

    Admins see every educator. Educators see only their own record.
    """
    role = (current_user.get("role") or "").lower()
    with get_connection() as conn:
        if role == "educator":
            educator_id = current_user.get("id") or current_user.get("uid")
            educator_name = current_user.get("name") or ""
            cur = conn.execute("""
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.department,
                    u.phone,
                    u.title,
                    u.is_active,
                    u.created_at,
                    u.educator_id,
                    u.avatar_url,
                    COUNT(DISTINCT q.id) as quizzesCreated,
                    COALESCE(SUM(q.submissions_count), 0) as totalStudents,
                    COALESCE(AVG(q.avg_score), 0.0) as avgPerformance,
                    COUNT(DISTINCT CASE WHEN q.status IN ('Active', 'Published') THEN q.id END) as activeQuizzes
                FROM users u
                LEFT JOIN quizzes q ON (q.author_id = u.id OR LOWER(q.author_name) = LOWER(u.name))
                WHERE u.role = 'educator' AND (u.id = ? OR LOWER(u.name) = LOWER(?))
                GROUP BY u.id, u.name, u.email, u.role, u.department, u.phone, u.title, u.is_active, u.created_at, u.educator_id, u.avatar_url
                ORDER BY u.created_at DESC
            """, (educator_id, educator_name))
        else:
            cur = conn.execute("""
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.department,
                    u.phone,
                    u.title,
                    u.is_active,
                    u.created_at,
                    u.educator_id,
                    u.avatar_url,
                    COUNT(DISTINCT q.id) as quizzesCreated,
                    COALESCE(SUM(q.submissions_count), 0) as totalStudents,
                    COALESCE(AVG(q.avg_score), 0.0) as avgPerformance,
                    COUNT(DISTINCT CASE WHEN q.status IN ('Active', 'Published') THEN q.id END) as activeQuizzes
                FROM users u
                LEFT JOIN quizzes q ON (q.author_id = u.id OR LOWER(q.author_name) = LOWER(u.name))
                WHERE u.role = 'educator'
                GROUP BY u.id, u.name, u.email, u.role, u.department, u.phone, u.title, u.is_active, u.created_at, u.educator_id, u.avatar_url
                ORDER BY u.created_at DESC
            """)

        educators = []
        for r in cur.fetchall():
            d = dict(r)
            d["uid"] = d["id"]
            d["educatorId"] = d.get("educator_id") or d.get("id", "")
            d["avatarImage"] = d.get("avatar_url") or None
            d["quizzesCreated"] = int(d.get("quizzesCreated") or 0)
            d["totalStudents"] = int(d.get("totalStudents") or 0)
            d["avgPerformance"] = round(float(d.get("avgPerformance") or 0.0), 1)
            d["activeQuizzes"] = int(d.get("activeQuizzes") or 0)
            d["isActive"] = bool(d.get("is_active", True))
            d["status"] = "Active" if d["isActive"] else "Inactive"
            educators.append(d)
        return educators


@router.post("/educators", status_code=status.HTTP_201_CREATED)
def create_educator(req: CreateEducatorRequest, current_user: Dict[str, Any] = Depends(require_admin)):
    name = req.name.strip()
    email = req.email.strip().lower()
    edu_id = (req.educatorId or f"edu-{email.split('@')[0]}").strip()

    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required.")

    with get_connection() as conn:
        conn.execute("""
            INSERT INTO users (
                id, name, email, role, department, title, phone, educator_id,
                avatar_url, password_hash, is_active, created_at, updated_at
            )
            VALUES (?, ?, ?, 'educator', ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                department = VALUES(department),
                title = VALUES(title),
                phone = VALUES(phone),
                educator_id = VALUES(educator_id),
                avatar_url = VALUES(avatar_url),
                password_hash = COALESCE(VALUES(password_hash), password_hash),
                updated_at = CURRENT_TIMESTAMP
        """, (
            edu_id,
            name,
            email,
            req.department or "Computer Science",
            req.title or "Faculty Member",
            req.phone or "",
            edu_id,
            req.avatarUrl or "",
            hash_password(req.password) if req.password else None,
        ))
        conn.commit()

        notification_service.log_activity(
            conn,
            current_user,
            action="educator.created",
            entity_type="user",
            entity_id=edu_id,
            summary=f"Educator {name} ({email}) was created",
        )
        conn.commit()

        cur = conn.execute(
            "SELECT id, name, email, role, department, phone, title, educator_id, avatar_url, is_active "
            "FROM users WHERE id = ?",
            (edu_id,),
        )
        row = dict(cur.fetchone())
        row["uid"] = row["id"]
        row["educatorId"] = row.get("educator_id") or row["id"]
        row["avatarImage"] = row.get("avatar_url") or None
        row["isActive"] = bool(row.get("is_active", True))
        row["status"] = "Active" if row["isActive"] else "Inactive"
        return row


@router.delete("/educators/{identifier}")
def delete_educator(identifier: str, current_user: Dict[str, Any] = Depends(require_admin)):
    clean_id = identifier.strip().lower()
    with get_connection() as conn:
        cur = conn.execute(
            "SELECT id, name, email FROM users WHERE (LOWER(id) = ? OR LOWER(email) = ?) AND role = 'educator'",
            (clean_id, clean_id)
        )
        educator = cur.fetchone()
        if not educator:
            raise HTTPException(status_code=404, detail="Educator not found.")

        conn.execute("DELETE FROM users WHERE id = ? AND role = 'educator'", (educator["id"],))
        conn.commit()

        notification_service.log_activity(
            conn,
            current_user,
            action="educator.removed",
            entity_type="user",
            entity_id=educator["id"],
            summary=f"Educator {educator['name']} ({educator['email']}) was removed",
        )
        conn.commit()

    return {"success": True, "message": f"Educator {identifier} removed successfully."}


@router.get("/students")
def get_students(current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    """
    Returns the student roster.

    Admins see every student. Educators only see their own cohort: students who
    attempted one of their quizzes, plus students explicitly assigned to them.
    All performance figures are computed over the educator's own quizzes.
    """
    role = (current_user.get("role") or "").lower()

    with get_connection() as conn:
        # Ensure any student who submitted in quiz_attempts is registered in users table
        try:
            conn.execute("""
                INSERT INTO users (id, name, email, role, is_active, created_at, updated_at)
                SELECT
                    COALESCE(NULLIF(student_id, ''), CONCAT('stud-', SUBSTRING_INDEX(student_email, '@', 1))),
                    student_name,
                    student_email,
                    'student',
                    1,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                FROM quiz_attempts
                WHERE student_email IS NOT NULL AND student_email != ''
                ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
            """)
            conn.commit()
        except Exception as e:
            logger.warning(f"Failed to auto-register students from attempts: {e}")

        if role == "educator":
            cohort = tracking_controller.educator_cohort_ids(conn, current_user)
            if not cohort:
                return []
            cohort_placeholders = ", ".join(["?"] * len(cohort))
            cohort_params = list(cohort)
        else:
            cohort_placeholders = None
            cohort_params = []

        where_clause = "u.role = 'student'"
        if cohort_placeholders:
            where_clause += f" AND u.id IN ({cohort_placeholders})"

        cur = conn.execute(f"""
            SELECT
                u.id,
                u.name,
                u.email,
                u.role,
                u.department,
                u.phone,
                u.title,
                u.is_active,
                u.created_at,
                u.student_id,
                u.top_subject,
                u.avatar_url,
                u.country,
                u.streak,
                u.subject_mastery,
                COUNT(qa.id) as quizzesCompleted,
                COALESCE(ROUND(AVG(qa.score), 1), 0.0) as avgScore,
                COALESCE(MAX(qa.score), 0.0) as highestScore,
                CASE
                    WHEN COUNT(qa.id) = 0 THEN 'On Track'
                    WHEN AVG(qa.score) >= 85 THEN 'Top Performer'
                    WHEN AVG(qa.score) >= 70 THEN 'On Track'
                    ELSE 'Needs Support'
                END as status,
                CASE
                    WHEN AVG(qa.score) >= 85 THEN 'success'
                    WHEN AVG(qa.score) >= 70 THEN 'info'
                    ELSE 'warning'
                END as statusVariant,
                COALESCE(DATE_FORMAT(MAX(qa.submitted_at), '%Y-%m-%d %H:%i'), 'Active') as lastActive
            FROM users u
            LEFT JOIN quiz_attempts qa
                ON (
                    qa.student_id = u.id
                    OR (u.student_id IS NOT NULL AND u.student_id != '' AND qa.student_id = u.student_id)
                    OR (qa.student_email IS NOT NULL AND LOWER(qa.student_email) = LOWER(u.email))
                )
            WHERE {where_clause}
            GROUP BY u.id, u.name, u.email, u.role, u.department, u.phone, u.title, u.is_active, u.created_at, u.student_id, u.top_subject, u.avatar_url, u.country, u.streak, u.subject_mastery
            ORDER BY u.created_at DESC
        """, tuple(cohort_params))

        students = []
        for r in cur.fetchall():
            d = dict(r)
            d["uid"] = d["id"]
            d["studentId"] = d.get("student_id") or d["id"]
            d["topSubject"] = d.get("top_subject") or d.get("department") or "General"
            d["avatarImage"] = d.get("avatar_url") or None
            d["streak"] = int(d.get("streak") or 0)
            mastery = d.get("subject_mastery")
            if isinstance(mastery, str):
                try:
                    mastery = json.loads(mastery)
                except (TypeError, ValueError):
                    mastery = None
            d["subjectMastery"] = mastery if isinstance(mastery, list) else []

            stud_sid = d.get("studentId") or d.get("student_id") or d["id"]
            sub_cur = conn.execute("""
                SELECT id, quiz_id, quiz_title as title, category, score, status, submitted_at
                FROM quiz_attempts
                WHERE (
                    student_id = ?
                    OR (student_id IS NOT NULL AND student_id = ?)
                    OR (student_email IS NOT NULL AND LOWER(student_email) = LOWER(?))
                )
                ORDER BY submitted_at DESC
                LIMIT 5
            """, (d["id"], stud_sid, d["email"]))

            recent = []
            for srow in sub_cur.fetchall():
                sdict = dict(srow)
                sdict["score"] = f"{int(sdict['score'])}%"
                sdict["date"] = sdict["submitted_at"].strftime("%b %d, %Y") if sdict.get("submitted_at") and hasattr(sdict.get("submitted_at"), "strftime") else "Recent"
                recent.append(sdict)
            d["recentSubmissions"] = recent
            students.append(d)
        return students


@router.post("/students", status_code=status.HTTP_201_CREATED)
def create_student(req: CreateStudentRequest, current_user: Dict[str, Any] = Depends(require_admin)):
    name = req.name.strip()
    email = req.email.strip().lower()
    stud_id = (req.studentId or f"stud-{email.split('@')[0]}").strip()

    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required.")

    with get_connection() as conn:
        conn.execute("""
            INSERT INTO users (
                id, name, email, role, department, top_subject, student_id,
                phone, country, avatar_url, password_hash, is_active, created_at, updated_at
            )
            VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                department = VALUES(department),
                top_subject = VALUES(top_subject),
                student_id = VALUES(student_id),
                phone = VALUES(phone),
                country = VALUES(country),
                avatar_url = VALUES(avatar_url),
                password_hash = COALESCE(VALUES(password_hash), password_hash),
                updated_at = CURRENT_TIMESTAMP
        """, (
            stud_id,
            name,
            email,
            req.department or "General",
            req.topSubject or req.department or "General",
            stud_id,
            req.phone or "",
            req.country or "",
            req.avatarUrl or "",
            hash_password(req.password) if req.password else None,
        ))
        conn.commit()

        notification_service.log_activity(
            conn,
            current_user,
            action="student.created",
            entity_type="user",
            entity_id=stud_id,
            summary=f"Student {name} ({email}) was added to the roster",
        )
        conn.commit()

        cur = conn.execute(
            "SELECT id, name, email, role, department, top_subject, student_id, phone, country, "
            "avatar_url, is_active FROM users WHERE id = ?",
            (stud_id,),
        )
        row = dict(cur.fetchone())
        row["uid"] = row["id"]
        row["studentId"] = row.get("student_id") or row["id"]
        row["topSubject"] = row.get("top_subject") or row.get("department") or "General"
        row["avatarImage"] = row.get("avatar_url") or None
        return row


@router.post("/cohort/students", status_code=status.HTTP_201_CREATED)
def add_student_to_cohort(
    req: CreateStudentRequest,
    current_user: Dict[str, Any] = Depends(require_educator_or_admin),
):
    """
    Adds a student to the calling educator's cohort.

    Educators may only create students inside their own cohort, admins may
    create any student.
    """
    role = (current_user.get("role") or "").lower()
    name = req.name.strip()
    email = req.email.strip().lower()

    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required.")

    stud_id = (req.studentId or f"stud-{email.split('@')[0]}").strip()

    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id, name, role FROM users WHERE LOWER(email) = ?",
            (email,),
        ).fetchone()

        if existing and (existing.get("role") or "").lower() != "student":
            raise HTTPException(status_code=409, detail="That email belongs to another role.")

        if existing:
            stud_id = existing["id"]

        conn.execute(
            """
            INSERT INTO users (
                id, name, email, role, department, top_subject, student_id,
                phone, country, avatar_url, password_hash, is_active, created_at, updated_at
            )
            VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                department = VALUES(department),
                top_subject = VALUES(top_subject),
                student_id = VALUES(student_id),
                phone = VALUES(phone),
                country = VALUES(country),
                avatar_url = VALUES(avatar_url),
                password_hash = COALESCE(VALUES(password_hash), password_hash),
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                stud_id,
                name,
                email,
                req.department or "General",
                req.topSubject or req.department or "General",
                stud_id,
                req.phone or "",
                req.country or "",
                req.avatarUrl or "",
                hash_password(req.password) if req.password else None,
            ),
        )
        conn.commit()

        if role == "educator":
            tracking_controller.link_student_to_educator(
                conn,
                current_user.get("id") or current_user.get("uid"),
                stud_id,
                assigned_by=current_user.get("id"),
            )
            notification_service.create_notification(
                conn,
                recipient_id=stud_id,
                recipient_role="student",
                title="You were added to a cohort",
                message=(
                    f"{current_user.get('name')} added you to their cohort. "
                    "Your quizzes and progress now appear on your dashboard."
                ),
                category="cohort",
                link="/dashboard",
                entity_type="student",
                entity_id=stud_id,
                actor=current_user,
            )
        else:
            notification_service.create_notification(
                conn,
                recipient_id=stud_id,
                recipient_role="student",
                title="Welcome to LearnSmart",
                message=f"{current_user.get('name')} added you to the student roster.",
                category="cohort",
                link="/dashboard",
                entity_type="student",
                entity_id=stud_id,
                actor=current_user,
            )

        notification_service.log_activity(
            conn,
            current_user,
            action="student.created",
            entity_type="student",
            entity_id=stud_id,
            summary=f"Student {name} ({email}) was added to the roster",
        )
        conn.commit()

        cur = conn.execute(
            "SELECT id, name, email, role, department, top_subject, student_id, phone, country, "
            "avatar_url, is_active FROM users WHERE id = ?",
            (stud_id,),
        )
        row = dict(cur.fetchone())
        row["uid"] = row["id"]
        row["studentId"] = row.get("student_id") or row["id"]
        row["topSubject"] = row.get("top_subject") or row.get("department") or "General"
        row["avatarImage"] = row.get("avatar_url") or None
        return row


@router.delete("/cohort/students/{identifier}")
def remove_student_from_cohort(
    identifier: str,
    current_user: Dict[str, Any] = Depends(require_educator_or_admin),
):
    """
    Removes a student from the calling educator's cohort.

    Educators may only remove students from their own cohort and the student
    account itself is kept. Admins delete the account completely.
    """
    role = (current_user.get("role") or "").lower()
    clean_id = identifier.strip().lower()

    with get_connection() as conn:
        cur = conn.execute(
            "SELECT id, name, email FROM users WHERE (LOWER(id) = ? OR LOWER(email) = ?) AND role = 'student'",
            (clean_id, clean_id),
        )
        student = cur.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")

        if role == "admin":
            target_id = student["id"]
            target_email = (student["email"] or "").lower()
            conn.execute(
                "DELETE FROM quiz_attempts WHERE id = ? OR student_id = ? OR LOWER(student_email) = ?",
                (target_id, target_id, target_email),
            )
            conn.execute("DELETE FROM educator_students WHERE student_id = ?", (target_id,))
            conn.execute("DELETE FROM users WHERE id = ? AND role = 'student'", (target_id,))
            conn.commit()

            notification_service.log_activity(
                conn,
                current_user,
                action="student.removed",
                entity_type="student",
                entity_id=target_id,
                summary=f"Student {student['name']} ({student['email']}) was removed",
            )
            conn.commit()

            return {
                "success": True,
                "message": f"Student '{student['name']}' and associated data deleted from MySQL.",
            }

        educator_id = current_user.get("id") or current_user.get("uid")
        cohort = tracking_controller.educator_cohort_ids(conn, current_user)
        if student["id"] not in cohort:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only remove students from your own cohort.",
            )

        conn.execute(
            "DELETE FROM educator_students WHERE educator_id = ? AND student_id = ?",
            (educator_id, student["id"]),
        )
        conn.commit()

        notification_service.log_activity(
            conn,
            current_user,
            action="cohort.student_removed",
            entity_type="student",
            entity_id=student["id"],
            summary=f"Student {student['name']} was removed from the cohort",
        )
        conn.commit()

        return {
            "success": True,
            "message": f"Student '{student['name']}' was removed from your cohort.",
        }


@router.delete("/students/{identifier}")
def delete_student(identifier: str, current_user: Dict[str, Any] = Depends(require_admin)):
    clean_id = identifier.strip().lower()
    with get_connection() as conn:
        # Find student record
        cur = conn.execute(
            "SELECT id, name, email FROM users WHERE (LOWER(id) = ? OR LOWER(email) = ?) AND role = 'student'",
            (clean_id, clean_id)
        )
        student = cur.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")

        target_id = student["id"]
        target_email = (student["email"] or "").lower()

        # Delete student attempts and cohort links
        conn.execute(
            "DELETE FROM quiz_attempts WHERE id = ? OR student_id = ? OR LOWER(student_email) = ?",
            (target_id, target_id, target_email)
        )
        conn.execute("DELETE FROM educator_students WHERE student_id = ?", (target_id,))
        # Delete user record
        conn.execute("DELETE FROM users WHERE id = ? AND role = 'student'", (target_id,))
        conn.commit()

        notification_service.log_activity(
            conn,
            current_user,
            action="student.removed",
            entity_type="user",
            entity_id=target_id,
            summary=f"Student {student['name']} ({student['email']}) was removed",
        )
        conn.commit()

        return {"success": True, "message": f"Student '{identifier}' and associated data deleted from MySQL."}


@router.post("/students/{identifier}/assign")
def assign_student_to_educator(
    identifier: str,
    req: AssignStudentRequest,
    current_user: Dict[str, Any] = Depends(require_admin),
):
    """Links a student into an educator's cohort so the educator dashboard tracks them."""
    clean_id = identifier.strip().lower()
    educator_id = (req.educatorId or "").strip()

    with get_connection() as conn:
        cur = conn.execute(
            "SELECT id, name, email FROM users WHERE (LOWER(id) = ? OR LOWER(email) = ?) AND role = 'student'",
            (clean_id, clean_id)
        )
        student = cur.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")

        edu_cur = conn.execute(
            "SELECT id, name, email FROM users WHERE (LOWER(id) = ? OR LOWER(email) = ?) AND role = 'educator'",
            (educator_id.lower(), educator_id.lower())
        )
        educator = edu_cur.fetchone()
        if not educator:
            raise HTTPException(status_code=404, detail="Educator not found.")

        tracking_controller.link_student_to_educator(
            conn, educator["id"], student["id"], assigned_by=current_user.get("id")
        )

        notification_service.create_notification(
            conn,
            recipient_id=educator["id"],
            recipient_role="educator",
            title="Student assigned to your cohort",
            message=f"{student['name']} ({student['email']}) was assigned to your cohort.",
            category="cohort",
            link="/educator-dashboard",
            entity_type="student",
            entity_id=student["id"],
            actor=current_user,
        )
        notification_service.log_activity(
            conn,
            current_user,
            action="student.assigned",
            entity_type="student",
            entity_id=student["id"],
            summary=f"Student {student['name']} was assigned to educator {educator['name']}",
            metadata={"educatorId": educator["id"]},
        )
        conn.commit()

        return {
            "success": True,
            "message": f"Student '{student['name']}' assigned to educator '{educator['name']}'.",
            "studentId": student["id"],
            "educatorId": educator["id"],
        }


@router.put("/students/{identifier}/profile")
def update_student_profile(
    identifier: str,
    req: StudentProfileRequest,
    current_user: Dict[str, Any] = Depends(require_educator_or_admin),
):
    """
    Updates the profile of a student.

    Admins may update any student. Educators may only update students inside
    their own cohort, so an educator can never reach another educator's roster.
    """
    role = (current_user.get("role") or "").lower()
    clean_id = identifier.strip().lower()

    with get_connection() as conn:
        cur = conn.execute(
            "SELECT id, name, email, role, student_id, top_subject, subject_mastery, streak "
            "FROM users WHERE (LOWER(id) = ? OR LOWER(email) = ?) AND role = 'student'",
            (clean_id, clean_id),
        )
        student = cur.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")

        if role != "admin":
            cohort = tracking_controller.educator_cohort_ids(conn, current_user)
            if student["id"] not in cohort:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update students in your own cohort.",
                )

        fields: List[Any] = []
        assignments: List[str] = []

        def _add(column: str, value: Any):
            assignments.append(f"{column} = ?")
            fields.append(value)

        if req.name and req.name.strip():
            _add("name", req.name.strip())
        if req.studentId and req.studentId.strip():
            _add("student_id", req.studentId.strip())
        if req.topSubject is not None:
            _add("top_subject", req.topSubject.strip())
        if req.department is not None:
            _add("department", req.department.strip())
        if req.phone is not None:
            _add("phone", req.phone.strip())
        if req.country is not None:
            _add("country", req.country.strip())
        if req.avatarUrl is not None:
            _add("avatar_url", req.avatarUrl)
        if req.streak is not None:
            _add("streak", int(req.streak))
        if req.subjectMastery is not None:
            _add("subject_mastery", json.dumps(req.subjectMastery))

        if req.resetProgress:
            conn.execute(
                "DELETE FROM quiz_attempts WHERE student_id = ? OR LOWER(student_email) = LOWER(?)",
                (student["id"], student["email"]),
            )
            _add("subject_mastery", json.dumps([]))
            _add("streak", 0)
            conn.execute("""
                UPDATE quizzes q SET
                    submissions_count = (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id),
                    avg_score = COALESCE((SELECT ROUND(AVG(score), 1) FROM quiz_attempts qa WHERE qa.quiz_id = q.id), 0.0),
                    pass_rate = COALESCE((SELECT ROUND(SUM(CASE WHEN score >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) FROM quiz_attempts qa WHERE qa.quiz_id = q.id), 0.0)
            """)

            notification_service.create_notification(
                conn,
                recipient_id=student["id"],
                recipient_role="student",
                title="Quiz Progress Reset by Educator",
                message=(
                    "Your educator has reset your quiz attempts and scores. "
                    "All quizzes are now unlocked for retaking!"
                ),
                category="system",
                link="/dashboard",
                entity_type="student",
                entity_id=student["id"],
                actor=current_user,
            )

        if assignments:
            assignments.append("updated_at = CURRENT_TIMESTAMP")
            conn.execute(
                f"UPDATE users SET {', '.join(assignments)} WHERE id = ?",
                tuple(fields + [student["id"]]),
            )

        notification_service.log_activity(
            conn,
            current_user,
            action="student.profile_updated",
            entity_type="student",
            entity_id=student["id"],
            summary=f"Profile updated for student {student['name']}",
            metadata={"fields": [a.split(" = ")[0] for a in assignments]},
        )
        conn.commit()

        cur = conn.execute(
            "SELECT id, name, email, role, department, top_subject, student_id, phone, country, "
            "avatar_url, streak, subject_mastery, is_active FROM users WHERE id = ?",
            (student["id"],),
        )
        row = dict(cur.fetchone())
        row["uid"] = row["id"]
        row["studentId"] = row.get("student_id") or row["id"]
        row["topSubject"] = row.get("top_subject") or row.get("department") or "General"
        row["avatarImage"] = row.get("avatar_url") or None
        mastery = row.get("subject_mastery")
        if isinstance(mastery, str):
            try:
                mastery = json.loads(mastery)
            except (TypeError, ValueError):
                mastery = []
        row["subjectMastery"] = mastery if isinstance(mastery, list) else []
        return row


@router.put("/{identifier}/password")
def update_user_password(
    identifier: str,
    req: PasswordUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_admin),
):
    """Admin-only password management (system settings)."""
    if not req.newPassword or len(req.newPassword) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long.",
        )

    clean_id = identifier.strip().lower()
    with get_connection() as conn:
        cur = conn.execute(
            "SELECT id, name, email, role, password_hash FROM users "
            "WHERE LOWER(id) = ? OR LOWER(email) = ?",
            (clean_id, clean_id),
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        conn.execute(
            "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (hash_password(req.newPassword), user["id"]),
        )

        notification_service.log_activity(
            conn,
            current_user,
            action="user.password_updated",
            entity_type="user",
            entity_id=user["id"],
            summary=f"Password updated for {user['name']} ({user['email']})",
        )
        conn.commit()

        return {
            "success": True,
            "message": f"Password updated for {user['email']}.",
            "userId": user["id"],
        }


@router.get("/cohort")
def get_educator_cohort(current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    """Returns the cohort summary for the calling educator (or every educator for admins)."""
    with get_connection() as conn:
        if (current_user.get("role") or "").lower() == "educator":
            cohort = tracking_controller.educator_cohort_ids(conn, current_user)
            quiz_ids = tracking_controller.educator_quiz_ids(conn, current_user)
        else:
            cur = conn.execute("SELECT id FROM users WHERE role = 'student'")
            cohort = [row["id"] for row in cur.fetchall()]
            quiz_ids = [row["id"] for row in conn.execute("SELECT id FROM quizzes").fetchall()]

        return {
            "studentIds": cohort,
            "studentCount": len(cohort),
            "quizIds": quiz_ids,
            "quizCount": len(quiz_ids),
        }


@router.post("/cleanup-default-students")
def cleanup_default_students(current_user: Dict[str, Any] = Depends(require_admin)):
    """Purges all demo/default student accounts and attempt records from MySQL database."""
    with get_connection() as conn:
        # Delete any default/demo students
        cur = conn.execute("""
            DELETE FROM users
            WHERE role = 'student'
              AND (
                  LOWER(email) LIKE '%demo%'
                  OR LOWER(email) LIKE 'student@%'
                  OR LOWER(id) LIKE 'stud-dev%'
                  OR LOWER(name) LIKE '%demo%'
              )
        """)
        deleted_users = cur.rowcount

        # Delete any dummy attempts
        cur2 = conn.execute("""
            DELETE FROM quiz_attempts
            WHERE LOWER(student_id) LIKE 'stud-dev%'
               OR LOWER(student_email) LIKE '%demo%'
               OR LOWER(student_email) LIKE 'student@%'
               OR LOWER(student_name) LIKE '%demo%'
        """)
        deleted_attempts = cur2.rowcount

        # Reset quizzes aggregate counters if attempts are 0
        conn.execute("""
            UPDATE quizzes q
            SET submissions_count = (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id),
                avg_score = COALESCE((SELECT ROUND(AVG(score), 1) FROM quiz_attempts qa WHERE qa.quiz_id = q.id), 0.0),
                pass_rate = COALESCE((SELECT ROUND(SUM(CASE WHEN score >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) FROM quiz_attempts qa WHERE qa.quiz_id = q.id), 0.0)
        """)
        conn.commit()

        notification_service.log_activity(
            conn,
            current_user,
            action="students.cleaned_up",
            entity_type="system",
            entity_id=None,
            summary=f"Removed {deleted_users} default student(s) and {deleted_attempts} demo attempt(s)",
        )
        conn.commit()

        return {
            "success": True,
            "deletedDefaultStudents": deleted_users,
            "deletedDefaultAttempts": deleted_attempts,
            "message": "Default students and demo attempts purged successfully."
        }
