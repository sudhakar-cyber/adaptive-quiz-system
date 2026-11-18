import os
import ctypes
import logging
import sqlite3
from typing import Optional, Dict, Any, List
import pymysql
import pymysql.cursors

try:
    from config import config
except ImportError:
    config = None

logger = logging.getLogger("learnsmart.mysql")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MYSQL_SCHEMA_PATH = os.path.join(BASE_DIR, "..", "database", "mysql_schema.sql")
MYSQL_DUMP_PATH = os.path.join(BASE_DIR, "..", "database", "learnsmart_mysql_dump.sql")
MIGRATIONS_DIR = os.path.join(BASE_DIR, "..", "database", "migrations")
SQLITE_DB_PATH = os.path.join(BASE_DIR, "..", "database", "learnsmart.db")

def _get_windows_mysql_credential() -> str:
    """Safe Windows Credential Manager lookup for MySQL Workbench stored passwords."""
    if os.name != "nt":
        return ""
    try:
        from ctypes import wintypes
        class CREDENTIAL(ctypes.Structure):
            _fields_ = [
                ("Flags", wintypes.DWORD), ("Type", wintypes.DWORD), ("TargetName", wintypes.LPWSTR),
                ("Comment", wintypes.LPWSTR), ("LastWritten", wintypes.FILETIME),
                ("CredentialBlobSize", wintypes.DWORD), ("CredentialBlob", ctypes.POINTER(ctypes.c_byte)),
                ("Persist", wintypes.DWORD), ("AttributeCount", wintypes.DWORD),
                ("Attributes", ctypes.c_void_p), ("TargetAlias", wintypes.LPWSTR), ("UserName", wintypes.LPWSTR),
            ]
        advapi32 = ctypes.windll.advapi32
        CredReadW = advapi32.CredReadW
        CredReadW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(ctypes.POINTER(CREDENTIAL))]
        CredReadW.restype = wintypes.BOOL
        for target in [
            "Oracle|mysql-secret-store-windows-credential|password|root@127.0.0.1:3306",
            "Oracle|mysql-secret-store-windows-credential|password|root@localhost:3306"
        ]:
            p_cred = ctypes.POINTER(CREDENTIAL)()
            if CredReadW(target, 1, 0, ctypes.byref(p_cred)):
                return bytes(p_cred.contents.CredentialBlob[:p_cred.contents.CredentialBlobSize]).decode("utf-8")
    except Exception:
        pass
    return ""

def _resolve_password() -> str:
    pwd = getattr(config, "MYSQL_PASSWORD", "") if config else ""
    if not pwd:
        pwd = os.getenv("MYSQL_PASSWORD", "")
    if not pwd and os.name == "nt":
        win_pwd = _get_windows_mysql_credential()
        if win_pwd:
            return win_pwd
    return pwd

class MySQLCursorWrapper:
    def __init__(self, raw_cursor):
        self.raw_cursor = raw_cursor

    def fetchall(self) -> List[Dict[str, Any]]:
        rows = self.raw_cursor.fetchall()
        return rows if rows is not None else []

    def fetchone(self) -> Optional[Dict[str, Any]]:
        return self.raw_cursor.fetchone()

    @property
    def rowcount(self) -> int:
        return self.raw_cursor.rowcount

class MySQLConnectionWrapper:
    def __init__(self, raw_conn: pymysql.Connection):
        self.raw_conn = raw_conn

    def execute(self, query: str, params: Optional[Any] = None):
        cur = self.raw_conn.cursor(pymysql.cursors.DictCursor)
        if params is not None and (isinstance(params, (list, tuple, dict)) and len(params) > 0):
            mysql_query = self._to_mysql_placeholders(query)
            cur.execute(mysql_query, params)
        else:
            cur.execute(query)
        return MySQLCursorWrapper(cur)

    @staticmethod
    def _to_mysql_placeholders(query: str) -> str:
        """
        Converts `?` placeholders to `%s` and escapes literal percent signs.

        pymysql interpolates the query with Python's `%` operator whenever
        parameters are supplied, so any literal `%` in the SQL (for example
        `DATE_FORMAT(x, '%Y-%m')`) has to be doubled to survive the round trip.
        """
        segments = query.split("?")
        escaped = [segment.replace("%", "%%") for segment in segments]
        return "%s".join(escaped)

    def executescript(self, script: str):
        with self.raw_conn.cursor() as cur:
            for statement in script.split(";"):
                stmt = statement.strip()
                clean = "\n".join(l for l in stmt.split("\n") if not l.strip().startswith("--")).strip()
                if clean:
                    cur.execute(clean)

    def commit(self):
        self.raw_conn.commit()

    def rollback(self):
        self.raw_conn.rollback()

    def close(self):
        self.raw_conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.rollback()
        else:
            self.commit()
        self.close()

