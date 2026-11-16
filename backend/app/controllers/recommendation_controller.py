"""
LearnSmart Backend - Recommendation & Adaptive Quiz Controller

Interfaces API routes with the ML Engine for adaptive question difficulty
predictions, model retraining, and metrics querying.
"""

import sys
import os
from typing import Dict, Any, Optional

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ML_ENGINE_DIR = os.path.join(BACKEND_DIR, "ml_engine")
if ML_ENGINE_DIR not in sys.path:
    sys.path.insert(0, ML_ENGINE_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

try:
    from ml_engine.adaptive_logic import predict_difficulty, get_model_status
    from ml_engine.recommend import select_adaptive_question
    from ml_engine.train_model import train_and_save_model
except ImportError:
    from adaptive_logic import predict_difficulty, get_model_status
    from recommend import select_adaptive_question
    from train_model import train_and_save_model


def get_adaptive_prediction(
    quiz_id: str,
    payload: Dict[str, Any],
    current_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Computes real-time difficulty prediction for the next question.
    """
    student_stats = payload.get("studentStats") or {}
    quiz_progress = {
        "currentIndex": payload.get("currentIndex", 0),
        "totalAnswered": payload.get("totalAnswered", len(payload.get("selectedAnswers", {}))),
        "correctCount": payload.get("correctCount", 0),
        "totalQuestions": payload.get("totalQuestions", 5),
        "timeSpentSeconds": payload.get("timeSpentSeconds", 0),
        "currentAccuracy": payload.get("currentAccuracy")
    }

    prediction = predict_difficulty(student_stats, quiz_progress)

    # Optional question selection if question list is provided in payload
    questions = payload.get("questions") or []
    answered_indices = list(payload.get("selectedAnswers", {}).keys())
    try:
        answered_indices = [int(i) for i in answered_indices]
    except Exception:
        answered_indices = []

    rec = select_adaptive_question(
        questions,
        payload.get("currentIndex", 0),
        prediction["difficulty"],
        answered_indices
    )

    return {
        "success": True,
        "quizId": quiz_id,
        "recommendedDifficulty": prediction["difficulty"],
        "confidence": prediction["confidence"],
        "probabilities": prediction["probabilities"],
        "reasoning": prediction["reasoning"],
        "modelUsed": prediction["model_used"],
        "modelAccuracy": prediction.get("model_accuracy"),
        "sessionMetrics": prediction.get("session_metrics"),
        "adaptiveSelection": rec
    }


def fetch_ml_model_info() -> Dict[str, Any]:
    """Returns current active model information and genuine performance metrics."""
    return get_model_status()


def trigger_model_retraining() -> Dict[str, Any]:
    """Retrains the machine learning model with real data and saves .pkl artifact."""
    result = train_and_save_model(verbose=True)
    return result
