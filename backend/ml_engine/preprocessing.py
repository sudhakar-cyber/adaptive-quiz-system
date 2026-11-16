"""
LearnSmart ML Engine - Data Preprocessing & Feature Extraction Module

Extracts real student performance data directly from the database,
prepares feature matrices, applies target difficulty mappings (Easy / Medium / Hard),
and provides inference-time feature transforms.
"""

import os
import sqlite3
from typing import Tuple, List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "learnsmart.db")
CSV_PATH = os.path.join(BASE_DIR, "..", "dataset", "processed", "student_performance_final.csv")

FEATURE_COLUMNS: List[str] = [
    "Age",
    "Gender",
    "Ethnicity",
    "ParentalEducation",
    "StudyTimeWeekly",
    "Absences",
    "Tutoring",
    "ParentalSupport",
    "Extracurricular",
    "Sports",
    "Music",
    "Volunteering",
    "GPA"
]

DIFFICULTY_CLASSES: List[str] = ["Easy", "Medium", "Hard"]

# Mapping student academic performance (GradeClass / GPA) to pedagogical difficulty
# GradeClass 4 (F / GPA < 2.0): Needs foundational support -> Easy
# GradeClass 2, 3 (C, D / GPA 2.0-3.0): Standard competence -> Medium
# GradeClass 0, 1 (A, B / GPA > 3.0): Advanced mastery -> Hard
GRADECLASS_TO_DIFFICULTY: Dict[int, str] = {
    4: "Easy",
    3: "Medium",
    2: "Medium",
    1: "Hard",
    0: "Hard"
}


def map_grade_to_difficulty(grade_class: int) -> str:
    """Deterministic pedagogical mapping from student grade category to difficulty."""
    try:
        val = int(grade_class)
        return GRADECLASS_TO_DIFFICULTY.get(val, "Medium")
    except (ValueError, TypeError):
        return "Medium"


def map_gpa_to_difficulty(gpa: float) -> str:
    """Maps continuous GPA or quiz mastery score to difficulty level."""
    try:
        g = float(gpa)
        if g < 2.0:
            return "Easy"
        elif g < 3.2:
            return "Medium"
        else:
            return "Hard"
    except (ValueError, TypeError):
        return "Medium"


def extract_real_data(
    db_path: Optional[str] = None,
    csv_fallback_path: Optional[str] = None
) -> pd.DataFrame:
    """
    Extracts real student and quiz performance data.
    First checks database table `student_performance`, then falls back / synchronizes
    with the repository dataset file if necessary.
    """
    target_db = db_path or DB_PATH
    target_csv = csv_fallback_path or CSV_PATH

    df: Optional[pd.DataFrame] = None

    # 1. Try extracting from SQLite database
    if os.path.exists(target_db):
        try:
            conn = sqlite3.connect(target_db)
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='student_performance'")
            table_exists = cur.fetchone()

            if table_exists:
                df = pd.read_sql_query("SELECT * FROM student_performance", conn)
                conn.close()
                if df is not None and len(df) > 0:
                    return df
            conn.close()
        except Exception:
            pass

    # 2. Try loading from processed dataset file and populate database table
    if os.path.exists(target_csv):
        df = pd.read_csv(target_csv)
        if df is not None and len(df) > 0:
            # Sync to SQLite so database always has the real records
            try:
                if os.path.exists(os.path.dirname(target_db)):
                    conn = sqlite3.connect(target_db)
                    df.to_sql("student_performance", conn, if_exists="replace", index=False)
                    conn.close()
            except Exception:
                pass
            return df

    # If neither could be found
    raise FileNotFoundError(
        f"Real student performance data could not be located at '{target_db}' or '{target_csv}'. "
        "Please verify dataset path."
    )