class SQLiteCursorWrapper:
    def __init__(self, raw_cursor):
        self.raw_cursor = raw_cursor

    def fetchall(self) -> List[Dict[str, Any]]:
        rows = self.raw_cursor.fetchall()
        return [dict(r) for r in rows] if rows is not None else []

    def fetchone(self) -> Optional[Dict[str, Any]]:
        row = self.raw_cursor.fetchone()
        return dict(row) if row is not None else None

    @property
    def rowcount(self) -> int:
        return self.raw_cursor.rowcount

class SQLiteConnectionWrapper:
    def __init__(self, raw_conn: sqlite3.Connection):
        self.raw_conn = raw_conn
        self.raw_conn.row_factory = sqlite3.Row

    def execute(self, query: str, params: Optional[Any] = None):
        adapted_query = query
        if "ON DUPLICATE KEY UPDATE" in adapted_query:
            prefix, _, _ = adapted_query.partition("ON DUPLICATE KEY UPDATE")
            if prefix.strip().upper().startswith("INSERT INTO"):
                adapted_query = prefix.replace("INSERT INTO", "INSERT OR REPLACE INTO", 1)
        elif "SHOW TABLES LIKE" in adapted_query:
            parts = adapted_query.split("'")
            tbl = parts[1] if len(parts) > 1 else ""
            adapted_query = f"SELECT name FROM sqlite_master WHERE type='table' AND name='{tbl}'"
            params = None

        cur = self.raw_conn.cursor()
        if params is not None and (isinstance(params, (list, tuple, dict)) and len(params) > 0):
            cur.execute(adapted_query, params)
        else:
            cur.execute(adapted_query)
        return SQLiteCursorWrapper(cur)

    def executescript(self, script: str):
        self.raw_conn.executescript(script)

    def commit(self):
        self.raw_conn.commit()

    def rollback(self):
        self.raw_conn.rollback()

    def close(self):
        self.raw_conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.rollback()
        else:
            self.commit()
        self.close()

def _sqlite_substring_index(text, delim, count):
    if not text or not delim:
        return text or ""
    parts = str(text).split(str(delim))
    c = int(count)
    if c > 0:
        return delim.join(parts[:c])
    elif c < 0:
        return delim.join(parts[c:])
    return ""

def _sqlite_greatest(*args):
    valid = [a for a in args if a is not None]
    return max(valid) if valid else None

def _sqlite_concat(*args):
    return "".join(str(a) for a in args if a is not None)

_ACTIVE_ENGINE = "mysql"

def get_connection():
    """
    Connects to MySQL database, falling back gracefully to SQLite database if MySQL server is offline.
    """
    global _ACTIVE_ENGINE
    host = getattr(config, "MYSQL_HOST", "127.0.0.1") if config else "127.0.0.1"
    port = getattr(config, "MYSQL_PORT", 3306) if config else 3306
    user = getattr(config, "MYSQL_USER", "root") if config else "root"
    password = _resolve_password()
    database = getattr(config, "MYSQL_DATABASE", "learnsmart") if config else "learnsmart"

    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=2,
            autocommit=False
        )
        _ACTIVE_ENGINE = "mysql"
        return MySQLConnectionWrapper(conn)
    except Exception as e:
        logger.debug(f"MySQL connection failed on {host}:{port}: {e}. Falling back to SQLite.")
        _ACTIVE_ENGINE = "sqlite"
        if not os.path.exists(SQLITE_DB_PATH):
            os.makedirs(os.path.dirname(SQLITE_DB_PATH), exist_ok=True)
        sqlite_conn = sqlite3.connect(SQLITE_DB_PATH, check_same_thread=False)
        sqlite_conn.create_function("SUBSTRING_INDEX", 3, _sqlite_substring_index)
        sqlite_conn.create_function("GREATEST", -1, _sqlite_greatest)
        sqlite_conn.create_function("CONCAT", -1, _sqlite_concat)
        return SQLiteConnectionWrapper(sqlite_conn)

def get_active_engine() -> str:
    """Returns 'mysql' or 'sqlite'."""
    return _ACTIVE_ENGINE

