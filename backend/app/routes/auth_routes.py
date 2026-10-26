from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.controllers import auth_controller
from app.db import get_connection
from app.services.passwords import hash_password, verify_password
from app.notifications import notification_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])



class SendOtpRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

class ValidateTokenRequest(BaseModel):
    email: str
    token: str

@router.post("/send-otp")
def send_otp_endpoint(req: SendOtpRequest):
    result = auth_controller.request_otp(req.email)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to send verification code.")
        )
    return result

@router.post("/resend-otp")
def resend_otp_endpoint(req: SendOtpRequest):
    result = auth_controller.request_otp(req.email)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to resend verification code.")
        )
    return result

@router.post("/verify-otp")
def verify_otp_endpoint(req: VerifyOtpRequest):
    result = auth_controller.verify_otp(req.email, req.otp)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Verification failed.")
        )
    return result

@router.post("/validate-token")
def validate_token_endpoint(req: ValidateTokenRequest):
    is_valid = auth_controller.validate_verification_token(req.email, req.token)
    return {"valid": is_valid}

@router.get("/smtp-status")
def smtp_status_endpoint():
    return auth_controller.get_smtp_status()

class ForgotPasswordRequest(BaseModel):
    email: str
    appUrl: Optional[str] = None

class VerifyResetTokenRequest(BaseModel):
    email: str
    token: str

class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    newPassword: str

@router.post("/request-password-reset")
def request_password_reset_endpoint(req: ForgotPasswordRequest):
    result = auth_controller.request_password_reset(req.email, req.appUrl or "")
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to process password reset request.")
        )
    return result

@router.post("/verify-reset-token")
def verify_reset_token_endpoint(req: VerifyResetTokenRequest):
    result = auth_controller.verify_reset_token(req.email, req.token)
    return result

@router.post("/reset-password")
def reset_password_endpoint(req: ResetPasswordRequest):
    result = auth_controller.complete_password_reset(req.email, req.token, req.newPassword)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to reset password.")
        )
    return result

class FirebaseTokenRequest(BaseModel):
    id_token: str
    phone: Optional[str] = None
    email: Optional[str] = None

@router.post("/verify-firebase-token")
def verify_firebase_token_endpoint(req: FirebaseTokenRequest):
    result = auth_controller.verify_firebase_token(req.id_token, req.phone, req.email)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Token verification failed.")
        )
    return result


class LoginRequest(BaseModel):
    identifier: str
    password: str


class RegisterRequest(BaseModel):
    """Self service registration for a student account."""

    name: str
    email: str
    password: str
    phone: Optional[str] = None
    country: Optional[str] = None
    department: Optional[str] = None
    topSubject: Optional[str] = None
    firebaseUid: Optional[str] = None


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_endpoint(req: RegisterRequest):
    """
    Creates (or refreshes) the MySQL row of a self registered student.

    Administrators and educators are never created here - they are managed by
    the admin through `/api/users/*`. Students register themselves, so their
    account lives in MySQL from the very first request.
    """
    name = (req.name or "").strip()
    email = (req.email or "").strip().lower()
    password = req.password or ""

    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id, role, student_id FROM users WHERE LOWER(email) = ?",
            (email,),
        ).fetchone()

        if existing and (existing.get("role") or "").lower() != "student":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already used by another role.",
            )

        # Re-use the row of an already registered student so the email stays
        # unique instead of creating a second account for the same person.
        if existing:
            student_id = existing.get("id")
            target_student_id = existing.get("student_id") or student_id
        else:
            student_id = (req.firebaseUid or "").strip() or f"stud-{email.split('@')[0]}"
            target_student_id = student_id

        conn.execute(
            """
            INSERT INTO users (
                id, name, email, role, department, top_subject, student_id,
                phone, country, password_hash, is_active, created_at, updated_at
            )
            VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                department = VALUES(department),
                top_subject = VALUES(top_subject),
                phone = VALUES(phone),
                country = VALUES(country),
                password_hash = COALESCE(VALUES(password_hash), password_hash),
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                student_id,
                name,
                email,
                req.department or req.topSubject or "General",
                req.topSubject or req.department or "General",
                target_student_id,
                req.phone or "",
                req.country or "",
                hash_password(password),
            ),
        )
        conn.commit()

        cur = conn.execute(
            "SELECT id, name, email, role, department, top_subject, student_id, phone, country, "
            "avatar_url, is_active FROM users WHERE LOWER(email) = ?",
            (email,),
        )
        row = dict(cur.fetchone())

        notification_service.log_activity(
            conn,
            {"id": row["id"], "name": row["name"], "role": "student"},
            action="student.registered",
            entity_type="user",
            entity_id=row["id"],
            summary=f"New student {row['name']} ({row['email']}) registered on LearnSmart",
            metadata={"department": row.get("department"), "topSubject": row.get("top_subject")},
        )
        notification_service.notify_admins(
            conn,
            title=f"New Student Registered: {row['name']}",
            message=f"{row['name']} ({row['email']}) registered an account.",
            category="user",
            link="/admin-dashboard",
            actor={"id": row["id"], "name": row["name"], "role": "student"},
        )
        conn.commit()


    return {
        "success": True,
        "user": {
            "uid": row["id"],
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "role": "student",
            "department": row.get("department"),
            "phone": row.get("phone"),
            "country": row.get("country"),
            "studentId": row.get("student_id") or row["id"],
            "topSubject": row.get("top_subject") or row.get("department") or "General",
            "avatarImage": row.get("avatar_url") or None,
        },
    }


@router.post("/login")
def login_endpoint(req: LoginRequest):
    """
    Verifies an email/identifier + password against the `users` table in MySQL.

    This is the credential check for accounts managed inside the platform
    (admin, educators and locally registered students). Passwords are stored
    as PBKDF2 hashes, never as plain text.
    """
    identifier = (req.identifier or "").strip().lower()
    password = req.password or ""

    if not identifier or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifier and password are required.",
        )

    with get_connection() as conn:
        cur = conn.execute(
            "SELECT id, name, email, role, department, phone, title, avatar_url, student_id, "
            "educator_id, is_active, password_hash FROM users "
            "WHERE LOWER(email) = ? OR LOWER(id) = ?",
            (identifier, identifier),
        )
        user = cur.fetchone()

        if not user or not verify_password(password, user.get("password_hash")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials.",
            )

        if not user.get("is_active", 1):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated.",
            )

        profile = {
            "uid": user["id"],
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": (user["role"] or "student").lower(),
            "department": user.get("department"),
            "phone": user.get("phone"),
            "title": user.get("title"),
            "avatarImage": user.get("avatar_url") or None,
            "studentId": user.get("student_id") or (user["id"] if (user["role"] or "") == "student" else None),
            "educatorId": user.get("educator_id") or (user["id"] if (user["role"] or "") == "educator" else None),
        }

        user_role = (user.get("role") or "student").lower()
        if user_role == "student":
            notification_service.log_activity(
                conn,
                {"id": user["id"], "name": user["name"], "role": "student"},
                action="student.login",
                entity_type="user",
                entity_id=user["id"],
                summary=f"Student {user['name']} signed in to LearnSmart",
                metadata={"email": user.get("email"), "department": user.get("department")},
            )
            conn.commit()

    return {"success": True, "user": profile}

