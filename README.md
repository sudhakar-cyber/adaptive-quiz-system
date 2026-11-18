# LearnSmart - Adaptive Quiz System with Machine Learning

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vitejs.dev/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.3%2B-F7931E.svg)](https://scikit-learn.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An intelligent, full-stack adaptive assessment platform combining a **React (Vite)** frontend, a **FastAPI (Python)** backend, and a **Machine Learning Engine** that dynamically predicts and adjusts question difficulty (**Easy / Medium / Hard**) in real-time based on genuine student performance data.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Machine Learning Architecture](#machine-learning-architecture)
  - [Real Dataset](#real-dataset)
  - [ML Feature Engineering](#ml-feature-engineering)
  - [Model Selection & Evaluation](#model-selection--evaluation)
  - [Evaluation Metrics & Confusion Matrix](#evaluation-metrics--confusion-matrix)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Running the ML Training Pipeline](#running-the-ml-training-pipeline)
- [API Reference](#api-reference)
- [Running Tests](#running-tests)
- [License](#license)

---

## Overview

Traditional quiz systems administer questions sequentially without taking into account the student's mastery level or session performance. **LearnSmart** uses a trained **Random Forest Classifier** to analyze student academic attributes (study time, attendance, tutoring, previous GPA) and in-session quiz performance (accuracy percentage, questions answered, correct streak) to dynamically recommend and adapt the difficulty level of the next question.

The system is built with strict integrity:
- **No synthetic or dummy data**: Trained exclusively on 2,392 genuine student academic performance records.
- **Unmanipulated metrics**: Strict 80/20 stratified train/test split with 5-fold cross-validation on training data.
- **Seamless integration**: The React quiz UI connects to the ML engine via REST API without altering existing quiz flows, timers, or layout.
- **Dual database support**: Native MySQL support with automatic, transparent SQLite fallback (`learnsmart.db`).

---

## Key Features

### 🎓 Adaptive Student Quiz Experience
- **Real-Time Difficulty Adaptation**: As students answer questions, the ML engine predicts whether the next question should be **Easy**, **Medium**, or **Hard**.
- **Adaptive Level Badges**: Non-intrusive badges display the predicted difficulty and confidence level in the quiz header and progress bar.
- **Session Protection**: In-progress quiz recovery from local storage and tab-close protection.
- **Single-Attempt Enforcement**: Complete single-attempt locking to prevent duplicate submissions.
- **Compulsory Feedback**: Post-quiz feedback step before unlocking score analytics and answer explanations.

### 👨‍🏫 Educator Portal
- Quiz creation, drafting, and publishing with category and difficulty tagging.
- Real-time student attempt tracking and cohort analytics.
- Performance trends, average scores, and pass rates.

### 🛠️ Administrator Dashboard
- Platform-wide statistics, active users, and system activity logs.
- Role-based user management (Student, Educator, Admin).
- Real-time audit trail and system health monitoring.

### 🧠 Production Machine Learning Engine
- Standalone, modular ML pipeline in `backend/ml_engine/`.
- Automated model selection across Random Forest, Gradient Boosting, Decision Tree, Extra Trees, Logistic Regression, and KNN.
- Hot-reloading model artifacts (`model.pkl`, `features.pkl`, `model_metadata.json`).
- REST endpoints for live prediction and online retraining (`POST /api/ml/retrain`).

---

## Machine Learning Architecture

```
                                [Real Student Records]
                               (2,392 Genuine Records)
                                         │
                                         ▼
                             [Data Preprocessing Module]
                          - 13 Educational Features
                          - Pedagogical Mapping:
                            * GradeClass 4 (F / GPA < 2.0)  -> Easy
                            * GradeClass 2-3 (C,D / GPA 2-3) -> Medium
                            * GradeClass 0-1 (A,B / GPA > 3) -> Hard
                                         │
                                         ▼
                             [Stratified Train/Test Split]
                            (80% Train: 1,913 | 20% Test: 479)
                                         │
                                         ▼
                              [5-Fold Cross Validation]
                          (Benchmarking Candidate Models)
                                         │
                                         ▼
                             [Best Model: Random Forest]
                            (94.57% Actual Test Accuracy)
                                         │
                                         ▼
                            [Model Serialization (.pkl)]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
         [FastAPI Backend]                              [React Frontend]
   /api/quizzes/{id}/adaptive/predict          QuizModal Header & Progress Bar
```

### Real Dataset

* **Source**: `dataset/processed/student_performance_final.csv` synchronized with database table `student_performance` in `learnsmart.db`.
* **Total Samples**: **2,392 records** (1,913 train / 479 held-out test).
* **Synthetic Data**: **None** (`synthetic_data: false`, `dummy_data: false`).
* **Target Distribution**:
  * **Easy**: 1,211 students (needs foundational reinforcement)
  * **Medium**: 805 students (standard competence)
  * **Hard**: 376 students (advanced mastery challenge)

### ML Feature Engineering

| # | Feature | Type | Description |
|---|---|---|---|
| 1 | `Age` | Integer | Student age (15–18) |
| 2 | `Gender` | Binary | Gender indicator (0 = Female, 1 = Male) |
| 3 | `Ethnicity` | Categorical | Ethnicity group (0–3) |
| 4 | `ParentalEducation` | Categorical | Highest parental education level (0–4) |
| 5 | `StudyTimeWeekly` | Continuous | Weekly independent study hours |
| 6 | `Absences` | Integer | Total academic absences |
| 7 | `Tutoring` | Binary | Participation in tutoring (0 = No, 1 = Yes) |
| 8 | `ParentalSupport` | Categorical | Parental support rating (0 = None to 4 = Very High) |
| 9 | `Extracurricular` | Binary | Participation in extracurricular activities |
| 10 | `Sports` | Binary | Participation in athletics |
| 11 | `Music` | Binary | Music activities participation |
| 12 | `Volunteering` | Binary | Community volunteering participation |
| 13 | `GPA` | Continuous | Student academic GPA (0.0–4.0) blended with live quiz accuracy |

### Model Selection & Evaluation

Six candidate algorithms were evaluated using **5-Fold Stratified Cross-Validation** on the training set and evaluated on the held-out test set:

| Model | Test Accuracy | 5-Fold CV Accuracy | Weighted Precision | Weighted Recall | Weighted F1-Score |
|---|---|---|---|---|---|
| **Random Forest (Selected)** | **94.57%** | **93.52%** | **94.64%** | **94.57%** | **94.52%** |
| Gradient Boosting | 94.57% | 92.68% | 94.64% | 94.57% | 94.52% |
| Decision Tree | 93.95% | 92.42% | 93.96% | 93.95% | 93.87% |
| Extra Trees | 90.81% | 90.02% | 90.81% | 90.81% | 90.63% |
| Logistic Regression | 88.31% | 87.77% | 88.30% | 88.31% | 87.98% |
| K-Nearest Neighbors | 72.44% | 72.66% | 71.13% | 72.44% | 71.00% |

### Evaluation Metrics & Confusion Matrix

* **Test Accuracy**: **94.57%** (`0.9457`)
* **Weighted Precision**: **94.64%** (`0.9464`)
* **Weighted Recall**: **94.57%** (`0.9457`)
* **Weighted F1-Score**: **94.52%** (`0.9452`)
* **Macro F1-Score**: **0.9352**

#### Confusion Matrix (479 Test Samples)

Labels: `["Easy", "Medium", "Hard"]`

```
                   Predicted Easy    Predicted Medium    Predicted Hard
Actual Easy             239                 4                  0
Actual Medium             8               150                  3
Actual Hard               9                 2                 64
```

#### Per-Class Breakdown

* **Easy**: Precision = **93.4%**, Recall = **98.4%**, F1 = **95.8%** (Support = 243)
* **Medium**: Precision = **96.2%**, Recall = **93.2%**, F1 = **94.6%** (Support = 161)
* **Hard**: Precision = **95.5%**, Recall = **85.3%**, F1 = **90.1%** (Support = 75)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       React Frontend                        │
│                 (Vite Dev Server : Port 3000)               │
│                                                             │
│   [TakeQuizView]  ──▶  [QuizModal]  ──▶  [QuizFeedbackView] │
│          │                   │                              │
│          ▼                   ▼                              │
│    sharedDatabase.js   apiClient.js                         │
└──────────────┬───────────────────────┬──────────────────────┘
               │                       │
               │ HTTP Proxy /api       │
               ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                        │
│                     (Uvicorn : Port 5000)                   │
│                                                             │
│   ├── /api/auth       (Authentication & Tokens)             │
│   ├── /api/quizzes    (Quiz Management & Attempts)          │
│   ├── /api/ml         (Model Info, Predict, Retrain)        │
│   └── /api/analytics  (KPIs & Reporting)                   │
│                               │                             │
│                               ▼                             │
│                    [recommendation_controller]              │
│                               │                             │
│                               ▼                             │
│                     [ml_engine/adaptive_logic]              │
│                               │                             │
│                               ▼                             │
│                     [model.pkl (Random Forest)]             │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                         │
│                                                             │
│   Primary  : MySQL 8.0+ (`learnsmart` DB)                   │
│   Fallback : SQLite (`database/learnsmart.db`)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
adaptive-quiz-system/
├── backend/
│   ├── app/
│   │   ├── controllers/
│   │   │   ├── analytics_controller.py
│   │   │   ├── auth_controller.py
│   │   │   ├── quiz_controller.py
│   │   │   ├── recommendation_controller.py  # Bridges ML Engine to API
│   │   │   └── tracking_controller.py
│   │   ├── middleware/
│   │   │   ├── auth_middleware.py            # RBAC and session resolution
│   │   │   └── role_check.py
│   │   ├── routes/
│   │   │   ├── auth_routes.py
│   │   │   ├── ml_routes.py                  # /api/ml/model-info, /predict, /retrain
│   │   │   ├── quiz_routes.py                # /api/quizzes/{id}/adaptive/predict
│   │   │   └── analytics_routes.py
│   │   └── db.py                             # MySQL with SQLite fallback
│   ├── ml_engine/
│   │   ├── adaptive_logic.py                 # Real-time difficulty inference
│   │   ├── evaluate.py                       # Metric evaluation & confusion matrix
│   │   ├── model.pkl                         # Trained Random Forest model
│   │   ├── features.pkl                      # Serialized feature list
│   │   ├── model_metadata.json               # Model metrics & metadata
│   │   ├── model_selection.py                # 5-fold CV & algorithm benchmarking
│   │   ├── preprocessing.py                  # Feature engineering & dataset extraction
│   │   ├── recommend.py                      # Adaptive question selection
│   │   └── train_model.py                    # Standalone training runner
│   ├── config.py                             # Server & database settings
│   ├── requirements.txt                      # Backend & ML dependencies
│   └── run.py                                # FastAPI entry point
├── database/
│   ├── learnsmart.db                         # SQLite database (with student_performance)
│   ├── mysql_schema.sql                      # MySQL relational schema
│   └── learnsmart_mysql_dump.sql             # SQL data dump
├── dataset/
│   └── processed/
│       └── student_performance_final.csv     # 2,392 real student records
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── QuizModal.jsx                 # Interactive quiz with ML adaptive badges
│   │   │   ├── TakeQuizView.jsx              # Quiz catalog & selection
│   │   │   ├── Dashboard.jsx                 # Student portal
│   │   │   ├── EducatorPerformanceView.jsx   # Educator analytics
│   │   │   └── AdminAnalyticsView.jsx        # Admin platform stats
│   │   ├── services/
│   │   │   ├── apiClient.js                  # Axios/Fetch client
│   │   │   └── sharedDatabase.js             # Client state & adaptive prediction API
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js                        # Vite config with backend proxy
├── notebooks/
│   ├── 01_data_cleaning.ipynb
│   ├── 02_visualization.ipynb
│   └── 03_model_training.ipynb
├── tests/
│   ├── test_ml_adaptive.py                   # 30-step end-to-end ML test suite
│   ├── test_recommendation.py
│   └── verify_tracking.py
└── README.md
```

---

## Installation & Setup

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- *(Optional)* **MySQL Server 8.0+** (if offline, the backend automatically uses the built-in SQLite database).

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```powershell
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

4. **Configure environment variables** (optional):
   Copy `.env.example` to `.env` and adjust database credentials if using MySQL:
   ```env
   PORT=5000
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=learnsmart
   ```
   *Note: If MySQL is not running, the backend transparently falls back to `database/learnsmart.db`.*

5. **Start the FastAPI backend**:
   ```powershell
   python run.py
   ```
   The backend will be running at `http://127.0.0.1:5000`. API docs available at `http://127.0.0.1:5000/docs`.

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```powershell
   cd frontend
   ```

2. **Install node dependencies**:
   ```powershell
   npm install
   ```

3. **Start the Vite development server**:
   ```powershell
   npm run dev
   ```
   The frontend will be accessible at `http://localhost:3000`.

4. **Build for production**:
   ```powershell
   npm run build
   ```

---

## Running the ML Training Pipeline

To retrain the machine learning model with new real student performance data:

### Method 1: Command Line
```powershell
python backend/ml_engine/train_model.py
```

### Method 2: HTTP API
Send a POST request to the retraining endpoint:
```http
POST http://127.0.0.1:5000/api/ml/retrain
```

### Method 3: Python Script
```python
from backend.ml_engine.train_model import train_and_save_model

result = train_and_save_model(verbose=True)
print("Trained Model:", result["model_name"])
print("Test Accuracy:", result["metrics"]["accuracy_percent"])
```

The pipeline:
1. Extracts genuine records from the `student_performance` table in `learnsmart.db`.
2. Validates that no synthetic data is present and sample size is sufficient.
3. Prepares 13 feature columns and sets the target difficulty.
4. Performs a stratified 80/20 train/test split.
5. Runs 5-fold cross-validation across all candidate algorithms.
6. Selects the best performing model (Random Forest).
7. Serializes `model.pkl`, `features.pkl`, and `model_metadata.json`.

---

## API Reference

### Machine Learning Endpoints

#### 1. Get Model Status & Metrics
```http
GET /api/ml/model-info
```
**Response:**
```json
{
  "status": "active",
  "model_name": "Random Forest",
  "trained_at": "2026-11-16T17:17:02Z",
  "metrics": {
    "accuracy": 0.9457,
    "accuracy_percent": "94.57%",
    "precision": 0.9464,
    "recall": 0.9457,
    "f1_score": 0.9452,
    "confusion_matrix": [
      [239, 4, 0],
      [8, 150, 3],
      [9, 2, 64]
    ]
  }
}
```

#### 2. Predict Difficulty (General)
```http
POST /api/ml/predict
Content-Type: application/json

{
  "quizId": "quiz-python-basics",
  "currentIndex": 1,
  "correctCount": 2,
  "totalAnswered": 2,
  "totalQuestions": 3,
  "studentStats": {
    "studyTimeWeekly": 16.0,
    "absences": 2,
    "gpa": 3.6
  }
}
```
**Response:**
```json
{
  "success": true,
  "recommendedDifficulty": "Hard",
  "confidence": 0.9452,
  "probabilities": {
    "Easy": 0.0104,
    "Medium": 0.0444,
    "Hard": 0.9452
  },
  "reasoning": "Strong session performance (100% accuracy). Random Forest predicts 'Hard' difficulty for advanced mastery challenge."
}
```

#### 3. Predict Next Question Difficulty (Quiz Session)
```http
POST /api/quizzes/{quiz_id}/adaptive/predict
Content-Type: application/json

{
  "currentIndex": 0,
  "correctCount": 1,
  "totalAnswered": 1,
  "totalQuestions": 3
}
```

#### 4. Trigger Model Retraining
```http
POST /api/ml/retrain
```

---

## Running Tests

An automated test suite validates the ML engine, preprocessing, training integrity, and backend routes.

Run the test suite:
```powershell
python tests/test_ml_adaptive.py
```

Expected output:
```
================ ML ADAPTIVE SYSTEM TEST SUITE ================

-- 1. Real Dataset Inspection --
  [PASS] Real dataset loaded successfully
  [PASS] Real dataset contains 2,392 genuine records
  [PASS] Contains required academic features

-- 2. Feature Preparation & Train/Test Split --
  [PASS] Feature matrix X has 13 columns
  [PASS] Target y has 3 difficulty classes
  [PASS] Stratified train size is 80% (1,913 samples)
  [PASS] Stratified test size is 20% (479 samples)
  [PASS] Test data is strictly partitioned and held out

-- 3. Model Training & Serialization --
  [PASS] .pkl model file exists on disk
  [PASS] .pkl file is non-empty
  [PASS] model_metadata.json exists

-- 4. Genuine ML Metrics Verification --
  [PASS] Model test accuracy exceeds 90% target (94.57%)
  [PASS] Weighted Precision is genuine and high (94.64%)
  [PASS] Weighted Recall is genuine and high (94.57%)
  [PASS] Weighted F1-score is genuine and high (94.52%)
  [PASS] Confusion matrix is 3x3 array
  [PASS] No synthetic data flag in metadata

-- 5. Real-Time Difficulty Prediction --
  [PASS] High performer gets 'Hard' difficulty
  [PASS] High performer confidence >= 60%
  [PASS] Struggling student gets 'Easy' difficulty
  [PASS] Average student gets 'Medium' difficulty

-- 6. Question Recommendation Logic --
  [PASS] Recommends matching Hard question when requested

-- 7. Backend API Integration --
  [PASS] GET /api/health returns 200
  [PASS] GET /api/ml/model-info returns 200
  [PASS] Model info contains correct model name
  [PASS] POST /api/ml/predict returns 200
  [PASS] Predict endpoint returns valid difficulty
  [PASS] POST /api/quizzes/{id}/adaptive/predict returns 200
  [PASS] Adaptive response includes probabilities
  [PASS] Adaptive response includes reasoning

================ SUMMARY: 30 PASSED, 0 FAILED ================
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
