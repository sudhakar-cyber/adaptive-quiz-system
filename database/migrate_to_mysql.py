import pymysql
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))
from config import config

def migrate_to_mysql():
    host = getattr(config, "MYSQL_HOST", "127.0.0.1")
    port = getattr(config, "MYSQL_PORT", 3306)
    user = getattr(config, "MYSQL_USER", "root")
    password = getattr(config, "MYSQL_PASSWORD", "")
    database = getattr(config, "MYSQL_DATABASE", "learnsmart")

    print(f"Connecting to MySQL at {host}:{port} as user '{user}'...")
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            charset="utf8mb4",
            connect_timeout=5
        )
        print("Connected to MySQL server successfully!")

        dump_file = os.path.join(BASE_DIR, "database", "learnsmart_mysql_dump.sql")
        if not os.path.exists(dump_file):
            print(f"Dump file not found: {dump_file}")
            return False

        with open(dump_file, "r", encoding="utf-8") as f:
            sql_statements = f.read()

        with conn.cursor() as cur:
            for statement in sql_statements.split(";"):
                stmt = statement.strip()
                stmt_clean = "\n".join(l for l in stmt.split("\n") if not l.strip().startswith("--")).strip()
                if stmt_clean:
                    cur.execute(stmt_clean)

        conn.commit()
        conn.close()
        print(f"Data migration succeeded! MySQL database '{database}' is fully populated.")
        return True
    except Exception as e:
        print(f"MySQL migration error: {e}")
        return False

if __name__ == "__main__":
    migrate_to_mysql()
