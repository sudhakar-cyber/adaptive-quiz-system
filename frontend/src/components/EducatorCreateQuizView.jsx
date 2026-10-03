import React, { useState } from 'react';
import {
  ListIcon,
  CheckCircleIcon,
  ClockIcon,
  TrashIcon,
  ArrowLeftIcon,
  CheckIcon
} from './Icons';

export const EducatorCreateQuizView = ({
  onSaveQuiz,
  onCancel,
  showToast
}) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Programming',
    difficulty: 'Medium',
    duration: '15 mins',
    status: 'Active',
    description: '',
    questions: [
      {
        id: 1,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: ''
      }
    ]
  });

  const categories = [
    'Programming',
    'Cyber Security',
    'DSA',
    'Machine Learning',
    'Cloud Computing',
    'Database Systems',
    'Web Development',
    'Computer Networks'
  ];

  const handleAddQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: Date.now(),
          question: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          explanation: ''
        }
      ]
    }));
  };

  const handleRemoveQuestion = (index) => {
    if (formData.questions.length <= 1) {
      if (showToast) showToast('A quiz must contain at least 1 question.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleQuestionTextChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      updated[index].question = value;
      return { ...prev, questions: updated };
    });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      const updatedOptions = [...updated[qIndex].options];
      updatedOptions[optIndex] = value;
      updated[qIndex].options = updatedOptions;
      return { ...prev, questions: updated };
    });
  };

  const handleCorrectIndexChange = (qIndex, correctIndex) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      updated[qIndex].correctIndex = parseInt(correctIndex, 10);
      return { ...prev, questions: updated };
    });
  };

  const handleExplanationChange = (qIndex, value) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      updated[qIndex].explanation = value;
      return { ...prev, questions: updated };
    });
  };

  const handleSubmit = (e, forcedStatus = null) => {
    if (e) e.preventDefault();

    if (!formData.title.trim()) {
      if (showToast) showToast('Please enter a quiz title.');
      return;
    }

    // Validate that questions have prompt and non-empty options
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.question.trim()) {
        if (showToast) showToast(`Please provide question text for Question ${i + 1}.`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          if (showToast) showToast(`Please fill in Option ${String.fromCharCode(65 + j)} for Question ${i + 1}.`);
          return;
        }
      }
    }

    const finalStatus = forcedStatus || formData.status;

    const diffColors = {
      Easy: { bg: '#D1FAE5', color: '#047857' },
      Medium: { bg: '#FFEDD5', color: '#C2410C' },
      Hard: { bg: '#FEE2E2', color: '#B91C1C' }
    };

    const catColors = {
      Programming: { bg: '#E6FAF0', color: '#00BA88' },
      'Cyber Security': { bg: '#FEF3C7', color: '#D97706' },
      DSA: { bg: '#E0E7FF', color: '#4F46E5' },
      'Machine Learning': { bg: '#F3E8FF', color: '#7E22CE' },
      'Cloud Computing': { bg: '#E0F2FE', color: '#0284C7' },
      'Database Systems': { bg: '#FEE2E2', color: '#DC2626' }
    };

    const newQuiz = {
      id: `quiz-custom-${Date.now()}`,
      title: formData.title.trim(),
      category: formData.category,
      categoryBg: catColors[formData.category]?.bg || '#E0F2FE',
      categoryColor: catColors[formData.category]?.color || '#0369A1',
      difficulty: formData.difficulty,
      diffBg: diffColors[formData.difficulty]?.bg || '#FFEDD5',
      diffColor: diffColors[formData.difficulty]?.color || '#C2410C',
      status: finalStatus,
      questionsCount: formData.questions.length,
      duration: formData.duration || '15 mins',
      submissionsCount: 0,
      avgScore: 0,
      passRate: 0,
      lastUpdated: 'Just now',
      description: formData.description.trim() || 'Adaptive assessment created by educator.',
      questions: formData.questions
    };

    if (onSaveQuiz) {
      onSaveQuiz(newQuiz);
    }
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="educator-section-view">
      {/* Top Header Row */}
      <div className="educator-section-header-row" style={{ alignItems: 'flex-start' }}>
        <div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: '#64748B',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '8px',
              padding: 0
            }}
          >
            <ArrowLeftIcon size={16} color="#64748B" />
            <span>Back to Quizzes</span>
          </button>
          <h1 className="educator-section-title">Create New Quiz</h1>
          <p className="educator-section-subtitle">
            Configure assessment parameters, add question banks with multiple-choice options, and publish to students.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="educator-secondary-btn"
            onClick={(e) => handleSubmit(e, 'Draft')}
          >
            Save as Draft
          </button>
          <button
            type="button"
            className="educator-primary-btn"
            onClick={(e) => handleSubmit(e, 'Active')}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
            <span>Publish Quiz</span>
          </button>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* CARD 1: Basic Information */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ListIcon size={20} color="#2563EB" />
            <span>Quiz Information & Parameters</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '18px' }}>
            {/* Title */}
            <div style={{ gridColumn: 'span 2' }}>
              <label className="educator-field-label">Quiz Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Advanced Operating Systems, Concurrency & Threads"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="educator-text-input"
              />
            </div>

            {/* Category */}
            <div>
              <label className="educator-field-label">Subject Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="educator-text-input"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px', marginBottom: '18px' }}>
            {/* Difficulty */}
            <div>
              <label className="educator-field-label">Difficulty Level *</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="educator-text-input"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="educator-field-label">Duration</label>
              <input
                type="text"
                placeholder="e.g. 10 mins"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="educator-text-input"
              />
            </div>

            {/* Status */}
            <div>
              <label className="educator-field-label">Initial Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="educator-text-input"
              >
                <option value="Active">Active (Publish immediately)</option>
                <option value="Draft">Draft (Hidden from students)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="educator-field-label">Description & Learning Objectives</label>
            <textarea
              rows={3}
              placeholder="Provide a concise description of what topics this quiz evaluates and instructions for test takers..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="educator-text-input"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* CARD 2: Question Builder */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircleIcon size={20} color="#10B981" />
                <span>Question Bank ({formData.questions.length} Questions)</span>
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748B' }}>
                For each question, select the radio button next to the verified correct answer.
              </p>
            </div>

            <button
              type="button"
              className="educator-secondary-btn"
              onClick={handleAddQuestion}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>+</span>
              <span>Add Question</span>
            </button>
          </div>

          {/* Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {formData.questions.map((q, qIndex) => (
              <div
                key={q.id || qIndex}
                style={{
                  background: '#F8FAFC',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        background: '#2563EB',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        padding: '4px 10px',
                        borderRadius: '6px'
                      }}
                    >
                      Question {qIndex + 1}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                      Correct Answer: Option {optionLetters[q.correctIndex]}
                    </span>
                  </div>

                  {formData.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.80rem',
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}
                      title="Remove question"
                    >
                      <TrashIcon size={14} color="#EF4444" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                {/* Question Prompt */}
                <div style={{ marginBottom: '14px' }}>
                  <label className="educator-field-label">Question Prompt *</label>
                  <input
                    type="text"
                    required
                    placeholder={`e.g. What is the time complexity of searching an element in a balanced BST?`}
                    value={q.question}
                    onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                    className="educator-text-input"
                    style={{ background: '#FFFFFF' }}
                  />
                </div>

                {/* Options Grid */}
                <div style={{ marginBottom: '14px' }}>
                  <label className="educator-field-label">
                    Answer Options (Select the correct option radio) *
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '10px'
                    }}
                  >
                    {q.options.map((opt, optIndex) => {
                      const isCorrect = q.correctIndex === optIndex;
                      return (
                        <div
                          key={optIndex}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: isCorrect ? '#F0FDF4' : '#FFFFFF',
                            border: `1.5px solid ${isCorrect ? '#10B981' : '#CBD5E1'}`,
                            borderRadius: '10px',
                            padding: '6px 12px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <input
                            type="radio"
                            name={`correct-${q.id || qIndex}`}
                            checked={isCorrect}
                            onChange={() => handleCorrectIndexChange(qIndex, optIndex)}
                            style={{ cursor: 'pointer', accentColor: '#10B981', width: '16px', height: '16px' }}
                            id={`radio-${qIndex}-${optIndex}`}
                          />
                          <label
                            htmlFor={`radio-${qIndex}-${optIndex}`}
                            style={{
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: isCorrect ? '#047857' : '#64748B',
                              cursor: 'pointer',
                              minWidth: '20px'
                            }}
                          >
                            {optionLetters[optIndex]}.
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={`Option ${optionLetters[optIndex]} text`}
                            value={opt}
                            onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                            style={{
                              flex: 1,
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              fontSize: '0.86rem',
                              color: '#1E293B'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="educator-field-label">Explanation / Solution Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Balanced BST search operations take O(log n) time in the worst and average cases."
                    value={q.explanation || ''}
                    onChange={(e) => handleExplanationChange(qIndex, e.target.value)}
                    className="educator-text-input"
                    style={{ background: '#FFFFFF', fontSize: '0.82rem' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              className="educator-secondary-btn"
              onClick={handleAddQuestion}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
            >
              <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>+</span>
              <span>Add Another Question</span>
            </button>
          </div>
        </div>

        {/* Bottom Submission Bar */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 600 }}>
              Summary:
            </span>
            <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
              <strong>{formData.questions.length}</strong> Questions
            </span>
            <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
              Category: <strong>{formData.category}</strong>
            </span>
            <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
              Difficulty: <strong>{formData.difficulty}</strong>
            </span>
            <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
              Duration: <strong>{formData.duration}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="educator-secondary-btn"
              onClick={onCancel}
            >
              Discard
            </button>
            <button
              type="button"
              className="educator-secondary-btn"
              onClick={(e) => handleSubmit(e, 'Draft')}
            >
              Save as Draft
            </button>
            <button
              type="button"
              className="educator-primary-btn"
              onClick={(e) => handleSubmit(e, 'Active')}
            >
              Create & Publish Quiz
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EducatorCreateQuizView;
