"""
LearnSmart ML Engine - Training & Serialization Pipeline

Executes end-to-end model training:
1. Extracts real student and quiz performance data from database
2. Prepares ML features (StudyTime, Absences, Tutoring, GPA, etc.)
3. Targets difficulty prediction: Easy / Medium / Hard
4. Performs proper stratified 80/20 train/test split
5. Evaluates candidate models and selects the best model
6. Computes real Accuracy, Precision, Recall, F1-score, and Confusion Matrix
7. Serializes the trained model to 'model.pkl' and metadata to 'model_metadata.json'
"""

import os
import sys
import json
import joblib
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# Ensure ml_engine directory and backend root are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from preprocessing import (
    extract_real_data,
    extract_quiz_attempts_data,
    prepare_features,
    split_data,
    FEATURE_COLUMNS,
    DIFFICULTY_CLASSES
)
from model_selection import compare_and_select_model
from evaluate import format_evaluation_summary

MODEL_FILE_PATH = os.path.join(CURRENT_DIR, "model.pkl")
METADATA_FILE_PATH = os.path.join(CURRENT_DIR, "model_metadata.json")
FEATURES_FILE_PATH = os.path.join(CURRENT_DIR, "features.pkl")

MIN_REQUIRED_SAMPLES = 30


def train_and_save_model(verbose: bool = True) -> Dict[str, Any]:
    """
    Trains the optimal machine learning model on real student data
    and persists the model artifacts.
    """
    if verbose:
        print("\n[ML Engine] 1. Extracting real quiz / student performance data...")

    # 1. Extract real data
    df = extract_real_data()
    total_records = len(df)
    if verbose:
        print(f"[ML Engine] Extracted {total_records} real student records from database/dataset.")

    # Check data sufficiency
    if total_records < MIN_REQUIRED_SAMPLES:
        msg = (
            f"Insufficient real data ({total_records} records found, minimum required is {MIN_REQUIRED_SAMPLES}). "
            "Per system requirements, synthetic or dummy data generation is prohibited. "
            "Please collect more genuine student quiz submissions before training."
        )
        if verbose:
            print(f"[ML Engine] ERROR: {msg}")
        return {"success": False, "error": msg, "total_records": total_records}

    # Also inspect live quiz attempts if available
    attempts = extract_quiz_attempts_data()
    if verbose and attempts:
        print(f"[ML Engine] Found {len(attempts)} live quiz attempts logged in database.")

    # 2. Prepare features and target
    if verbose:
        print("[ML Engine] 2. Preparing meaningful ML features and target (Easy / Medium / Hard)...")
    X, y = prepare_features(df)

    class_distribution = y.value_counts().to_dict()
    if verbose:
        print(f"[ML Engine] Features ({len(FEATURE_COLUMNS)}): {FEATURE_COLUMNS}")
        print(f"[ML Engine] Target distribution: {class_distribution}")

    # 3. Train / Test split
    if verbose:
        print("[ML Engine] 3. Applying stratified 80/20 train/test split...")
    X_train, X_test, y_train, y_test = split_data(X, y, test_size=0.2, random_state=42)

    if verbose:
        print(f"[ML Engine] Training set: {X_train.shape[0]} samples | Test set: {X_test.shape[0]} samples")

    # 4. Model Selection & Cross-Validation
    if verbose:
        print("[ML Engine] 4. Testing candidate ML models across 5-fold cross-validation...")
    best_name, best_model, best_metrics, all_results = compare_and_select_model(
        X_train, X_test, y_train, y_test, random_state=42
    )

    if verbose:
        print(f"[ML Engine] Selected Best Model: {best_name}")
        print(f"[ML Engine] Model Test Accuracy: {best_metrics['accuracy_percent']}")
        print(f"[ML Engine] Model 5-Fold CV Accuracy: {best_metrics.get('cv_mean_accuracy', 0)*100:.2f}%")
        print(f"[ML Engine] Model F1-score: {best_metrics['f1_score_percent']}")

    # 5. Save model artifacts
    if verbose:
        print(f"[ML Engine] 5. Saving trained model to {MODEL_FILE_PATH}...")
    joblib.dump(best_model, MODEL_FILE_PATH)
    joblib.dump(FEATURE_COLUMNS, FEATURES_FILE_PATH)

    # Save comprehensive metadata
    metadata = {
        "model_name": best_name,
        "model_file": os.path.basename(MODEL_FILE_PATH),
        "model_path": MODEL_FILE_PATH,
        "features": FEATURE_COLUMNS,
        "classes": DIFFICULTY_CLASSES,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_info": {
            "source": "database/learnsmart.db (student_performance) / dataset/processed/student_performance_final.csv",
            "total_samples": total_records,
            "train_samples": int(X_train.shape[0]),
            "test_samples": int(X_test.shape[0]),
            "class_distribution": class_distribution,
            "synthetic_data": False,
            "dummy_data": False
        },
        "metrics": best_metrics,
        "candidate_comparisons": {
            name: {
                "test_accuracy": res["accuracy_percent"],
                "cv_accuracy": f"{res.get('cv_mean_accuracy', 0)*100:.2f}%",
                "precision": res["precision_percent"],
                "recall": res["recall_percent"],
                "f1_score": res["f1_score_percent"]
            }
            for name, res in all_results.items()
        }
    }

    with open(METADATA_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    if verbose:
        print("\n" + format_evaluation_summary(best_metrics, best_name))
        print(f"[ML Engine] Metadata successfully saved to {METADATA_FILE_PATH}")

    return {
        "success": True,
        "model_name": best_name,
        "model_file": MODEL_FILE_PATH,
        "metadata_file": METADATA_FILE_PATH,
        "metrics": best_metrics,
        "all_results": all_results,
        "metadata": metadata
    }


if __name__ == "__main__":
    train_and_save_model(verbose=True)
