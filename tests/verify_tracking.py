"""
End-to-end verification of the student / educator / admin dashboard wiring.

Runs against the live MySQL database using FastAPI's TestClient.

    python tests/verify_tracking.py
"""

import os
import sys
import json

BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, BACKEND_DIR)

from fastapi.testclient import TestClient  # noqa: E402
import run as backend_app  # noqa: E402
from app.db import get_connection  # noqa: E402

client = TestClient(backend_app.app)

PASS = 0
FAIL = 0


def check(label, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  PASS  {label}")
    else:
        FAIL += 1
        print(f"  FAIL  {label} {detail}")


def headers(role, uid, email, name=None):
    h = {
        "Authorization": f"Bearer {role}-session-token",
        "X-User-Role": role,
        "X-User-UID": uid,
        "X-User-Email": email,
    }
    if name:
        h["X-User-Name"] = name
    return h


ADMIN = headers("admin", "admin-system", "admin@learnsmart.edu", "System Administrator")
EDUCATOR = headers("educator", "edu-201", "educator@learnsmart.com", "Dr. Sarah Jenkins")
STUDENT = headers("student", "test-student-1", "student.one@learnsmart.edu", "Student One")


def reset_data():
    with get_connection() as conn:
        conn.execute("DELETE FROM quiz_attempts WHERE student_email = ?", ("student.one@learnsmart.edu",))
        conn.execute("DELETE FROM quizzes WHERE id LIKE 'verify-%'")
        conn.execute("DELETE FROM users WHERE email IN ('student.one@learnsmart.edu', 'educator.two@learnsmart.com')")
        conn.execute("DELETE FROM educator_students WHERE student_id = 'test-student-1'")
        conn.execute("DELETE FROM notifications")
        conn.execute("DELETE FROM activity_log")
        conn.commit()


def educator_quiz_count():
    """How many quizzes the primary educator can currently see."""
    with get_connection() as conn:
        cur = conn.execute(
            "SELECT COUNT(*) AS n FROM quizzes WHERE author_id = ? OR LOWER(author_name) = LOWER(?)",
            ("edu-201", "Dr. Sarah Jenkins"),
        )
        row = cur.fetchone()
        return int((row or {}).get("n") or 0)


def main():
    reset_data()
    print("\n== 1. Authentication & role resolution ==")

    r = client.get("/api/users/me", headers=ADMIN)
    check("admin resolves from DB", r.status_code == 200 and r.json().get("role") == "admin", r.text[:200])

    r = client.get("/api/users/me", headers=EDUCATOR)
    check("educator resolves from DB", r.status_code == 200 and r.json().get("role") == "educator", r.text[:200])

    r = client.get("/api/users/me", headers=STUDENT)
    check("student resolves from DB", r.status_code == 200 and r.json().get("role") == "student", r.text[:200])

    r = client.get("/api/users/me")
    check("missing token -> 401", r.status_code == 401, r.status_code)

    forged = headers("admin", "test-student-1", "student.one@learnsmart.edu")
    r = client.get("/api/users/me", headers=forged)
    check("role escalation via header -> 403", r.status_code == 403, r.text[:200])

    spoof = {
        "Authorization": "Bearer admin-session-token",
        "X-User-Role": "admin",
        "X-User-UID": "test-student-1",
        "X-User-Email": "student.one@learnsmart.edu",
    }
    r = client.get("/api/users/me", headers=spoof)
    check("student using admin session token -> 403", r.status_code == 403, r.text[:200])

    print("\n== 2. Role guards on read endpoints ==")

    r = client.get("/api/users/students", headers=STUDENT)
    check("student cannot read roster -> 403", r.status_code == 403, r.text[:200])

    r = client.get("/api/users/educators", headers=STUDENT)
    check("student cannot read educators -> 403", r.status_code == 403, r.text[:200])

    r = client.get("/api/results/analytics", headers=STUDENT)
    check("student cannot read platform analytics -> 403", r.status_code == 403, r.text[:200])

    r = client.get("/api/analytics/overview", headers=STUDENT)
    check("student cannot read overview -> 403", r.status_code == 403, r.text[:200])

    r = client.get("/api/users/educators", headers=EDUCATOR)
    check("educator reads own educator record", r.status_code == 200 and len(r.json()) == 1, r.text[:200])

    r = client.get("/api/users/educators", headers=ADMIN)
    check("admin reads all educators", r.status_code == 200 and len(r.json()) >= 1, r.text[:200])

    print("\n== 3. Admin-only user management ==")

    r = client.post("/api/users/students", headers=EDUCATOR, json={
        "name": "Nope", "email": "nope@learnsmart.edu",
    })
    check("educator cannot create students -> 403", r.status_code == 403, r.text[:200])

    r = client.post("/api/users/students", headers=ADMIN, json={
        "name": "Student One", "email": "student.one@learnsmart.edu", "studentId": "test-student-1",
        "department": "Computer Science",
    })
    check("admin creates student -> 201", r.status_code == 201, r.text[:200])

    r = client.post("/api/users/educators", headers=EDUCATOR, json={
        "name": "Second Educator", "email": "educator.two@learnsmart.com",
    })
    check("educator cannot create educators -> 403", r.status_code == 403, r.text[:200])

    r = client.post("/api/users/educators", headers=ADMIN, json={
        "name": "Educator Two", "email": "educator.two@learnsmart.com", "educatorId": "edu-202",
    })
    check("admin creates educator -> 201", r.status_code == 201, r.text[:200])

    print("\n== 4. Quiz ownership ==")

    quizzes_before = educator_quiz_count()

    quiz_payload = {
        "id": "verify-quiz-1",
        "title": "Verification Quiz",
        "category": "Programming",
        "status": "Active",
        "questions": [
            {"question": "2 + 2 = ?", "options": ["3", "4", "5", "6"], "correctIndex": 1, "explanation": "basic"},
            {"question": "3 x 3 = ?", "options": ["6", "9", "12", "15"], "correctIndex": 1, "explanation": "basic"},
        ],
    }
    r = client.post("/api/quizzes", headers=EDUCATOR, json=quiz_payload)
    check("educator creates quiz -> 201", r.status_code == 201, r.text[:300])
    created = r.json() if r.status_code == 201 else {}
    check("quiz authored by educator", created.get("author_id") == "edu-201", created.get("author_id"))

    r = client.get("/api/quizzes", headers=STUDENT)
    student_quiz_ids = [q["id"] for q in r.json()] if r.status_code == 200 else []
    check("student sees published quiz", "verify-quiz-1" in student_quiz_ids, student_quiz_ids)

    # Educator two must not be able to edit educator one's quiz.
    edu2 = headers("educator", "edu-202", "educator.two@learnsmart.com", "Educator Two")
    r = client.put("/api/quizzes/verify-quiz-1", headers=edu2, json={**quiz_payload, "title": "Hijacked"})
    check("other educator cannot edit quiz -> 403", r.status_code == 403, r.text[:200])

    r = client.delete("/api/quizzes/verify-quiz-1", headers=edu2)
    check("other educator cannot delete quiz -> 403", r.status_code == 403, r.text[:200])

    r = client.put("/api/quizzes/verify-quiz-1", headers=ADMIN, json={**quiz_payload, "title": "Renamed By Admin"})
    check("admin can edit any quiz -> 200", r.status_code == 200, r.text[:200])

    print("\n== 5. Student attempt -> educator tracking ==")

    r = client.post("/api/quizzes/verify-quiz-1/attempt", headers=STUDENT, json={
        "answers": {"0": 1, "1": 1},
    })
    check("student submits attempt -> 200", r.status_code == 200, r.text[:300])
    attempt = r.json() if r.status_code == 200 else {}
    check("attempt graded server-side (100%)", attempt.get("percentage") == 100.0, attempt.get("percentage"))
    check("attempt marked Passed", attempt.get("status") == "Passed", attempt.get("status"))

    r = client.post("/api/quizzes/verify-quiz-1/attempt", headers=EDUCATOR, json={"answers": {"0": 1}})
    check("educator cannot submit attempt -> 403", r.status_code == 403, r.text[:200])

    r = client.get("/api/users/students", headers=EDUCATOR)
    roster = r.json() if r.status_code == 200 else []
    check("educator cohort contains the student", any(s["email"] == "student.one@learnsmart.edu" for s in roster),
          [s.get("email") for s in roster])
    entry = next((s for s in roster if s["email"] == "student.one@learnsmart.edu"), {})
    check("cohort student shows 1 completed quiz", entry.get("quizzesCompleted") == 1, entry.get("quizzesCompleted"))
    check("cohort student avg score 100", entry.get("avgScore") == 100.0, entry.get("avgScore"))

    r = client.get("/api/users/students", headers=ADMIN)
    admin_roster = r.json() if r.status_code == 200 else []
    check("admin sees the student too", any(s["email"] == "student.one@learnsmart.edu" for s in admin_roster))

    r = client.get("/api/results/submissions", headers=STUDENT)
    own = r.json() if r.status_code == 200 else []
    check("student sees only own submissions", len(own) == 1 and own[0]["studentEmail"] == "student.one@learnsmart.edu",
          own)

    r = client.get("/api/results/submissions", headers=EDUCATOR)
    edu_subs = r.json() if r.status_code == 200 else []
    check("educator sees cohort submissions", len(edu_subs) >= 1, len(edu_subs))

    r = client.get("/api/results/submissions", headers=ADMIN)
    admin_subs = r.json() if r.status_code == 200 else []
    check("admin sees all submissions", len(admin_subs) >= 1, len(admin_subs))

    print("\n== 6. Cross-role notifications ==")

    r = client.get("/api/notifications", headers=EDUCATOR)
    payload = r.json() if r.status_code == 200 else {}
    edu_notifs = payload.get("notifications", [])
    check("educator notified about attempt", any("submitted" in n["title"] for n in edu_notifs),
          [n["title"] for n in edu_notifs])
    check("educator has unread count", payload.get("unreadCount", 0) >= 1, payload.get("unreadCount"))

    r = client.get("/api/notifications", headers=ADMIN)
    admin_notifs = r.json().get("notifications", [])
    check("admin notified about quiz creation", any("Verification Quiz" in n["title"] for n in admin_notifs),
          [n["title"] for n in admin_notifs])

    r = client.get("/api/notifications", headers=STUDENT)
    student_payload = r.json() if r.status_code == 200 else {}
    student_notifs = student_payload.get("notifications", [])
    check("student is notified about the published quiz",
          any("New Quiz" in n["title"] for n in student_notifs),
          [n["title"] for n in student_notifs])
    new_quiz_notifs = [n for n in student_notifs if "New Quiz" in n["title"]]
    check("editing a published quiz does not notify the students again",
          len(new_quiz_notifs) == 1,
          [n["title"] for n in new_quiz_notifs])
    check("student does not receive educator only notifications",
          not any("submitted" in n["title"] for n in student_notifs),
          [n["title"] for n in student_notifs])

    notif_id = edu_notifs[0]["id"] if edu_notifs else None
    if notif_id:
        r = client.post(f"/api/notifications/{notif_id}/read", headers=EDUCATOR)
        check("educator can mark own notification read", r.status_code == 200, r.text[:200])
        r = client.post(f"/api/notifications/{notif_id}/read", headers=ADMIN)
        check("cannot read someone else's notification -> 404", r.status_code == 404, r.text[:200])

    r = client.post("/api/notifications", headers=EDUCATOR, json={
        "title": "Cohort message", "message": "Well done", "recipientType": "student",
    })
    check("educator can notify cohort", r.status_code == 201 and r.json().get("sent", 0) >= 1, r.text[:200])

    print("\n== 7. Activity feed ==")

    r = client.get("/api/activity", headers=ADMIN)
    entries = r.json().get("entries", []) if r.status_code == 200 else []
    check("admin sees activity feed", len(entries) >= 3, len(entries))
    check("activity records attempt submission",
          any(e["action"] == "attempt.submitted" for e in entries), [e["action"] for e in entries])

    r = client.get("/api/activity", headers=EDUCATOR)
    edu_entries = r.json().get("entries", []) if r.status_code == 200 else []
    check("educator sees own-scoped activity", len(edu_entries) >= 1, len(edu_entries))

    r = client.get("/api/activity", headers=STUDENT)
    student_entries = r.json().get("entries", []) if r.status_code == 200 else []
    check("student sees only own activity",
          all(e.get("actorId") == "test-student-1" or e.get("entityId") == "test-student-1" for e in student_entries),
          student_entries)

    print("\n== 8. Role-scoped analytics ==")

    r = client.get("/api/analytics/overview", headers=ADMIN)
    admin_overview = r.json() if r.status_code == 200 else {}
    check("admin overview counts the student", admin_overview.get("totalStudents", 0) >= 1,
          admin_overview.get("totalStudents"))

    r = client.get("/api/analytics/overview", headers=EDUCATOR)
    edu_overview = r.json() if r.status_code == 200 else {}
    check("educator overview scoped to cohort", edu_overview.get("totalStudents") == 1,
          edu_overview.get("totalStudents"))
    check("educator overview scoped to own quizzes",
          edu_overview.get("totalQuizzes") == quizzes_before + 1,
          f"{edu_overview.get('totalQuizzes')} (expected {quizzes_before + 1})")

    r = client.get("/api/analytics", headers=EDUCATOR)
    edu_analytics = r.json() if r.status_code == 200 else {}
    check("educator analytics scope tagged", edu_analytics.get("scope", {}).get("role") == "educator",
          edu_analytics.get("scope"))
    check("educator analytics avg score 100%", edu_analytics.get("kpis", {}).get("avgScore") == "100%",
          edu_analytics.get("kpis"))

    r = client.get("/api/analytics/categories", headers=EDUCATOR)
    cats = r.json().get("categories", []) if r.status_code == 200 else []
    check("educator category distribution scoped", len(cats) == 1 and cats[0]["name"] == "Programming", cats)

    print("\n== 8b. Student class benchmark ==")

    r = client.get("/api/analytics/student-benchmark", headers=STUDENT)
    benchmark = r.json() if r.status_code == 200 else {}
    check("student can read the anonymised class benchmark", r.status_code == 200, r.text[:200])
    check("benchmark mean reflects the real attempt", benchmark.get("meanScore") == 100.0,
          benchmark.get("meanScore"))
    check("benchmark tracks the student's quiz ids",
          benchmark.get("quizIds") == ["verify-quiz-1"], benchmark.get("quizIds"))
    check("benchmark groups scores by real category",
          benchmark.get("subjects", {}).get("Programming", {}).get("count") == 1,
          benchmark.get("subjects"))
    check("benchmark reports the cohort size", benchmark.get("cohortSize", 0) >= 1,
          benchmark.get("cohortSize"))
    check("benchmark exposes available quizzes per category",
          benchmark.get("availableByCategory", {}).get("Programming", 0) >= 1,
          benchmark.get("availableByCategory"))

    r = client.get("/api/analytics/student-benchmark", headers=EDUCATOR)
    check("educator cannot read the student benchmark -> 403", r.status_code == 403, r.text[:200])

    print("\n== 9. Admin explicit cohort assignment ==")

    r = client.post("/api/users/students/test-student-1/assign", headers=ADMIN, json={"educatorId": "edu-202"})
    check("admin assigns student to educator -> 200", r.status_code == 200, r.text[:200])

    r = client.get("/api/users/students", headers=edu2)
    edu2_roster = r.json() if r.status_code == 200 else []
    check("assigned student appears in new educator's cohort",
          any(s["email"] == "student.one@learnsmart.edu" for s in edu2_roster),
          [s.get("email") for s in edu2_roster])

    r = client.post("/api/users/students/test-student-1/assign", headers=EDUCATOR, json={"educatorId": "edu-201"})
    check("educator cannot assign students -> 403", r.status_code == 403, r.text[:200])

    print("\n== 10. Self service registration & cohort management ==")

    r = client.post("/api/auth/register", json={
        "name": "Registered Student",
        "email": "registered.student@learnsmart.edu",
        "password": "Student@123",
        "phone": "+91 9000000000",
        "country": "India",
    })
    check("student can register through the backend", r.status_code == 201, r.text[:200])

    r = client.post("/api/auth/login", json={
        "identifier": "registered.student@learnsmart.edu",
        "password": "Student@123",
    })
    check("registered student can log in with the hashed password",
          r.status_code == 200 and r.json().get("user", {}).get("role") == "student", r.text[:200])

    r = client.post("/api/auth/login", json={
        "identifier": "registered.student@learnsmart.edu",
        "password": "wrong-password",
    })
    check("wrong password is rejected", r.status_code == 401, r.status_code)

    r = client.post("/api/auth/register", json={
        "name": "Registered Student",
        "email": "registered.student@learnsmart.edu",
        "password": "Another@123",
    })
    check("registering an existing student email re-uses the row", r.status_code == 201, r.text[:200])

    with get_connection() as conn:
        cur = conn.execute(
            "SELECT COUNT(*) AS n FROM users WHERE LOWER(email) = ?",
            ("registered.student@learnsmart.edu",),
        )
        row = cur.fetchone()
        check("no duplicate student row was created", int((row or {}).get("n") or 0) == 1,
              (row or {}).get("n"))

    r = client.post("/api/users/cohort/students", headers=EDUCATOR, json={
        "name": "Cohort Student",
        "email": "cohort.student@learnsmart.edu",
        "topSubject": "Python Basics",
    })
    check("educator can add a student to their cohort", r.status_code == 201, r.text[:200])

    r = client.get("/api/users/students", headers=EDUCATOR)
    edu_roster_after = r.json() if r.status_code == 200 else []
    check("new cohort student shows up in the educator roster",
          any(s["email"] == "cohort.student@learnsmart.edu" for s in edu_roster_after),
          [s.get("email") for s in edu_roster_after])

    r = client.delete("/api/users/cohort/students/cohort.student@learnsmart.edu", headers=EDUCATOR)
    check("educator can remove a student from their cohort", r.status_code == 200, r.text[:200])

    r = client.get("/api/users/students", headers=EDUCATOR)
    edu_roster_final = r.json() if r.status_code == 200 else []
    check("removed student leaves the educator roster",
          not any(s["email"] == "cohort.student@learnsmart.edu" for s in edu_roster_final),
          [s.get("email") for s in edu_roster_final])

    r = client.post("/api/users/students", headers=EDUCATOR, json={
        "name": "Blocked Student",
        "email": "blocked.student@learnsmart.edu",
    })
    check("educator cannot use the admin student endpoint -> 403", r.status_code == 403, r.text[:200])

    r = client.post("/api/feedback", headers=STUDENT, json={
        "quizId": "verify-quiz-1",
        "quizTitle": "Verification Quiz",
        "studentName": "Student One",
        "clarityRating": 4,
        "difficultyRating": 3,
        "educatorRating": 5,
        "comments": "Great assessment",
    })
    check("student can submit quiz feedback -> 201", r.status_code == 201, r.text[:200])

    r = client.get("/api/feedback", headers=EDUCATOR)
    feedback = r.json().get("feedback", []) if r.status_code == 200 else []
    check("educator reads the feedback of their own quiz",
          any(f["quizId"] == "verify-quiz-1" for f in feedback),
          [f.get("quizId") for f in feedback])

    r = client.get("/api/notifications", headers=EDUCATOR)
    edu_notifs_after_feedback = r.json().get("notifications", [])
    check("educator is notified about the feedback",
          any("Quiz Feedback" in n["title"] for n in edu_notifs_after_feedback),
          [n["title"] for n in edu_notifs_after_feedback])

    r = client.get("/api/feedback", headers=STUDENT)
    check("student cannot read the feedback list -> 403", r.status_code == 403, r.text[:200])

    r = client.put("/api/users/registered.student@learnsmart.edu/password", headers=ADMIN, json={
        "newPassword": "Reset@123",
    })
    check("admin can reset a password", r.status_code == 200, r.text[:200])

    r = client.post("/api/auth/login", json={
        "identifier": "registered.student@learnsmart.edu",
        "password": "Reset@123",
    })
    check("the new password works", r.status_code == 200, r.text[:200])

    r = client.put("/api/users/registered.student@learnsmart.edu/password", headers=EDUCATOR, json={
        "newPassword": "Hijack@123",
    })
    check("educator cannot reset passwords -> 403", r.status_code == 403, r.text[:200])

    print("\n== 11. Cleanup ==")
    with get_connection() as conn:
        conn.execute("DELETE FROM quiz_attempts WHERE student_email = ?", ("student.one@learnsmart.edu",))
        conn.execute("DELETE FROM quizzes WHERE id LIKE 'verify-%'")
        conn.execute("DELETE FROM educator_students WHERE student_id = 'test-student-1'")
        conn.execute("DELETE FROM users WHERE email IN ('student.one@learnsmart.edu', 'educator.two@learnsmart.com')")
        conn.execute("DELETE FROM users WHERE email IN ('registered.student@learnsmart.edu', 'cohort.student@learnsmart.edu', 'blocked.student@learnsmart.edu')")
        conn.execute("DELETE FROM quiz_feedback WHERE quiz_id LIKE 'verify-%'")
        conn.execute("DELETE FROM notifications")
        conn.execute("DELETE FROM activity_log")
        conn.commit()
    check("cleanup complete", True)


    print(f"\n{'=' * 46}\n  {PASS} passed, {FAIL} failed\n{'=' * 46}")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
