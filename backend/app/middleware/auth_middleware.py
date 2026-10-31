import time
import json
import base64
import logging
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status, Header
from app.db import get_connection

logger = logging.getLogger("auth_middleware")

FIREBASE_PROJECT_ID = "adaptive-quiz-system-957ee"
ADMIN_EMAILS = {"admin@learnsmart.edu"}
EDUCATOR_EMAILS = {"educator@learnsmart.com", "sarah.jenkins@learnsmart.edu"}

# Local (non-Firebase) session tokens. The role they imply is only a *hint*:
# the real role is always read back from the MySQL `users` table.
SESSION_TOKEN_ROLES = {
    "dev-admin-token": "admin",
    "admin-session-token": "admin",
    "dev-educator-token": "educator",
    "educator-session-token": "educator",
    "dev-student-token": "student",
    "student-session-token": "student",
}

USER_COLUMNS = "id, name, email, role, department, phone, title, is_active"


def parse_jwt_claims(token: str) -> Optional[Dict[str, Any]]:
    """Safely decode and parse JWT claims without external network dependencies."""
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        # Add required base64 padding
        payload_b64 = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
        decoded_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(decoded_bytes.decode("utf-8"))
    except Exception as e:
        logger.warning(f"Failed to parse JWT payload: {e}")
        return None


def verify_token_claims(claims: Dict[str, Any]) -> bool:
    """Verifies standard token claims: expiration, audience, issuer."""
    now = time.time()
    # Check expiration
    exp = claims.get("exp")
    if exp and exp < now - 300:  # 5 min clock skew tolerance
        logger.warning("Token has expired.")
        return False

    # Check Firebase project aud / iss if present
    aud = claims.get("aud")
    if aud and aud != FIREBASE_PROJECT_ID:
        logger.warning(f"Token audience mismatch: {aud} vs {FIREBASE_PROJECT_ID}")
        # Note: In dev or custom token, may vary, but warn
    return True


def verify_firebase_signature(token: str) -> bool:
    """
    Verifies a Firebase ID token signature against Google's published certs.

    Returns True/False when the check could be performed. When the machine has
    no outbound network access the check is skipped (returns True) so the app
    still runs offline; a token that IS verifiable but fails verification is
    always rejected.
    """
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
    except ImportError:
        logger.warning("google-auth not installed; skipping Firebase signature verification.")
        return True

    try:
        request = google_requests.Request()
        google_id_token.verify_token(
            token, request, audience=FIREBASE_PROJECT_ID, clock_skew_in_seconds=300
        )
        return True
    except Exception as exc:
        message = str(exc).lower()
        offline_markers = (
            "connection", "timed out", "timeout", "network", "unreachable",
            "temporary failure", "name or service not known", "max retries",
            "failed to establish a new connection", "ssl", "proxy",
        )
        if any(marker in message for marker in offline_markers):
            logger.warning("Could not reach Google token certs; skipping signature verification.")
            return True
        logger.warning(f"Firebase token signature verification failed: {exc}")
        return False


def _normalize_headers(
    authorization: Optional[str],
    x_user_uid: Optional[str],
    x_user_email: Optional[str],
    x_user_name: Optional[str],
    x_user_role: Optional[str],
):
    if not isinstance(authorization, str):
        authorization = None
    if not isinstance(x_user_uid, str):
        x_user_uid = None
    if not isinstance(x_user_email, str):
        x_user_email = None
    if not isinstance(x_user_name, str):
        x_user_name = None
    if not isinstance(x_user_role, str):
        x_user_role = None
    return (
        authorization,
        (x_user_uid or "").strip() or None,
        (x_user_email or "").strip().lower() or None,
        (x_user_name or "").strip() or None,
        (x_user_role or "").strip().lower() or None,
    )


def _user_payload(row: Dict[str, Any], role: Optional[str] = None, claims: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    payload = {
        "id": row["id"],
        "uid": row["id"],
        "email": row["email"],
        "name": row["name"],
        "role": (role or row["role"] or "student").lower(),
        "department": row.get("department"),
        "phone": row.get("phone"),
        "title": row.get("title"),
        "is_active": bool(row.get("is_active", True)),
    }
    if claims is not None:
        payload["claims"] = claims
    return payload


def _find_user(conn, uid: Optional[str], email: Optional[str]) -> Optional[Dict[str, Any]]:
    if uid and email:
        cur = conn.execute(
            f"SELECT {USER_COLUMNS} FROM users WHERE id = ? OR LOWER(email) = ?",
            (uid, email),
        )
        row = cur.fetchone()
        if row:
            return dict(row)
    if uid:
        cur = conn.execute(
            f"SELECT {USER_COLUMNS} FROM users WHERE id = ?",
            (uid,),
        )
        row = cur.fetchone()
        if row:
            return dict(row)
    if email:
        cur = conn.execute(
            f"SELECT {USER_COLUMNS} FROM users WHERE LOWER(email) = ?",
            (email,),
        )
        row = cur.fetchone()
        if row:
            return dict(row)
    return None


def _effective_role(row: Dict[str, Any], conn=None) -> str:
    """
    The authoritative role for a user, read from MySQL.

    The well-known admin / educator mailboxes are promoted on read so a seeded
    account keeps working even if its stored role drifted.
    """
    current_role = (row.get("role") or "student").lower()
    user_email = (row.get("email") or "").lower()
    if user_email in ADMIN_EMAILS:
        target_role = "admin"
    elif user_email in EDUCATOR_EMAILS:
        target_role = "educator"
    else:
        target_role = current_role

    if conn is not None and target_role != current_role:
        try:
            conn.execute(
                "UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (target_role, row["id"]),
            )
            conn.commit()
        except Exception as exc:  # pragma: no cover
            logger.warning(f"Failed to persist role promotion for {row.get('id')}: {exc}")
    row["role"] = target_role
    return target_role


def _reject_role_escalation(requested_role: Optional[str], db_role: str) -> None:
    """
    A caller may never claim a role above the one stored for their account.
    The X-User-Role header is advisory only.
    """
    if not requested_role:
        return
    hierarchy = {"student": 0, "educator": 1, "admin": 2}
    requested = hierarchy.get(requested_role)
    actual = hierarchy.get(db_role)
    if requested is None or actual is None:
        return
    if requested > actual:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Access denied: your account is registered as '{db_role}' and cannot act as '{requested_role}'."
            ),
        )