def extract_quiz_attempts_data(db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Queries real quiz attempts submitted by students in the database.
    Used for online retraining and tracking quiz history.
    """
    target_db = db_path or DB_PATH
    attempts = []
    if os.path.exists(target_db):
        try:
            conn = sqlite3.connect(target_db)
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT * FROM quiz_attempts").fetchall()
            attempts = [dict(r) for r in rows]
            conn.close()
        except Exception:
            pass
    return attempts


def prepare_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Prepares feature matrix X and target difficulty vector y from real student data.
    """
    df_clean = df.copy()

    # Create Difficulty column if not present
    if "Difficulty" not in df_clean.columns:
        if "GradeClass" in df_clean.columns:
            df_clean["Difficulty"] = df_clean["GradeClass"].apply(map_grade_to_difficulty)
        elif "GPA" in df_clean.columns:
            df_clean["Difficulty"] = df_clean["GPA"].apply(map_gpa_to_difficulty)
        else:
            raise ValueError("Dataset lacks 'GradeClass' or 'GPA' column to derive difficulty target.")

    # Validate feature columns exist
    missing_features = [col for col in FEATURE_COLUMNS if col not in df_clean.columns]
    if missing_features:
        raise KeyError(f"Missing required feature columns in dataset: {missing_features}")

    X = df_clean[FEATURE_COLUMNS].copy()
    y = df_clean["Difficulty"].copy()

    return X, y


def split_data(
    X: pd.DataFrame,
    y: pd.Series,
    test_size: float = 0.2,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Splits features and targets into train and test sets using stratified sampling.
    Guarantees test data is NEVER used in training.
    """
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y
    )
    return X_train, X_test, y_train, y_test


def build_inference_vector(
    student_stats: Optional[Dict[str, Any]] = None,
    quiz_progress: Optional[Dict[str, Any]] = None
) -> pd.DataFrame:
    """
    Constructs a valid feature vector matching FEATURE_COLUMNS for live inference.
    Synthesizes live quiz performance into current estimated GPA.
    """
    s_stats = student_stats or {}
    q_prog = quiz_progress or {}

    # Extract or estimate current quiz performance
    total_answered = q_prog.get("totalAnswered", 0)
    correct_count = q_prog.get("correctCount", 0)

    if total_answered > 0:
        quiz_accuracy_pct = (correct_count / total_answered) * 100.0
    else:
        quiz_accuracy_pct = q_prog.get("currentAccuracy", 75.0)

    # Convert accuracy percentage to 4.0 GPA scale (e.g. 100% -> 4.0, 75% -> 3.0, 50% -> 2.0)
    live_gpa = round(min(4.0, max(0.0, (quiz_accuracy_pct / 100.0) * 4.0)), 2)

    # Use student baseline GPA if available, dynamically blended with live quiz performance
    baseline_gpa = s_stats.get("gpa") or s_stats.get("GPA")
    if baseline_gpa is not None:
        try:
            baseline_val = float(baseline_gpa)
            effective_gpa = round((baseline_val * 0.4) + (live_gpa * 0.6), 2)
        except (ValueError, TypeError):
            effective_gpa = live_gpa
    else:
        effective_gpa = live_gpa

    # Build dictionary with sensible defaults if student profile fields are omitted
    row = {
        "Age": int(s_stats.get("age", s_stats.get("Age", 17))),
        "Gender": int(s_stats.get("gender", s_stats.get("Gender", 0))),
        "Ethnicity": int(s_stats.get("ethnicity", s_stats.get("Ethnicity", 0))),
        "ParentalEducation": int(s_stats.get("parentalEducation", s_stats.get("ParentalEducation", 2))),
        "StudyTimeWeekly": float(s_stats.get("studyTimeWeekly", s_stats.get("StudyTimeWeekly", 15.0))),
        "Absences": int(s_stats.get("absences", s_stats.get("Absences", 4))),
        "Tutoring": int(s_stats.get("tutoring", s_stats.get("Tutoring", 1 if effective_gpa < 2.5 else 0))),
        "ParentalSupport": int(s_stats.get("parentalSupport", s_stats.get("ParentalSupport", 2))),
        "Extracurricular": int(s_stats.get("extracurricular", s_stats.get("Extracurricular", 1))),
        "Sports": int(s_stats.get("sports", s_stats.get("Sports", 0))),
        "Music": int(s_stats.get("music", s_stats.get("Music", 0))),
        "Volunteering": int(s_stats.get("volunteering", s_stats.get("Volunteering", 0))),
        "GPA": float(effective_gpa)
    }

    return pd.DataFrame([row], columns=FEATURE_COLUMNS)
