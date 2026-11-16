"""
LearnSmart ML Engine - Model Comparison & Selection Module

Trains and evaluates candidate classifiers using proper Stratified K-Fold
cross-validation and held-out test evaluation, selecting the best model based on
real test accuracy and F1 score.
"""

from typing import Dict, Any, Tuple
import pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, ExtraTreesClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

try:
    from evaluate import evaluate_predictions
except ImportError:
    try:
        from ml_engine.evaluate import evaluate_predictions
    except ImportError:
        from app.ml_engine.evaluate import evaluate_predictions


def get_candidate_models(random_state: int = 42) -> Dict[str, Any]:
    """Returns a dictionary of candidate models suited for tabular student performance classification."""
    return {
        "Random Forest": RandomForestClassifier(
            n_estimators=150,
            max_depth=12,
            min_samples_split=4,
            random_state=random_state
        ),
        "Gradient Boosting": GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=random_state
        ),
        "Decision Tree": DecisionTreeClassifier(
            max_depth=7,
            min_samples_split=4,
            random_state=random_state
        ),
        "Extra Trees": ExtraTreesClassifier(
            n_estimators=150,
            max_depth=12,
            random_state=random_state
        ),
        "Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, random_state=random_state))
        ]),
        "K-Nearest Neighbors": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", KNeighborsClassifier(n_neighbors=5))
        ])
    }


def compare_and_select_model(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    random_state: int = 42
) -> Tuple[str, Any, Dict[str, Any], Dict[str, Any]]:
    """
    Trains each candidate model on X_train, computes 5-fold CV accuracy,
    evaluates on held-out X_test, and selects the best performing model.
    """
    models = get_candidate_models(random_state=random_state)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)

    comparison_results: Dict[str, Any] = {}
    best_model_name: str = ""
    best_model_obj: Any = None
    best_score: float = -1.0
    best_metrics: Dict[str, Any] = {}

    for name, model in models.items():
        # 1. Fit model on training set ONLY
        model.fit(X_train, y_train)

        # 2. Run cross validation on training set
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="accuracy")
        cv_mean = float(cv_scores.mean())
        cv_std = float(cv_scores.std())

        # 3. Predict on unseen test set
        y_pred = model.predict(X_test)

        # 4. Compute actual metrics
        eval_metrics = evaluate_predictions(y_test.tolist(), y_pred.tolist())
        eval_metrics["cv_mean_accuracy"] = round(cv_mean, 4)
        eval_metrics["cv_std"] = round(cv_std, 4)

        comparison_results[name] = eval_metrics

        # Selection criterion: Highest Test Accuracy (tie-breaker: CV mean)
        test_acc = eval_metrics["accuracy"]
        if (test_acc > best_score) or (test_acc == best_score and cv_mean > comparison_results[best_model_name].get("cv_mean_accuracy", 0)):
            best_score = test_acc
            best_model_name = name
            best_model_obj = model
            best_metrics = eval_metrics

    return best_model_name, best_model_obj, best_metrics, comparison_results
