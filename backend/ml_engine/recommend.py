"""
LearnSmart ML Engine - Question Recommendation & Adaptive Flow Module

Uses model prediction to decide the next question difficulty and pick the best
question matching the predicted difficulty from the quiz question pool.
"""

from typing import List, Dict, Any, Optional


def select_adaptive_question(
    questions: List[Dict[str, Any]],
    current_index: int,
    predicted_difficulty: str,
    answered_indices: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Selects the next question tailored to the ML model's predicted difficulty.
    
    If the quiz contains questions tagged with specific difficulty levels,
    it seeks an unanswered question matching `predicted_difficulty`.
    If no questions match or questions are sequential, it advances sequentially
    while tagging the question with the predicted adaptive difficulty and rationale.
    """
    answered = set(answered_indices or [])
    total_q = len(questions)

    if total_q == 0:
        return {
            "next_index": 0,
            "difficulty": predicted_difficulty,
            "is_adapted": False,
            "message": "No questions available."
        }

    # 1. Search for an unanswered question explicitly matching predicted difficulty
    matching_candidates = [
        idx for idx, q in enumerate(questions)
        if idx not in answered and idx > current_index
        and str(q.get("difficulty", "")).lower() == predicted_difficulty.lower()
    ]

    if matching_candidates:
        selected_idx = matching_candidates[0]
        return {
            "next_index": selected_idx,
            "question": questions[selected_idx],
            "difficulty": predicted_difficulty,
            "is_adapted": True,
            "message": f"Adaptive selection: Question difficulty '{predicted_difficulty}' matched."
        }

    # 2. Sequential fallback: advance to the next index
    next_idx = min(current_index + 1, total_q - 1)
    return {
        "next_index": next_idx,
        "question": questions[next_idx] if next_idx < total_q else None,
        "difficulty": predicted_difficulty,
        "is_adapted": False,
        "message": f"Sequential progression: Difficulty level '{predicted_difficulty}' applied."
    }
