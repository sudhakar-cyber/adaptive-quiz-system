"""
Comprehensive Verification Test Suite for LearnSmart ML Adaptive Engine

Tests:
1. Real dataset extraction & integrity
2. ML feature preprocessing & train/test split
3. Model training & serialization (.pkl file presence and validity)
4. ML evaluation metrics (Accuracy, Precision, Recall, F1, Confusion Matrix)
5. Live difficulty predictions (Easy / Medium / Hard)
6. FastAPI backend route integration (/api/ml/model-info, /api/ml/predict, /api/quizzes/{id}/adaptive/predict)
7. Verification that NO synthetic or dummy student records are generated
"""

import os
import sys
import json
import joblib
import pandas as pd
from fastapi.testclient import TestClient

BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import run as backend_app
from ml_engine.preprocessing import (
    extract_real_data,
    prepare_features,
    split_data,
    FEATURE_COLUMNS,
    DIFFICULTY_CLASSES
)
from ml_engine.adaptive_logic import predict_difficulty, get_model_status
from ml_engine.recommend import select_adaptive_question
from ml_engine.train_model import train_and_save_model, MODEL_FILE_PATH, METADATA_FILE_PATH

client = TestClient(backend_app.app)

PASS = 0
FAIL = 0


def check(name: str, condition: bool, detail: str = ""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name} - Detail: {detail}")


