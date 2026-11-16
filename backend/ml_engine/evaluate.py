"""
LearnSmart ML Engine - Model Evaluation Module

Computes genuine classification metrics, confusion matrices, and per-class reports.
Never fakes or modifies metrics.
"""

from typing import Dict, Any, List
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

DIFFICULTY_LABELS = ["Easy", "Medium", "Hard"]


def evaluate_predictions(
    y_true: List[str],
    y_pred: List[str],
    labels: List[str] = DIFFICULTY_LABELS
) -> Dict[str, Any]:
    """
    Computes real, unmanipulated ML performance metrics on test predictions.
    """
    acc = accuracy_score(y_true, y_pred)
    prec_weighted = precision_score(y_true, y_pred, average="weighted", zero_division=0)
    rec_weighted = recall_score(y_true, y_pred, average="weighted", zero_division=0)
    f1_weighted = f1_score(y_true, y_pred, average="weighted", zero_division=0)

    prec_macro = precision_score(y_true, y_pred, average="macro", zero_division=0)
    rec_macro = recall_score(y_true, y_pred, average="macro", zero_division=0)
    f1_macro = f1_score(y_true, y_pred, average="macro", zero_division=0)

    cm = confusion_matrix(y_true, y_pred, labels=labels)
    cm_list = cm.tolist()

    report_dict = classification_report(
        y_true,
        y_pred,
        labels=labels,
        output_dict=True,
        zero_division=0
    )

    per_class = {}
    for lbl in labels:
        if lbl in report_dict:
            per_class[lbl] = {
                "precision": round(float(report_dict[lbl]["precision"]), 4),
                "recall": round(float(report_dict[lbl]["recall"]), 4),
                "f1_score": round(float(report_dict[lbl]["f1-score"]), 4),
                "support": int(report_dict[lbl]["support"])
            }

    metrics = {
        "accuracy": round(float(acc), 4),
        "accuracy_percent": f"{round(float(acc) * 100, 2)}%",
        "precision": round(float(prec_weighted), 4),
        "precision_percent": f"{round(float(prec_weighted) * 100, 2)}%",
        "recall": round(float(rec_weighted), 4),
        "recall_percent": f"{round(float(rec_weighted) * 100, 2)}%",
        "f1_score": round(float(f1_weighted), 4),
        "f1_score_percent": f"{round(float(f1_weighted) * 100, 2)}%",
        "macro_precision": round(float(prec_macro), 4),
        "macro_recall": round(float(rec_macro), 4),
        "macro_f1": round(float(f1_macro), 4),
        "confusion_matrix": cm_list,
        "confusion_matrix_labels": labels,
        "per_class": per_class,
        "total_test_samples": len(y_true)
    }

    return metrics


def format_evaluation_summary(metrics: Dict[str, Any], model_name: str = "Selected Model") -> str:
    """Produces a clean readable text display of evaluation metrics."""
    labels = metrics.get("confusion_matrix_labels", DIFFICULTY_LABELS)
    cm = metrics.get("confusion_matrix", [])

    lines = [
        f"================ {model_name} Evaluation ================",
        f"Actual Test Accuracy : {metrics.get('accuracy_percent', 'N/A')} ({metrics.get('accuracy', 0)})",
        f"Weighted Precision   : {metrics.get('precision_percent', 'N/A')} ({metrics.get('precision', 0)})",
        f"Weighted Recall      : {metrics.get('recall_percent', 'N/A')} ({metrics.get('recall', 0)})",
        f"Weighted F1-score    : {metrics.get('f1_score_percent', 'N/A')} ({metrics.get('f1_score', 0)})",
        f"Macro F1-score       : {metrics.get('macro_f1', 0)}",
        f"Total Test Samples   : {metrics.get('total_test_samples', 0)}",
        "",
        "Confusion Matrix (Rows: Actual, Columns: Predicted):",
        f"         {'  '.join(f'{l:>8}' for l in labels)}"
    ]

    for i, row in enumerate(cm):
        actual_lbl = labels[i] if i < len(labels) else f"Row {i}"
        row_str = "  ".join(f"{val:>8}" for val in row)
        lines.append(f"{actual_lbl:<8} {row_str}")

    lines.append("")
    lines.append("Per-Class Breakdown:")
    for lbl, stats in metrics.get("per_class", {}).items():
        lines.append(
            f"  - {lbl:<6}: Precision = {stats['precision']*100:.1f}%, "
            f"Recall = {stats['recall']*100:.1f}%, F1 = {stats['f1_score']*100:.1f}% "
            f"(Support = {stats['support']})"
        )
    lines.append("=========================================================")

    return "\n".join(lines)
