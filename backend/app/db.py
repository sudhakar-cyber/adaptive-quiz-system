import os
import ctypes
import logging
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

def get_connection() -> MySQLConnectionWrapper:
    """
    Connects strictly and exclusively to MySQL database.
    """
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
            connect_timeout=4,
            autocommit=False
        )
        return MySQLConnectionWrapper(conn)
    except pymysql.MySQLError as e:
        logger.error(f"Failed to connect to MySQL database '{database}' on {host}:{port}: {e}")
        raise ConnectionError(
            f"MySQL connection failed: Unable to connect to MySQL server at {host}:{port} for database '{database}'. "
            f"Please verify your MySQL service is running and credentials in backend/.env are correct. Detail: {e}"
        ) from e

def get_active_engine() -> str:
    """Returns 'mysql' (Strictly MySQL only)."""
    return "mysql"

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


def _ensure_seed_credentials(conn):
    """
    Gives the built-in admin / educator accounts a usable password hash.

    Only accounts whose `password_hash` is still empty are touched, so an
    administrator changing a password in the dashboard is never overwritten.
    """
    seed_accounts = [
        (os.getenv("ADMIN_SEED_EMAIL", "admin@learnsmart.edu"),
         os.getenv("ADMIN_SEED_PASSWORD", "Admin@123")),
        (os.getenv("EDUCATOR_SEED_EMAIL", "educator@learnsmart.com"),
         os.getenv("EDUCATOR_SEED_PASSWORD", "Educator@123")),
    ]
    for email, password in seed_accounts:
        if not email or not password:
            continue
        try:
            cur = conn.execute(
                "SELECT id, password_hash FROM users WHERE LOWER(email) = ?",
                (email.strip().lower(),),
            )
            row = cur.fetchone()
            if not row or row.get("password_hash"):
                continue
            from app.services.passwords import hash_password
            conn.execute(
                "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (hash_password(password), row["id"]),
            )
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
    except Exception as e:
        logger.warning(f"MySQL initialization check: {e}")

# Run initialization upon module import
try:
    init_db()
except Exception:
    pass
