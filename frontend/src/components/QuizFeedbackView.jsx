import React, { useState } from 'react';
import {
  StarIcon,
  CheckCircleIcon,
  AwardIcon,
  ArrowRightIcon
} from './Icons';

export const QuizFeedbackView = ({
  quiz,
  studentName = 'Student',
  onSubmitFeedback,
  totalQuestions = 0,
  answeredCount = 0
}) => {
  // Star rating states (1 to 5)
  const [clarityRating, setClarityRating] = useState(0);
  const [hoverClarity, setHoverClarity] = useState(0);

  const [difficultyRating, setDifficultyRating] = useState(0);
  const [hoverDifficulty, setHoverDifficulty] = useState(0);

  const [educatorRating, setEducatorRating] = useState(0);
  const [hoverEducator, setHoverEducator] = useState(0);

  // Quick tags multi-select
  const [selectedTags, setSelectedTags] = useState([]);

  // Compulsory comments textarea
  const [comments, setComments] = useState('');
  const [educatorMessage, setEducatorMessage] = useState('');

  // Validation feedback
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MIN_COMMENT_LENGTH = 15;

  const availableTags = [
    '🎯 Well Balanced',
    '💡 Clear Explanations',
    '⏱️ Strict Time Limit',
    '🧠 Challenging Problems',
    '🔍 Needs More Hints',
    '✅ High Quality Questions',
    '⚖️ Fair Scoring',
    '📚 Great Concept Practice'
  ];

  const clarityLabels = {
    1: 'Very Confusing / Ambiguous',
    2: 'Needs Clarity Improvement',
    3: 'Clear & Understandable',
    4: 'High Quality Questions',
    5: 'Outstanding Clarity & Relevance'
  };

  const difficultyLabels = {
    1: 'Too Easy / Basic',
    2: 'Slightly Easy',
    3: 'Optimal / Well Balanced',
    4: 'Challenging & Rigorous',
    5: 'Extremely Hard / Tough'
  };

  const educatorLabels = {
    1: 'Needs Major Support',
    2: 'Fair Effort',
    3: 'Good Learning Material',
    4: 'Very Helpful & Engaging',
    5: 'Exceptional Faculty Guidance'
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const renderStarPicker = (
    value,
    hoverValue,
    setValue,
    setHoverValue,
    labelsMap,
    fieldName
  ) => {
    const activeScore = hoverValue || value;

    return (
      <div className="feedback-star-picker">
        <div className="feedback-stars-row" role="radiogroup" aria-label={fieldName}>
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= (hoverValue || value);
            return (
              <button
                key={star}
                type="button"
                className={`feedback-star-btn ${isFilled ? 'filled' : ''}`}
                onClick={() => setValue(star)}
                onMouseEnter={() => setHoverValue(star)}
                onMouseLeave={() => setHoverValue(0)}
                aria-label={`${star} of 5 stars`}
              >
                <StarIcon
                  size={28}
                  color={isFilled ? '#F59E0B' : '#CBD5E1'}
                  fill={isFilled ? '#F59E0B' : 'none'}
                />
              </button>
            );
          })}
        </div>
        <div className="feedback-rating-label">
          {activeScore > 0 ? (
            <span className="rating-desc active">
              ★ {activeScore}/5 — {labelsMap[activeScore]}
            </span>
          ) : (
            <span className="rating-desc placeholder">Select 1 to 5 stars (Required)</span>
          )}
        </div>
      </div>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    const errors = [];
    if (clarityRating === 0) {
      errors.push('Question Clarity & Quality rating is required.');
    }
    if (difficultyRating === 0) {
      errors.push('Quiz Difficulty rating is required.');
    }
    if (educatorRating === 0) {
      errors.push("Educator / Faculty rating is required.");
    }
    if (!comments.trim()) {
      errors.push('Constructive comments & suggestions are compulsory.');
    } else if (comments.trim().length < MIN_COMMENT_LENGTH) {
      errors.push(
        `Please enter at least ${MIN_COMMENT_LENGTH} characters of feedback (currently ${comments.trim().length}).`
      );
    }

    setValidationErrors(errors);

    if (errors.length > 0) {
      // Scroll to the error alert
      const errorBox = document.getElementById('feedback-error-banner');
      if (errorBox) {
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const feedbackPayload = {
        quizId: quiz.id,
        quizTitle: quiz.title,
        quizCategory: quiz.category,
        studentName,
        clarityRating,
        difficultyRating,
        educatorRating,
        tags: selectedTags,
        comments: comments.trim(),
        educatorMessage: educatorMessage.trim(),
        submittedAt: new Date().toISOString()
      };

      onSubmitFeedback(feedbackPayload);
    }, 400);
  };

  const isCommentsValid = comments.trim().length >= MIN_COMMENT_LENGTH;

  return (
    <div className="quiz-feedback-container">
      {/* Step Indicator Header */}
      <div className="feedback-flow-header">
        <div className="flow-steps-badge">
          <span className="flow-step completed">
            <span className="step-circle">✓</span>
            <span>Test Submitted</span>
          </span>
          <span className="flow-divider">➔</span>
          <span className="flow-step current">
            <span className="step-circle">2</span>
            <span>Compulsory Feedback</span>
          </span>
          <span className="flow-divider">➔</span>
          <span className="flow-step pending">
            <span className="step-circle">3</span>
            <span>Results & Review</span>
          </span>
        </div>

        <div className="feedback-banner-title-wrap">
          <div className="feedback-banner-icon-bubble">
            <AwardIcon size={30} color="#1A6BFF" />
          </div>
          <div>
            <h2 className="feedback-main-title">Mandatory Test Feedback & Evaluation</h2>
            <p className="feedback-main-subtitle">
              Your test answers have been locked. Academic policy requires students to complete this
              brief feedback evaluation before your test score and question review are unlocked.
            </p>
          </div>
        </div>

        <div className="feedback-compulsory-alert">
          <div className="compulsory-alert-icon">⚠️</div>
          <div className="compulsory-alert-text">
            <strong>Compulsory Requirement:</strong> Please provide all 3 star ratings and at least{' '}
            {MIN_COMMENT_LENGTH} characters of constructive feedback to proceed to your final score.
          </div>
        </div>
      </div>

      {/* Validation Banner if submitted with errors */}
      {attemptedSubmit && validationErrors.length > 0 && (
        <div id="feedback-error-banner" className="feedback-error-banner">
          <div className="error-banner-header">
            <span>⚠️ Please complete all compulsory fields before continuing:</span>
          </div>
          <ul className="error-banner-list">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="feedback-form">
        {/* Rating 1: Question Clarity */}
        <div className={`feedback-card-section ${attemptedSubmit && clarityRating === 0 ? 'section-error' : ''}`}>
          <div className="section-label-row">
            <div>
              <span className="section-title">1. Question Clarity & Concept Quality</span>
              <span className="required-asterisk">*</span>
            </div>
            <span className="badge-compulsory">Compulsory</span>
          </div>
          <p className="section-help-text">
            Were the questions phrased clearly, with accurate technical wording and fair difficulty?
          </p>
          {renderStarPicker(
            clarityRating,
            hoverClarity,
            setClarityRating,
            setHoverClarity,
            clarityLabels,
            'Question Clarity'
          )}
        </div>

        {/* Rating 2: Quiz Difficulty */}
        <div className={`feedback-card-section ${attemptedSubmit && difficultyRating === 0 ? 'section-error' : ''}`}>
          <div className="section-label-row">
            <div>
              <span className="section-title">2. Quiz Difficulty & Challenge Balance</span>
              <span className="required-asterisk">*</span>
            </div>
            <span className="badge-compulsory">Compulsory</span>
          </div>
          <p className="section-help-text">
            How would you rate the overall test difficulty relative to the allotted time?
          </p>
          {renderStarPicker(
            difficultyRating,
            hoverDifficulty,
            setDifficultyRating,
            setHoverDifficulty,
            difficultyLabels,
            'Quiz Difficulty'
          )}
        </div>

        {/* Rating 3: Educator Evaluation */}
        <div className={`feedback-card-section ${attemptedSubmit && educatorRating === 0 ? 'section-error' : ''}`}>
          <div className="section-label-row">
            <div>
              <span className="section-title">3. Course Educator / Curriculum Preparation</span>
              <span className="required-asterisk">*</span>
            </div>
            <span className="badge-compulsory">Compulsory</span>
          </div>
          <p className="section-help-text">
            Rate Dr. Priya S. / faculty course materials and coverage for this assessment topic.
          </p>
          {renderStarPicker(
            educatorRating,
            hoverEducator,
            setEducatorRating,
            setHoverEducator,
            educatorLabels,
            'Educator Evaluation'
          )}
        </div>

        {/* Section 4: Quick Feedback Tags */}
        <div className="feedback-card-section">
          <div className="section-label-row">
            <div>
              <span className="section-title">4. Quick Feedback Tags</span>
              <span className="optional-tag">(Optional - Select all that apply)</span>
            </div>
          </div>
          <p className="section-help-text">
            Click any tags that describe your test experience:
          </p>
          <div className="feedback-tags-grid">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`feedback-tag-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  <span>{tag}</span>
                  {isSelected && <span className="chip-check">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 5: Compulsory Written Feedback */}
        <div className={`feedback-card-section ${attemptedSubmit && !isCommentsValid ? 'section-error' : ''}`}>
          <div className="section-label-row">
            <div>
              <span className="section-title">5. Constructive Comments & Suggestions</span>
              <span className="required-asterisk">*</span>
            </div>
            <span className="badge-compulsory">Compulsory</span>
          </div>
          <p className="section-help-text">
            Explain your ratings, suggest improvements, or mention any questions you found notable (minimum {MIN_COMMENT_LENGTH} characters).
          </p>

          <div className="textarea-wrapper">
            <textarea
              className={`feedback-textarea ${attemptedSubmit && !isCommentsValid ? 'input-error' : ''}`}
              rows={4}
              placeholder="e.g., The questions on binary search and time complexity were well balanced, but question 3 could have used clearer option descriptions..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              id="compulsory-feedback-textarea"
            />
            <div className="textarea-counter-row">
              <span className={`counter-pill ${isCommentsValid ? 'counter-valid' : 'counter-invalid'}`}>
                {comments.trim().length} / {MIN_COMMENT_LENGTH} min characters
                {isCommentsValid ? ' ✓' : ''}
              </span>
              <span className="counter-hint">
                {isCommentsValid
                  ? 'Compulsory length met'
                  : `Need ${Math.max(0, MIN_COMMENT_LENGTH - comments.trim().length)} more characters`}
              </span>
            </div>
          </div>
        </div>

        {/* Section 6: Direct Message to Educator (Optional) */}
        <div className="feedback-card-section">
          <div className="section-label-row">
            <div>
              <span className="section-title">6. Private Message / Note for Educator</span>
              <span className="optional-tag">(Optional)</span>
            </div>
          </div>
          <p className="section-help-text">
            Have a direct question or clarification for Dr. Priya S.? It will be delivered to her instructor dashboard.
          </p>
          <input
            type="text"
            className="feedback-input"
            placeholder="e.g., Would love to review Question 4 during Thursday office hours."
            value={educatorMessage}
            onChange={(e) => setEducatorMessage(e.target.value)}
          />
        </div>

        {/* Submit Actions Row */}
        <div className="feedback-submit-row">
          <div className="submit-security-note">
            <span className="lock-icon">🔒</span>
            <span>Your feedback is securely recorded and sent to the course department.</span>
          </div>

          <button
            type="submit"
            className="feedback-submit-btn"
            disabled={isSubmitting}
            id="submit-feedback-btn"
          >
            {isSubmitting ? (
              <span>Submitting Feedback...</span>
            ) : (
              <>
                <span>Submit Feedback & Unlock Results</span>
                <ArrowRightIcon size={18} color="#FFFFFF" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuizFeedbackView;
