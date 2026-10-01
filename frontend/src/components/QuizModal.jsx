import React, { useState, useEffect } from 'react';
import {
  XIcon,
  ClockIcon,
  CheckCircleIcon,
  TrophyIcon,
  RotateCcwIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  AwardIcon
} from './Icons';

export const QuizModal = ({ quiz, onClose, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (isSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted]);

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return null;
  }

  const currentQ = quiz.questions[currentIndex];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;

  const handleSelectOption = (optionIndex) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex
    }));
  };

  const handleSubmitQuiz = () => {
    setIsSubmitted(true);
  };

  const correctCount = quiz.questions.reduce((acc, q, idx) => {
    return selectedAnswers[idx] === q.correctIndex ? acc + 1 : acc;
  }, 0);
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleFinishAndSave = () => {
    if (onComplete) {
      onComplete({
        quizId: quiz.id,
        quizTitle: quiz.title,
        category: quiz.category,
        score: scorePercentage,
        correctCount,
        totalQuestions
      });
    }
    onClose();
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setIsSubmitted(false);
    setTimeLeft(300);
    setShowReview(false);
  };

  return (
    <div className="quiz-modal-backdrop" role="dialog" aria-modal="true">
      <div className="quiz-modal-card">
        <div className="quiz-modal-header">
          <div className="quiz-header-meta">
            <span
              className="quiz-badge"
              style={{
                backgroundColor: quiz.categoryBg || '#E6FAF0',
                color: quiz.categoryColor || '#00BA88'
              }}
            >
              {quiz.category}
            </span>
            <h2 className="quiz-modal-title">{quiz.title}</h2>
          </div>

          <div className="quiz-header-controls">
            {!isSubmitted && (
              <div
                className={`quiz-timer-pill ${
                  timeLeft < 60 ? 'timer-warning' : ''
                }`}
              >
                <ClockIcon size={16} color={timeLeft < 60 ? '#EF4444' : '#1A6BFF'} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
            <button
              type="button"
              className="quiz-close-button"
              onClick={onClose}
              aria-label="Close Quiz"
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {!isSubmitted ? (
          <div className="quiz-modal-body">
            <div className="quiz-progress-section">
              <div className="quiz-progress-text">
                <span>
                  Question <strong>{currentIndex + 1}</strong> of {totalQuestions}
                </span>
                <span className="quiz-answered-count">
                  {answeredCount}/{totalQuestions} Answered
                </span>
              </div>
              <div className="quiz-progress-track">
                <div
                  className="quiz-progress-fill"
                  style={{
                    width: `${((currentIndex + 1) / totalQuestions) * 100}%`
                  }}
                />
              </div>
            </div>

            <div className="quiz-question-box">
              <h3 className="quiz-question-text">{currentQ.question}</h3>
            </div>

            <div className="quiz-options-list">
              {currentQ.options.map((option, optIdx) => {
                const isSelected = selectedAnswers[currentIndex] === optIdx;
                const letter = String.fromCharCode(65 + optIdx);
                return (
                  <button
                    key={optIdx}
                    type="button"
                    className={`quiz-option-button ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(optIdx)}
                  >
                    <span className="option-letter">{letter}</span>
                    <span className="option-label">{option}</span>
                    {isSelected && (
                      <span className="option-check-dot">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="quiz-modal-footer">
              <button
                type="button"
                className="quiz-btn-nav quiz-btn-secondary"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              >
                <ArrowLeftIcon size={16} />
                <span>Previous</span>
              </button>

              <div className="quiz-footer-center">
                {selectedAnswers[currentIndex] !== undefined && (
                  <button
                    type="button"
                    className="quiz-clear-btn"
                    onClick={() => {
                      const updated = { ...selectedAnswers };
                      delete updated[currentIndex];
                      setSelectedAnswers(updated);
                    }}
                  >
                    Clear Choice
                  </button>
                )}
              </div>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  className="quiz-btn-nav quiz-btn-primary"
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                >
                  <span>Next</span>
                  <ArrowRightIcon size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="quiz-btn-nav quiz-btn-submit"
                  onClick={handleSubmitQuiz}
                >
                  <CheckCircleIcon size={17} color="#FFFFFF" />
                  <span>Submit Quiz</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="quiz-results-container">
            <div className="results-celebration-card">
              <div className="results-icon-bubble">
                {scorePercentage >= 70 ? (
                  <TrophyIcon size={44} color="#F59E0B" />
                ) : (
                  <AwardIcon size={44} color="#3B82F6" />
                )}
              </div>

              <h3 className="results-heading">
                {scorePercentage >= 80
                  ? 'Fantastic Performance! 🎉'
                  : scorePercentage >= 60
                  ? 'Great Effort! 👍'
                  : 'Good Practice Attempt! 📚'}
              </h3>

              <p className="results-subtext">
                You have completed <strong>{quiz.title}</strong>.
              </p>

              <div className="results-score-display">
                <div className="score-number-group">
                  <span className="big-score-value">{scorePercentage}%</span>
                  <span className="score-fraction">
                    ({correctCount} of {totalQuestions} correct)
                  </span>
                </div>
              </div>

              <div className="results-stats-row">
                <div className="results-stat-box stat-green">
                  <span className="stat-label">Correct</span>
                  <span className="stat-num">{correctCount}</span>
                </div>
                <div className="results-stat-box stat-red">
                  <span className="stat-label">Incorrect</span>
                  <span className="stat-num">{totalQuestions - correctCount}</span>
                </div>
                <div className="results-stat-box stat-blue">
                  <span className="stat-label">Status</span>
                  <span className="stat-num">
                    {scorePercentage >= 70 ? 'Passed' : 'Needs Review'}
                  </span>
                </div>
              </div>
            </div>

            <div className="results-review-section">
              <button
                type="button"
                className="toggle-review-btn"
                onClick={() => setShowReview(!showReview)}
              >
                <span>{showReview ? 'Hide Answers Review' : 'Review Questions & Answers'}</span>
                <span>{showReview ? '▲' : '▼'}</span>
              </button>

              {showReview && (
                <div className="review-questions-list">
                  {quiz.questions.map((q, qIndex) => {
                    const studentAns = selectedAnswers[qIndex];
                    const isCorrect = studentAns === q.correctIndex;
                    return (
                      <div
                        key={q.id}
                        className={`review-question-card ${
                          isCorrect ? 'review-correct' : 'review-incorrect'
                        }`}
                      >
                        <div className="review-q-header">
                          <span className="review-q-num">Q{qIndex + 1}</span>
                          <span className="review-status-pill">
                            {isCorrect ? '✓ Correct' : '✕ Incorrect'}
                          </span>
                        </div>
                        <p className="review-q-title">{q.question}</p>

                        <div className="review-answers-compare">
                          <div className="review-ans-item">
                            <span className="review-ans-label">Your Answer:</span>
                            <span className={isCorrect ? 'ans-correct' : 'ans-wrong'}>
                              {studentAns !== undefined
                                ? q.options[studentAns]
                                : 'Not Answered'}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div className="review-ans-item">
                              <span className="review-ans-label">Correct Answer:</span>
                              <span className="ans-correct">
                                {q.options[q.correctIndex]}
                              </span>
                            </div>
                          )}
                        </div>

                        {q.explanation && (
                          <div className="review-explanation">
                            <strong>Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="results-actions-row">
              <button
                type="button"
                className="quiz-action-btn btn-retake"
                onClick={handleRetake}
              >
                <RotateCcwIcon size={16} />
                <span>Retake Quiz</span>
              </button>

              <button
                type="button"
                className="quiz-action-btn btn-finish"
                onClick={handleFinishAndSave}
              >
                <span>Finish & Return to Dashboard</span>
                <ArrowRightIcon size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