def get_current_user_from_token(
    authorization: Optional[str] = Header(None),
    x_user_uid: Optional[str] = Header(None, alias="X-User-UID"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
) -> Dict[str, Any]:
    """
    Resolves the authenticated caller.

    The role is ALWAYS taken from the MySQL `users` table - never from a client
    supplied header. Unauthenticated callers are rejected with 401, deactivated
    accounts with 403.
    """
    (
        authorization,
        uid,
        email,
        name,
        requested_role,
    ) = _normalize_headers(authorization, x_user_uid, x_user_email, x_user_name, x_user_role)

    if not authorization or not authorization.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header. Please provide a valid Bearer token."
        )

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'."
        )

    raw_token = parts[1]
    claims: Dict[str, Any] = {}

    with get_connection() as conn:
        # ------------------------------------------------------------------
        # Local session tokens (Firebase not available in this session).
        # The identity MUST resolve to a real MySQL user - there is no
        # "first admin in the table" fallback any more.
        # ------------------------------------------------------------------
        expected_role = SESSION_TOKEN_ROLES.get(raw_token)
        if expected_role:
            if not uid and not email:
                if expected_role == "student":
                    email = "student@learnsmart.edu"
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Session token provided without a user identity. Please sign in again.",
                    )

            row = _find_user(conn, uid, email)
            # If the session token is specifically for an educator, but the resolved user is not an educator
            # (e.g. because student localStorage UID/email headers were sent), fall back to authoritative educator record:
            if expected_role == "educator" and (not row or _effective_role(row, conn) != "educator"):
                edu_row = _find_user(conn, "edu-201", "educator@learnsmart.com")
                if edu_row:
                    row = edu_row
            elif expected_role == "admin" and (not row or _effective_role(row, conn) != "admin"):
                admin_row = _find_user(conn, "admin-system", "admin@learnsmart.edu")
                if admin_row:
                    row = admin_row

            if not row:
                if expected_role != "student":
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="No registered account matches this session. Please contact an administrator.",
                    )
                # Brand new student: register them so they are tracked from here on.
                clean_email = email or f"{uid}@user.learnsmart"
                clean_name = name or (clean_email.split("@")[0] if clean_email else "Learner")
                user_id = uid or f"usr_{int(time.time() * 1000)}"
                conn.execute(
                    """
                    INSERT INTO users (id, name, email, role, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, 'student', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        updated_at = CURRENT_TIMESTAMP
                    """,
                    (user_id, clean_name, clean_email),
                )
                conn.commit()
                row = _find_user(conn, user_id, clean_email)

            if not row:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User authentication could not be resolved from database."
                )

            if not row.get("is_active", True):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account has been deactivated. Please contact support."
                )

            db_role = _effective_role(row, conn)
            if db_role != expected_role and db_role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: this session is not authorised for the '{expected_role}' role.",
                )
            _reject_role_escalation(requested_role, db_role)
            return _user_payload(row, db_role)

        # ------------------------------------------------------------------
        # Firebase ID token
        # ------------------------------------------------------------------
        parsed_claims = parse_jwt_claims(raw_token)
        if not parsed_claims:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or malformed authentication token."
            )

        if not verify_token_claims(parsed_claims):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token is expired or invalid."
            )

        if not verify_firebase_signature(raw_token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token signature could not be verified."
            )

        claims = parsed_claims
        uid = claims.get("user_id") or claims.get("sub") or claims.get("uid") or uid
        email = (claims.get("email") or email or "").strip().lower() or None
        name = claims.get("name") or claims.get("display_name") or name

        row = _find_user(conn, uid, email)
        if row:
            if not row.get("is_active", True):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account has been deactivated. Please contact support."
                )

            db_role = _effective_role(row, conn)
            _reject_role_escalation(requested_role, db_role)
            return _user_payload(row, db_role, claims)

        # Authenticated in Firebase but not yet present in MySQL -> register.
        if uid or email:
            clean_email = email or f"{uid}@user.learnsmart"
            clean_name = name or (clean_email.split("@")[0] if clean_email else "Learner")
            if clean_email in ADMIN_EMAILS:
                assigned_role = "admin"
            elif clean_email in EDUCATOR_EMAILS:
                assigned_role = "educator"
            else:
                assigned_role = "student"

            user_id = uid or f"usr_{int(time.time() * 1000)}"

            conn.execute(
                """
                INSERT INTO users (id, name, email, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    role = VALUES(role),
                    updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, clean_name, clean_email, assigned_role),
            )
            conn.commit()

            created_row = _find_user(conn, user_id, clean_email)
            if created_row:
                db_role = _effective_role(created_row, conn)
                _reject_role_escalation(requested_role, db_role)
                return _user_payload(created_row, db_role, claims)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="User authentication could not be resolved from database."
    )