def apply_migrations(conn) -> list:
    """
    Applies every unapplied SQL file in database/migrations in filename order.
    Applied files are recorded in schema_migrations so each one runs exactly once.
    """
    if not os.path.isdir(MIGRATIONS_DIR):
        return []

    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations ("
        "filename VARCHAR(255) PRIMARY KEY, "
        "applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    )

    cur = conn.execute("SELECT filename FROM schema_migrations")
    applied = {row["filename"] for row in cur.fetchall()}

    executed = []
    for filename in sorted(os.listdir(MIGRATIONS_DIR)):
        if not filename.endswith(".sql"):
            continue
        if filename in applied:
            continue
        path = os.path.join(MIGRATIONS_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.execute("INSERT INTO schema_migrations (filename) VALUES (?)", (filename,))
        executed.append(filename)

    if executed:
        logger.info(f"Applied MySQL migrations: {', '.join(executed)}")
    return executed


def _purge_default_students(conn):
    """Guarantees default / demo student accounts and dummy records are purged from MySQL."""
    default_ids = (
        'stud-102',
        'stud-aarav-sharma',
        'stud-ananya-iyer',
        'stud-kavya-reddy',
        'stud-priya-patel',
        'stud-rohan-verma',
        'student-1',
        'usr_1793448563819'
    )
    placeholders = ",".join(["?"] * len(default_ids))
    try:
        conn.execute(f"DELETE FROM educator_students WHERE student_id IN ({placeholders})", default_ids)
        conn.execute(
            f"DELETE FROM quiz_attempts WHERE student_id IN ({placeholders}) OR LOWER(student_email) LIKE '%@learnsmart.edu' OR LOWER(student_email) = 'student@learnsmart.com'",
            default_ids
        )
        conn.execute(
            f"DELETE FROM notifications WHERE recipient_id IN ({placeholders}) OR recipient_id LIKE 'stud-%'",
            default_ids
        )
        conn.execute(
            f"DELETE FROM activity_log WHERE actor_id IN ({placeholders})",
            default_ids
        )
        conn.execute(
            f"DELETE FROM users WHERE role = 'student' AND (id IN ({placeholders}) OR LOWER(email) LIKE '%@learnsmart.edu' OR LOWER(email) = 'student@learnsmart.com' OR LOWER(name) LIKE '%demo%')",
            default_ids
        )
        conn.commit()
    except Exception as e:
        logger.warning(f"Purge default students check: {e}")


def _ensure_seed_credentials(conn):
    """
    Ensures built-in admin and educator accounts exist with valid password hashes.
    """
    seed_accounts = [
        (os.getenv("ADMIN_SEED_EMAIL", "admin@learnsmart.edu"),
         os.getenv("ADMIN_SEED_PASSWORD", "Admin@123"),
         "admin-system", "System Administrator", "admin", "Administration", "System Administrator"),
        (os.getenv("EDUCATOR_SEED_EMAIL", "educator@learnsmart.com"),
         os.getenv("EDUCATOR_SEED_PASSWORD", "Educator@123"),
         "edu-201", "Dr. Sarah Jenkins", "educator", "Computer Science", "Faculty Member"),
    ]
    for email, password, uid, name, role, dept, title in seed_accounts:
        if not email or not password:
            continue
        try:
            cur = conn.execute(
                "SELECT id, password_hash FROM users WHERE LOWER(email) = ?",
                (email.strip().lower(),),
            )
            row = cur.fetchone()
            from app.services.passwords import hash_password
            hashed = hash_password(password)

            if not row:
                conn.execute(
                    """
                    INSERT INTO users (id, name, email, role, department, title, is_active, password_hash, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """,
                    (uid, name, email.strip().lower(), role, dept, title, hashed)
                )
                conn.commit()
                logger.info(f"Seeded default account for {email}")
            elif not row.get("password_hash"):
                conn.execute(
                    "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (hashed, row["id"]),
                )
                conn.commit()
                logger.info(f"Seeded default password hash for {email}")
        except Exception as e:
            logger.warning(f"Could not seed credentials for {email}: {e}")


def init_db():
    """Initializes tables and ensures MySQL schema & existing data dump are loaded."""
    host = getattr(config, "MYSQL_HOST", "127.0.0.1") if config else "127.0.0.1"
    port = getattr(config, "MYSQL_PORT", 3306) if config else 3306
    user = getattr(config, "MYSQL_USER", "root") if config else "root"
    password = _resolve_password()
    database = getattr(config, "MYSQL_DATABASE", "learnsmart") if config else "learnsmart"

    try:
        # First ensure database exists on MySQL server
        server_conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            charset="utf8mb4",
            connect_timeout=3
        )
        with server_conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        server_conn.commit()
        server_conn.close()

        # Connect to target database
        with get_connection() as conn:
            # Check if quizzes table exists and has rows
            cur = conn.execute("SHOW TABLES LIKE 'quizzes'")
            has_table = cur.fetchone()
            quizzes_count = 0
            if has_table:
                count_cur = conn.execute("SELECT COUNT(*) as c FROM quizzes")
                row = count_cur.fetchone()
                quizzes_count = row.get("c", 0) if row else 0

            if not has_table and os.path.exists(MYSQL_DUMP_PATH):
                with open(MYSQL_DUMP_PATH, "r", encoding="utf-8") as f:
                    dump_sql = f.read()
                conn.executescript(dump_sql)
                logger.info("MySQL tables and preserved data initialized from learnsmart_mysql_dump.sql.")
            elif not has_table and os.path.exists(MYSQL_SCHEMA_PATH):
                with open(MYSQL_SCHEMA_PATH, "r", encoding="utf-8") as f:
                    schema_sql = f.read()
                conn.executescript(schema_sql)
                logger.info("MySQL schema initialized from mysql_schema.sql.")

            apply_migrations(conn)
            _ensure_seed_credentials(conn)
            _purge_default_students(conn)
    except Exception as e:
        logger.warning(f"MySQL initialization check: {e}")

# Run initialization upon module import
try:
    init_db()
except Exception:
    pass
