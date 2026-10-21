import sqlite3
import json
import os

DB_PATH = "database/learnsmart.db"
OUTPUT_SQL = "database/learnsmart_mysql_dump.sql"

def escape_sql_val(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    # String / JSON escaping
    s = str(val).replace("\\", "\\\\").replace("'", "\\'")
    return f"'{s}'"

def generate_mysql_dump():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    with open(OUTPUT_SQL, "w", encoding="utf-8") as out:
        out.write("-- LearnSmart MySQL Complete Data Dump\n")
        out.write("-- Generated to preserve all existing quizzes, questions, and attempts\n\n")
        out.write("CREATE DATABASE IF NOT EXISTS `learnsmart` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n")
        out.write("USE `learnsmart`;\n\n")

        # Include schema creation
        schema_file = "database/mysql_schema.sql"
        if os.path.exists(schema_file):
            with open(schema_file, "r", encoding="utf-8") as sf:
                out.write(sf.read())
            out.write("\n\n-- ================= DATA PRESERVATION INSERT STATEMENTS =================\n\n")

        # Dump quizzes
        quizzes = conn.execute("SELECT * FROM quizzes").fetchall()
        for q in quizzes:
            d = dict(q)
            cols = ", ".join(f"`{k}`" for k in d.keys())
            vals = ", ".join(escape_sql_val(v) for v in d.values())
            out.write(f"INSERT INTO `quizzes` ({cols}) VALUES ({vals}) ON DUPLICATE KEY UPDATE `id`=`id`;\n")

        out.write("\n")

        # Dump questions
        questions = conn.execute("SELECT * FROM questions").fetchall()
        for q in questions:
            d = dict(q)
            cols = ", ".join(f"`{k}`" for k in d.keys())
            vals = ", ".join(escape_sql_val(v) for v in d.values())
            out.write(f"INSERT INTO `questions` ({cols}) VALUES ({vals}) ON DUPLICATE KEY UPDATE `id`=`id`;\n")

        out.write("\n")

        # Dump quiz_attempts
        attempts = conn.execute("SELECT * FROM quiz_attempts").fetchall()
        for a in attempts:
            d = dict(a)
            cols = ", ".join(f"`{k}`" for k in d.keys())
            vals = ", ".join(escape_sql_val(v) for v in d.values())
            out.write(f"INSERT INTO `quiz_attempts` ({cols}) VALUES ({vals}) ON DUPLICATE KEY UPDATE `id`=`id`;\n")

        out.write("\n-- Dump completed successfully.\n")

    conn.close()
    print(f"MySQL dump generated successfully at {OUTPUT_SQL} ({len(quizzes)} quizzes, {len(questions)} questions, {len(attempts)} attempts preserved).")

if __name__ == "__main__":
    generate_mysql_dump()
