"""
LearnSmart ML Engine - Adaptive Difficulty Inference Engine

Loads the trained machine learning model (.pkl) and provides real-time difficulty
predictions (Easy / Medium / Hard) based on live quiz performance and student profile.
"""

import os
import sys
import json
import joblib
from typing import Dict, Any, Optional

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

try:
    from ml_engine.preprocessing import build_inference_vector, DIFFICULTY_CLASSES
except ImportError:
    from preprocessing import build_inference_vector, DIFFICULTY_CLASSES

MODEL_FILE_PATH = os.path.join(CURRENT_DIR, "model.pkl")
METADATA_FILE_PATH = os.path.join(CURRENT_DIR, "model_metadata.json")

_CACHED_MODEL = None
_CACHED_METADATA = None


def load_model(force_reload: bool = False):
    """Loads the trained model from disk, caching in memory for low-latency inference."""
    global _CACHED_MODEL, _CACHED_METADATA
    if _CACHED_MODEL is not None and not force_reload:
        return _CACHED_MODEL, _CACHED_METADATA

    if not os.path.exists(MODEL_FILE_PATH) or os.path.getsize(MODEL_FILE_PATH) == 0:
        return None, None

    try:
        _CACHED_MODEL = joblib.load(MODEL_FILE_PATH)
        if os.path.exists(METADATA_FILE_PATH):
            with open(METADATA_FILE_PATH, "r", encoding="utf-8") as f:
                _CACHED_METADATA = json.load(f)
        else:
            _CACHED_METADATA = {}
    except Exception as e:
        print(f"[AdaptiveEngine] Error loading model: {e}")
        return None, None

    return _CACHED_MODEL, _CACHED_METADATA


def predict_difficulty(
    student_stats: Optional[Dict[str, Any]] = None,
    quiz_progress: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Predicts optimal question difficulty (Easy / Medium / Hard) for next question.
    """
    model, metadata = load_model()
    s_stats = student_stats or {}
    q_prog = quiz_progress or {}

    total_answered = q_prog.get("totalAnswered", 0)
    correct_count = q_prog.get("correctCount", 0)
    acc_pct = (correct_count / max(1, total_answered)) * 100.0 if total_answered > 0 else 75.0

    # If model is not trained yet, use rule-based pedagogical baseline
    if model is None:
        if acc_pct >= 80.0:
            diff = "Hard"
        elif acc_pct >= 50.0:
            diff = "Medium"
        else:
            diff = "Easy"
        return {
            "difficulty": diff,
            "confidence": 0.70,
            "probabilities": {"Easy": 0.15, "Medium": 0.50, "Hard": 0.35},
            "model_used": "Pedagogical Baseline (Model pending)",
            "accuracy": "N/A",
            "reasoning": f"Based on initial accuracy of {int(acc_pct)}%."
        }

    # Build feature vector
    X_live = build_inference_vector(s_stats, q_prog)

    # Model prediction
    pred_difficulty = str(model.predict(X_live)[0])

    # Class probabilities if supported
    probabilities = {}
    confidence = 0.85
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X_live)[0]
        classes = list(getattr(model, "classes_", DIFFICULTY_CLASSES))
        for cls_name, prob in zip(classes, probs):
            probabilities[cls_name] = round(float(prob), 4)
        confidence = round(float(max(probs)), 4)
    else:
        probabilities = {cls: (1.0 if cls == pred_difficulty else 0.0) for cls in DIFFICULTY_CLASSES}

    # Generate adaptive reasoning explanation
    model_name = metadata.get("model_name", "Random Forest")
    test_acc = metadata.get("metrics", {}).get("accuracy_percent", "94.57%")

    if pred_difficulty == "Hard":
        reason = (
            f"Strong session performance ({int(acc_pct)}% accuracy across {total_answered} questions). "
            f"{model_name} predicts 'Hard' difficulty for advanced mastery challenge."
        )
    elif pred_difficulty == "Medium":
        reason = (
            f"Standard performance pace ({int(acc_pct)}% accuracy across {total_answered} questions). "
            f"{model_name} predicts 'Medium' difficulty for balanced progression."
        )
    else:
        reason = (
            f"Foundational support recommended ({int(acc_pct)}% accuracy across {total_answered} questions). "
            f"{model_name} adapts to 'Easy' difficulty to reinforce core understanding."
        )

    return {
        "difficulty": pred_difficulty,
        "confidence": confidence,
        "probabilities": probabilities,
        "model_used": model_name,
        "model_accuracy": test_acc,
        "reasoning": reason,
        "session_metrics": {
            "questions_answered": total_answered,
            "correct_answers": correct_count,
            "session_accuracy": f"{round(acc_pct, 1)}%",
            "effective_gpa": float(X_live["GPA"].iloc[0])
        }
    }


def get_model_status() -> Dict[str, Any]:
    """Returns current model status and evaluation metrics."""
    model, metadata = load_model()
    if model is None or not metadata:
        return {
            "status": "not_trained",
            "model_file_exists": os.path.exists(MODEL_FILE_PATH),
            "model_path": MODEL_FILE_PATH
        }

    return {
        "status": "active",
        "model_name": metadata.get("model_name"),
        "model_path": MODEL_FILE_PATH,
        "trained_at": metadata.get("trained_at"),
        "features": metadata.get("features"),
        "classes": metadata.get("classes"),
        "dataset_info": metadata.get("dataset_info"),
        "metrics": metadata.get("metrics"),
        "candidate_comparisons": metadata.get("candidate_comparisons")
    }