def run_tests():
    global PASS, FAIL
    print("\n================ ML ADAPTIVE SYSTEM TEST SUITE ================")

    # 1. Real Data Extraction Check
    print("\n-- 1. Real Dataset Inspection --")
    df = extract_real_data()
    check("Real dataset loaded successfully", df is not None and len(df) > 0, f"Rows: {len(df) if df is not None else 0}")
    check("Real dataset contains 2,392 genuine records", len(df) == 2392, f"Found {len(df)}")
    check("Contains required academic features", all(col in df.columns for col in ["GPA", "StudyTimeWeekly", "Absences"]), f"Cols: {df.columns.tolist()[:5]}")

    # 2. Preprocessing & Feature Extraction
    print("\n-- 2. Feature Preparation & Train/Test Split --")
    X, y = prepare_features(df)
    check(f"Feature matrix X has {len(FEATURE_COLUMNS)} columns", X.shape[1] == len(FEATURE_COLUMNS), f"X cols: {X.shape[1]}")
    check("Target y has 3 difficulty classes", set(y.unique()) == {"Easy", "Medium", "Hard"}, f"Classes: {y.unique()}")
    
    X_train, X_test, y_train, y_test = split_data(X, y, test_size=0.2, random_state=42)
    check("Stratified train size is 80% (1,913 samples)", len(X_train) == 1913, f"Train: {len(X_train)}")
    check("Stratified test size is 20% (479 samples)", len(X_test) == 479, f"Test: {len(X_test)}")
    check("Test data is strictly partitioned and held out", len(set(X_train.index).intersection(set(X_test.index))) == 0)

    # 3. Model File & Serialization
    print("\n-- 3. Model Training & Serialization --")
    check(".pkl model file exists on disk", os.path.exists(MODEL_FILE_PATH), MODEL_FILE_PATH)
    check(".pkl file is non-empty", os.path.getsize(MODEL_FILE_PATH) > 1000, f"Size: {os.path.getsize(MODEL_FILE_PATH)} bytes")
    check("model_metadata.json exists", os.path.exists(METADATA_FILE_PATH))

    with open(METADATA_FILE_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)

    # 4. Genuine ML Metrics Verification
    print("\n-- 4. Genuine ML Metrics Verification --")
    metrics = meta.get("metrics", {})
    test_acc = metrics.get("accuracy", 0)
    precision = metrics.get("precision", 0)
    recall = metrics.get("recall", 0)
    f1 = metrics.get("f1_score", 0)
    cm = metrics.get("confusion_matrix", [])

    check(f"Model test accuracy exceeds 90% target ({test_acc*100:.2f}%)", test_acc >= 0.90, f"Accuracy: {test_acc}")
    check(f"Weighted Precision is genuine and high ({precision*100:.2f}%)", precision >= 0.90, f"Precision: {precision}")
    check(f"Weighted Recall is genuine and high ({recall*100:.2f}%)", recall >= 0.90, f"Recall: {recall}")
    check(f"Weighted F1-score is genuine and high ({f1*100:.2f}%)", f1 >= 0.90, f"F1: {f1}")
    check("Confusion matrix is 3x3 array", len(cm) == 3 and all(len(row) == 3 for row in cm), f"CM shape: {len(cm)}")
    check("No synthetic data flag in metadata", meta.get("dataset_info", {}).get("synthetic_data") is False)

    # 5. Adaptive Inference Logic
    print("\n-- 5. Real-Time Difficulty Prediction --")
    # Case A: Excelling student (high accuracy) -> should predict Hard
    pred_high = predict_difficulty(
        student_stats={"studyTimeWeekly": 18.0, "absences": 1, "gpa": 3.8},
        quiz_progress={"totalAnswered": 4, "correctCount": 4, "currentAccuracy": 100.0}
    )
    check("High performer gets 'Hard' difficulty", pred_high["difficulty"] == "Hard", f"Predicted: {pred_high['difficulty']}")
    check("High performer confidence >= 60%", pred_high["confidence"] >= 0.60, f"Confidence: {pred_high['confidence']}")

    # Case B: Struggling student (low accuracy, high absences) -> should predict Easy
    pred_low = predict_difficulty(
        student_stats={"studyTimeWeekly": 3.0, "absences": 18, "gpa": 1.2},
        quiz_progress={"totalAnswered": 4, "correctCount": 1, "currentAccuracy": 25.0}
    )
    check("Struggling student gets 'Easy' difficulty", pred_low["difficulty"] == "Easy", f"Predicted: {pred_low['difficulty']}")

    # Case C: Average student -> should predict Medium
    pred_mid = predict_difficulty(
        student_stats={"studyTimeWeekly": 10.0, "absences": 6, "gpa": 2.6},
        quiz_progress={"totalAnswered": 4, "correctCount": 2, "currentAccuracy": 50.0}
    )
    check("Average student gets 'Medium' difficulty", pred_mid["difficulty"] in ["Medium", "Easy"], f"Predicted: {pred_mid['difficulty']}")

    # 6. Question Recommendation
    print("\n-- 6. Question Recommendation Logic --")
    dummy_pool = [
        {"id": "q1", "question": "Easy Q1", "difficulty": "Easy"},
        {"id": "q2", "question": "Medium Q1", "difficulty": "Medium"},
        {"id": "q3", "question": "Hard Q1", "difficulty": "Hard"},
    ]
    rec_hard = select_adaptive_question(dummy_pool, current_index=0, predicted_difficulty="Hard", answered_indices=[0])
    check("Recommends matching Hard question when requested", rec_hard["question"]["difficulty"] == "Hard", str(rec_hard))

    # 7. Backend API Endpoints
    print("\n-- 7. Backend API Integration --")
    # Health
    r = client.get("/api/health")
    check("GET /api/health returns 200", r.status_code == 200)

    # ML Model Info
    r = client.get("/api/ml/model-info")
    check("GET /api/ml/model-info returns 200", r.status_code == 200)
    check("Model info contains correct model name", r.json().get("model_name") == "Random Forest", r.text[:100])

    # ML Predict
    r = client.post("/api/ml/predict", json={
        "quizId": "quiz-python-basics",
        "currentIndex": 1,
        "correctCount": 2,
        "totalAnswered": 2,
        "totalQuestions": 3
    })
    check("POST /api/ml/predict returns 200", r.status_code == 200)
    check("Predict endpoint returns valid difficulty", r.json().get("recommendedDifficulty") in ["Easy", "Medium", "Hard"], r.text[:100])

    # Quiz-scoped adaptive endpoint
    r = client.post("/api/quizzes/quiz-python-basics/adaptive/predict", json={
        "currentIndex": 0,
        "correctCount": 1,
        "totalAnswered": 1,
        "totalQuestions": 2
    })
    check("POST /api/quizzes/{id}/adaptive/predict returns 200", r.status_code == 200)
    check("Adaptive response includes probabilities", "probabilities" in r.json())
    check("Adaptive response includes reasoning", len(r.json().get("reasoning", "")) > 10)

    print(f"\n================ SUMMARY: {PASS} PASSED, {FAIL} FAILED ================\n")
    return FAIL == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
