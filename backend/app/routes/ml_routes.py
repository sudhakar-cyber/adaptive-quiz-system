"""
LearnSmart Backend - Machine Learning Routes

Exposes API endpoints for:
- Querying model status and genuine ML metrics (/api/ml/model-info)
- Real-time difficulty prediction (/api/ml/predict)
- Triggering model retraining with real data (/api/ml/retrain)
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from app.controllers import recommendation_controller
from app.middleware.auth_middleware import get_current_user_from_token

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])


def get_optional_user(
    authorization: Optional[str] = Header(None),
    x_user_uid: Optional[str] = Header(None, alias="X-User-UID"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
) -> Optional[Dict[str, Any]]:
    if not authorization and not x_user_uid and not x_user_email:
        return None
    try:
        return get_current_user_from_token(authorization, x_user_uid, x_user_email, x_user_name, x_user_role)
    except Exception:
        return None


class PredictRequest(BaseModel):
    quizId: Optional[str] = "general"
    currentIndex: Optional[int] = 0
    selectedAnswers: Optional[Dict[str, Any]] = {}
    correctCount: Optional[int] = 0
    totalAnswered: Optional[int] = 0
    totalQuestions: Optional[int] = 5
    timeSpentSeconds: Optional[int] = 0
    currentAccuracy: Optional[float] = None
    studentStats: Optional[Dict[str, Any]] = {}
    questions: Optional[List[Any]] = []

    class Config:
        extra = "allow"


@router.get("/model-info")
def get_model_info():
    """Returns genuine evaluation metrics, confusion matrix, features, and model details."""
    info = recommendation_controller.fetch_ml_model_info()
    return info


@router.post("/predict")
def predict_difficulty_level(
    req: PredictRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """Predicts Easy / Medium / Hard difficulty for the next question using trained model (.pkl)."""
    return recommendation_controller.get_adaptive_prediction(
        req.quizId or "general",
        req.dict(),
        current_user
    )


@router.post("/retrain")
def retrain_model_endpoint(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_from_token)
):
    """Retrains the machine learning model using only genuine dataset/database records."""
    try:
        result = recommendation_controller.trigger_model_retraining()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retraining error: {str(e)}"
        )
