import time
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr
from app.db import get_connection
from app.middleware.auth_middleware import get_current_user_from_token
from app.middleware.role_check import require_educator_or_admin

logger = logging.getLogger("user_routes")
router = APIRouter(prefix="/api/users", tags=["Users"])

class CreateStudentRequest(BaseModel):
    name: str
    email: str
    studentId: Optional[str] = None
    department: Optional[str] = "Computer Science"

class CreateEducatorRequest(BaseModel):
    name: str
    email: str
    educatorId: Optional[str] = None
    department: Optional[str] = "Computer Science"
    title: Optional[str] = "Faculty Member"
    phone: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    title: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

@router.get("/me")
def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user_from_token)):
    user_id = current_user.get("id") or current_user.get("uid")
    email = (current_user.get("email") or "").strip().lower()
    with get_connection() as conn:
        cur = conn.execute(
            "SELECT id, name, email, role, department, phone, title, is_active FROM users WHERE id = ? OR LOWER(email) = ?",
            (user_id, email)
        )
        row = cur.fetchone()
        if row:
            res = dict(row)
            res["uid"] = res["id"]
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
        "isActive": current_user.get("is_active", True)
    }

@router.put("/me")
def update_current_user_profile(
    req: UpdateProfileRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_from_token)
):
    """
    Updates profile details for student, educator, or admin in MySQL database.
    Automatically updates name, phone, department, and title.
    """
    user_id = current_user.get("id") or current_user.get("uid")
    email = (current_user.get("email") or "").strip().lower()
    role = current_user.get("role") or "student"

    new_name = req.name.strip() if req.name and req.name.strip() else None
    new_phone = req.phone.strip() if req.phone is not None and req.phone.strip() else (req.phone if req.phone == "" else None)
    new_dept = req.department.strip() if req.department is not None and req.department.strip() else (req.department if req.department == "" else None)
    new_title = req.title.strip() if req.title is not None and req.title.strip() else (req.title if req.title == "" else None)

    with get_connection() as conn:
        # Check if user already exists
        cur = conn.execute("SELECT id, name, email, role, department, phone, title FROM users WHERE id = ? OR LOWER(email) = ?", (user_id, email))
        existing = cur.fetchone()

        if existing:
            target_id = existing["id"]
            conn.execute("""
                UPDATE users
                SET name = COALESCE(?, name),
                    phone = COALESCE(?, phone),
                    department = COALESCE(?, department),
                    title = COALESCE(?, title),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (new_name, new_phone, new_dept, new_title, target_id))
        else:
            target_id = user_id or f"usr_{int(time.time() * 1000)}"
            conn.execute("""
                INSERT INTO users (id, name, email, role, department, phone, title, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (target_id, new_name or current_user.get("name") or "User", email, role, new_dept, new_phone, new_title))

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
def get_educators(
    authorization: Optional[str] = Header(None),
    x_user_uid: Optional[str] = Header(None, alias="X-User-UID"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
):
    """Returns all educators from MySQL with quiz and student statistics."""
    with get_connection() as conn:
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
                COUNT(DISTINCT q.id) as quizzesCreated,
                COALESCE(SUM(q.submissions_count), 0) as totalStudents,
                COALESCE(AVG(q.avg_score), 0.0) as avgPerformance,
                COUNT(DISTINCT CASE WHEN q.status IN ('Active', 'Published') THEN q.id END) as activeQuizzes
            FROM users u
            LEFT JOIN quizzes q ON (q.author_id = u.id OR LOWER(q.author_name) = LOWER(u.name))
            WHERE u.role = 'educator'
            GROUP BY u.id, u.name, u.email, u.role, u.department, u.phone, u.title, u.is_active, u.created_at
            ORDER BY u.created_at DESC
        """)
        educators = []
        for r in cur.fetchall():
            d = dict(r)
            d["uid"] = d["id"]
            d["educatorId"] = d.get("id", "")
            d["quizzesCreated"] = int(d.get("quizzesCreated") or 0)
            d["totalStudents"] = int(d.get("totalStudents") or 0)
            d["avgPerformance"] = round(float(d.get("avgPerformance") or 0.0), 1)
            d["activeQuizzes"] = int(d.get("activeQuizzes") or 0)
            d["isActive"] = bool(d.get("is_active", True))
            d["status"] = "Active" if d["isActive"] else "Inactive"
            educators.append(d)
        return educators

@router.post("/educators", status_code=status.HTTP_201_CREATED)
def create_educator(req: CreateEducatorRequest, current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    name = req.name.strip()
    email = req.email.strip().lower()
    edu_id = (req.educatorId or f"edu-{email.split('@')[0]}").strip()

    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required.")

    with get_connection() as conn:
        conn.execute("""
            INSERT INTO users (id, name, email, role, department, title, phone, is_active, created_at, updated_at)
            VALUES (?, ?, ?, 'educator', ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                department = VALUES(department),
                title = VALUES(title),
                phone = VALUES(phone),
                updated_at = CURRENT_TIMESTAMP
        """, (edu_id, name, email, req.department or "Computer Science", req.title or "Faculty Member", req.phone or ""))
        conn.commit()

        cur = conn.execute("SELECT id, name, email, role, department, phone, title, is_active FROM users WHERE id = ?", (edu_id,))
        row = dict(cur.fetchone())
        row["uid"] = row["id"]
        row["educatorId"] = row["id"]
        row["isActive"] = bool(row.get("is_active", True))
        row["status"] = "Active" if row["isActive"] else "Inactive"
        return row

@router.delete("/educators/{identifier}")
def delete_educator(identifier: str, current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    clean_id = identifier.strip().lower()
    with get_connection() as conn:
        conn.execute("DELETE FROM users WHERE (id = ? OR LOWER(email) = ?) AND role = 'educator'", (clean_id, clean_id))
        conn.commit()
    return {"message": "Educator removed successfully", "identifier": clean_id}

@router.get("/students")
def get_students(
    authorization: Optional[str] = Header(None),
    x_user_uid: Optional[str] = Header(None, alias="X-User-UID"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
):
    with get_connection() as conn:
        # First, ensure any student who submitted in quiz_attempts is registered in users table
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
            LEFT JOIN quiz_attempts qa ON (qa.student_id = u.id OR LOWER(qa.student_email) = LOWER(u.email))
            WHERE u.role = 'student'
            GROUP BY u.id, u.name, u.email, u.role, u.department, u.phone, u.title, u.is_active, u.created_at
            ORDER BY u.created_at DESC
        """)
        students = []
        for r in cur.fetchall():
            d = dict(r)
            d["uid"] = d["id"]
            d["studentId"] = d["id"]
            d["topSubject"] = d.get("department") or "General"
            
            sub_cur = conn.execute("""
                SELECT id, quiz_id, quiz_title as title, category, score, status, submitted_at
                FROM quiz_attempts
                WHERE student_id = ? OR LOWER(student_email) = LOWER(?)
                ORDER BY submitted_at DESC
                LIMIT 5
            """, (d["id"], d["email"]))
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
def create_student(req: CreateStudentRequest, current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    name = req.name.strip()
    email = req.email.strip().lower()
    stud_id = (req.studentId or f"stud-{email.split('@')[0]}").strip()

    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required.")

    with get_connection() as conn:
        conn.execute("""
            INSERT INTO users (id, name, email, role, department, is_active, created_at, updated_at)
            VALUES (?, ?, ?, 'student', ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE name = VALUES(name), department = VALUES(department), updated_at = CURRENT_TIMESTAMP
        """, (stud_id, name, email, req.department or "General"))
        conn.commit()

        cur = conn.execute("SELECT id, name, email, role, department, phone, title, is_active FROM users WHERE id = ?", (stud_id,))
        row = dict(cur.fetchone())
        row["uid"] = row["id"]
        return row

@router.delete("/students/{identifier}")
def delete_student(identifier: str, current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
    clean_id = identifier.strip().lower()
    with get_connection() as conn:
        # Find student record
        cur = conn.execute(
            "SELECT id, email FROM users WHERE (LOWER(id) = ? OR LOWER(email) = ?) AND role = 'student'",
            (clean_id, clean_id)
        )
        student = cur.fetchone()
        if not student:
            # Check if quiz attempts exist under this student identifier
            conn.execute("DELETE FROM quiz_attempts WHERE LOWER(student_id) = ? OR LOWER(student_email) = ?", (clean_id, clean_id))
            conn.commit()
            return {"success": True, "message": f"Student '{identifier}' deleted."}

        target_id = student["id"]
        target_email = (student["email"] or "").lower()

        # Delete student attempts
        conn.execute(
            "DELETE FROM quiz_attempts WHERE id = ? OR student_id = ? OR LOWER(student_email) = ?",
            (target_id, target_id, target_email)
        )
        # Delete user record
        conn.execute("DELETE FROM users WHERE id = ? AND role = 'student'", (target_id,))
        conn.commit()

        return {"success": True, "message": f"Student '{identifier}' and associated data deleted from MySQL."}

@router.post("/cleanup-default-students")
def cleanup_default_students(current_user: Dict[str, Any] = Depends(require_educator_or_admin)):
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

        return {
            "success": True,
            "deletedDefaultStudents": deleted_users,
            "deletedDefaultAttempts": deleted_attempts,
            "message": "Default students and demo attempts purged successfully."
        }

