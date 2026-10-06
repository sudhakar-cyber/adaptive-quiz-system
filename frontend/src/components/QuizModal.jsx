import React, { useState, useEffect, useRef } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  TrophyIcon,
  RotateCcwIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  AwardIcon,
  StarIcon
} from './Icons';
import { QuizTimer } from './QuizTimer';
import { SubmitConfirmationModal } from './SubmitConfirmationModal';
import { QuizFeedbackView } from './QuizFeedbackView';
import { sharedDatabase } from '../services/sharedDatabase';

export const QuizModal = ({
  quiz,
  studentName = 'Student',
  onClose,
  onComplete,
  showToast
}) => {
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return null;
  }

  const STORAGE_KEY = 'learnsmart_active_quiz_attempt';
  const COMPLETED_KEY = 'learnsmart_completed_quizzes';

  // Helper to parse duration from quiz data
  const getInitialDuration = () => {
    if (typeof quiz.durationInSeconds === 'number') return quiz.durationInSeconds;
    if (typeof quiz.duration === 'string') {
      const match = quiz.duration.match(/(\d+)/);
      if (match) return parseInt(match[1], 10) * 60;
    }
    return 300;
  };

  // Restore saved in-progress attempt if matching this quiz
  const getSavedAttempt = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.quizId === quiz.id && parsed.status === 'in-progress') {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to parse saved quiz attempt:', err);
    }
    return null;
  };

  const initialAttempt = getSavedAttempt();

  const [currentIndex, setCurrentIndex] = useState(() => initialAttempt?.currentIndex ?? 0);
  const [selectedAnswers, setSelectedAnswers] = useState(() => initialAttempt?.selectedAnswers ?? {});
  const [timeLeft, setTimeLeft] = useState(() => {
    if (initialAttempt && typeof initialAttempt.timeLeft === 'number') {
      return initialAttempt.timeLeft;
    }
    return getInitialDuration();
  });

  // Phases: 'test' -> 'feedback' (compulsory) -> 'results'
  const [quizPhase, setQuizPhase] = useState('test');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState(null);

  // Prevention of duplicate submissions
  const isSubmittingRef = useRef(false);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const selectedAnswersRef = useRef(selectedAnswers);
  selectedAnswersRef.current = selectedAnswers;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  // Helper to continuously save active quiz attempt to storage
  const saveActiveAttempt = (idx, answers, time) => {
    if (isSubmittingRef.current || isSubmitted || quizPhase !== 'test') return;
    try {
      const payload = {
        quizId: quiz.id,
        quiz,
        status: 'in-progress',
        currentIndex: idx,
        selectedAnswers: answers,
        timeLeft: time,
        lastSavedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to save quiz attempt progress:', err);
    }
  };

  // Ensure initial save on mount
  useEffect(() => {
    if (!isSubmitted && !isSubmittingRef.current && quizPhase === 'test') {
      saveActiveAttempt(currentIndex, selectedAnswers, timeLeft);
    }
  }, []);

  // Save whenever currentIndex or selectedAnswers change
  useEffect(() => {
    if (!isSubmitted && !isSubmittingRef.current && quizPhase === 'test') {
      saveActiveAttempt(currentIndex, selectedAnswers, timeLeftRef.current);
    }
  }, [currentIndex, selectedAnswers, isSubmitted, quizPhase]);

  // LEAVE PROTECTION: Prompt student when attempting to refresh or close tab
  useEffect(() => {
    if (quizPhase === 'results') return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'You have a test / compulsory evaluation in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [quizPhase]);

  // Transition from test to COMPULSORY FEEDBACK PAGE
  const handleProceedToFeedback = () => {
    if (isSubmittingRef.current || quizPhase !== 'test') return;
    isSubmittingRef.current = true;

    setShowConfirmModal(false);

    // ATTEMPT LOCK: Remove active attempt and record completed quiz ID
    try {
      localStorage.removeItem(STORAGE_KEY);
      const existing = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
      if (!existing.includes(quiz.id)) {
        existing.push(quiz.id);
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(existing));
      }
    } catch (err) {
      console.warn('Failed to lock completed quiz attempt:', err);
    }

    setQuizPhase('feedback');
  };

  // Submission handler once student fills all compulsory feedback fields
  const handleCompleteFeedbackAndUnlockResults = (feedbackPayload) => {
    // Calculate result using test answers
    const answers = selectedAnswersRef.current;
    const correctCount = quiz.questions.reduce((acc, q, idx) => {
      return answers[idx] === q.correctIndex ? acc + 1 : acc;
    }, 0);
    const totalQuestions = quiz.questions.length;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

    // Save feedback into shared database
    try {
      sharedDatabase.saveQuizFeedback({
        ...feedbackPayload,
        score: `${scorePercentage}%`,
        correctCount,
        totalQuestions
      });
    } catch (e) {
      console.warn('Failed to save quiz feedback:', e);
    }

    setSubmittedFeedback(feedbackPayload);
    setIsSubmitted(true);
    setQuizPhase('results');

    // Notify parent component to update stats and history
    if (onComplete) {
      onComplete({
        quizId: quiz.id,
        quizTitle: quiz.title,
        category: quiz.category,
        score: scorePercentage,
        correctCount,
        totalQuestions,
        feedback: feedbackPayload
      });
    }

    if (showToast) {
      showToast('🌟 Feedback submitted! Test results are now unlocked.');
    }
  };

  // TIMER: Ticks down during active test and triggers compulsory feedback transition on 00:00
  useEffect(() => {
    if (quizPhase !== 'test') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleProceedToFeedback();
          if (showToast) {
            showToast("⏰ Time's up! Answers locked. Please complete compulsory feedback to view your score.");
          }
          return 0;
        }
        const next = prev - 1;
        saveActiveAttempt(currentIndexRef.current, selectedAnswersRef.current, next);
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizPhase]);

  const currentQ = quiz.questions[currentIndex] || quiz.questions[0];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;

  const handleSelectOption = (optionIndex) => {
    if (quizPhase !== 'test') return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex
    }));
  };

  const correctCount = quiz.questions.reduce((acc, q, idx) => {
    return selectedAnswers[idx] === q.correctIndex ? acc + 1 : acc;
  }, 0);
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

  const handleFinishAndSave = () => {
    localStorage.removeItem(STORAGE_KEY);
    if (showToast) {
      showToast('🎉 Test completed and saved to dashboard!');
    }
    if (onClose) {
      onClose();
    }
  };

  // If student attempts to retake completed quiz, enforce single attempt lock
  const handleLockedRetake = () => {
    if (showToast) {
      showToast('Quiz already completed');
    } else {
      alert('Quiz already completed');
    }
  };

  return (
    <div
      className="quiz-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Prevent closing by clicking backdrop while in progress or during feedback
        e.stopPropagation();
      }}
    >
      <div className="quiz-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header: Note that Close / Exit button is deliberately omitted during active test & feedback */}
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
            {quizPhase === 'test' && (
              <QuizTimer timeLeft={timeLeft} />
            )}
            {quizPhase === 'feedback' && (
              <span className="badge-compulsory" style={{ fontSize: '0.74rem', padding: '4px 10px' }}>
                ⚠️ Compulsory Feedback Step
              </span>
            )}
            {quizPhase === 'results' && (
              <span
                style={{
                  color: '#00BA88',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <CheckCircleIcon size={16} color="#00BA88" />
                <span>Completed</span>
              </span>
            )}
          </div>
        </div>

        {/* PHASE 1: ACTIVE QUIZ QUESTIONS */}
        {quizPhase === 'test' && (
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
                  onClick={() => setShowConfirmModal(true)}
                  id="submit-test-btn"
                >
                  <CheckCircleIcon size={17} color="#FFFFFF" />
                  <span>Submit Test</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* PHASE 2: COMPULSORY FEEDBACK PAGE */}
        {quizPhase === 'feedback' && (
          <QuizFeedbackView
            quiz={quiz}
            studentName={studentName}
            totalQuestions={totalQuestions}
            answeredCount={answeredCount}
            onSubmitFeedback={handleCompleteFeedbackAndUnlockResults}
          />
        )}

        {/* PHASE 3: FINAL RESULTS & REVIEW */}
        {quizPhase === 'results' && (
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

            {/* Compulsory Feedback Confirmation Card */}
            {submittedFeedback && (
              <div className="results-feedback-summary">
                <div className="results-fb-header">
                  <CheckCircleIcon size={18} color="#00BA88" />
                  <span>Compulsory Test Evaluation Submitted to Course Educator</span>
                </div>
                <div className="results-fb-scores-row">
                  <span>
                    Clarity: <strong>{submittedFeedback.clarityRating}/5 ★</strong>
                  </span>
                  <span>
                    Difficulty: <strong>{submittedFeedback.difficultyRating}/5 ★</strong>
                  </span>
                  <span>
                    Educator: <strong>{submittedFeedback.educatorRating}/5 ★</strong>
                  </span>
                </div>
                {submittedFeedback.tags && submittedFeedback.tags.length > 0 && (
                  <div className="feedback-tags-grid" style={{ marginBottom: '8px' }}>
                    {submittedFeedback.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="feedback-tag-chip selected"
                        style={{ fontSize: '0.72rem', padding: '3px 10px', cursor: 'default' }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <p className="results-fb-comment">"{submittedFeedback.comments}"</p>
                {submittedFeedback.educatorMessage && (
                  <p
                    className="results-fb-comment"
                    style={{ marginTop: '4px', color: '#1A6BFF' }}
                  >
                    Direct note to Dr. Priya: "{submittedFeedback.educatorMessage}"
                  </p>
                )}
              </div>
            )}

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
                style={{ opacity: 0.65, cursor: 'not-allowed' }}
                onClick={handleLockedRetake}
                title="Quiz already completed"
              >
                <RotateCcwIcon size={16} />
                <span>Quiz already completed</span>
              </button>

              <button
                type="button"
                className="quiz-action-btn btn-finish"
                onClick={handleFinishAndSave}
                id="finish-quiz-btn"
              >
                <span>Finish & Return to Dashboard</span>
                <ArrowRightIcon size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal before Final Submission */}
      <SubmitConfirmationModal
        isOpen={showConfirmModal}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={handleProceedToFeedback}
      />
    </div>
  );
};

export default QuizModal;
