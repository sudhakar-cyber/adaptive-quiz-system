import React, { useState, useEffect } from 'react';
import {
  SearchIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
  StarIcon,
  ClockIcon,
  ListIcon,
  XIcon
} from './Icons';

export const EducatorManageQuizzesView = ({
  quizzes = [],
  onUpdateQuizzes,
  showToast,
  externalSearch = '',
  openCreateModalInitially = false,
  onCloseCreateModal,
  onCreateQuizClick
}) => {
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(openCreateModalInitially);

  useEffect(() => {
    if (openCreateModalInitially) {
      handleOpenCreate();
    }
  }, [openCreateModalInitially]);

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [viewingQuestionsQuiz, setViewingQuestionsQuiz] = useState(null);
  const [deleteConfirmQuiz, setDeleteConfirmQuiz] = useState(null);

  // Form State for Create / Edit
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
    'All',
    'Programming',
    'Cyber Security',
    'DSA',
    'Machine Learning',
    'Cloud Computing',
    'Database Systems'
  ];

  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];
  const statuses = ['All', 'Active', 'Draft', 'Archived'];

  // Filter quizzes
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      !searchQuery.trim() ||
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || quiz.category === selectedCategory;

    const matchesDifficulty =
      selectedDifficulty === 'All' || quiz.difficulty === selectedDifficulty;

    const matchesStatus =
      selectedStatus === 'All' || quiz.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus;
  });

  const handleOpenCreate = () => {
    setFormData({
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
    setEditingQuiz(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      title: quiz.title,
      category: quiz.category,
      difficulty: quiz.difficulty,
      duration: quiz.duration || '15 mins',
      status: quiz.status || 'Active',
      description: quiz.description || '',
      questions: quiz.questions && quiz.questions.length > 0
        ? JSON.parse(JSON.stringify(quiz.questions))
        : [
            {
              id: 1,
              question: '',
              options: ['', '', '', ''],
              correctIndex: 0,
              explanation: ''
            }
          ]
    });
    setIsCreateModalOpen(true);
  };

  const handleAddQuestionField = () => {
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

  const handleRemoveQuestionField = (index) => {
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

  const handleSaveQuiz = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      if (showToast) showToast('Please provide a quiz title.');
      return;
    }

    if (editingQuiz) {
      // Update existing
      const updatedList = quizzes.map((q) => {
        if (q.id === editingQuiz.id) {
          return {
            ...q,
            title: formData.title.trim(),
            category: formData.category,
            difficulty: formData.difficulty,
            duration: formData.duration,
            status: formData.status,
            description: formData.description.trim(),
            questionsCount: formData.questions.length,
            questions: formData.questions,
            lastUpdated: 'Just now'
          };
        }
        return q;
      });
      onUpdateQuizzes(updatedList);
      if (showToast) showToast(`Quiz "${formData.title}" updated successfully!`);
    } else {
      // Create new
      const newQuiz = {
        id: `quiz-custom-${Date.now()}`,
        title: formData.title.trim(),
        category: formData.category,
        categoryBg: '#E0F2FE',
        categoryColor: '#0369A1',
        difficulty: formData.difficulty,
        diffBg: formData.difficulty === 'Easy' ? '#D1FAE5' : formData.difficulty === 'Medium' ? '#FFEDD5' : '#FEE2E2',
        diffColor: formData.difficulty === 'Easy' ? '#047857' : formData.difficulty === 'Medium' ? '#C2410C' : '#B91C1C',
        status: formData.status,
        questionsCount: formData.questions.length,
        duration: formData.duration,
        submissionsCount: 0,
        avgScore: 0,
        passRate: 0,
        lastUpdated: 'Just now',
        description: formData.description.trim() || 'Custom educator created quiz.',
        questions: formData.questions
      };
      onUpdateQuizzes([newQuiz, ...quizzes]);
      if (showToast) showToast(`New quiz "${formData.title}" published successfully!`);
    }

    handleCloseModal();
  };

  const handleDuplicateQuiz = (quiz) => {
    const cloned = {
      ...quiz,
      id: `quiz-copy-${Date.now()}`,
      title: `${quiz.title} (Copy)`,
      status: 'Draft',
      submissionsCount: 0,
      avgScore: 0,
      passRate: 0,
      lastUpdated: 'Just now'
    };
    onUpdateQuizzes([cloned, ...quizzes]);
    if (showToast) showToast(`Duplicated "${quiz.title}" as Draft!`);
  };

  const handleToggleStatus = (quiz) => {
    const nextStatus = quiz.status === 'Active' ? 'Draft' : quiz.status === 'Draft' ? 'Archived' : 'Active';
    const updated = quizzes.map((q) => (q.id === quiz.id ? { ...q, status: nextStatus, lastUpdated: 'Just now' } : q));
    onUpdateQuizzes(updated);
    if (showToast) showToast(`"${quiz.title}" status changed to ${nextStatus}.`);
  };

  const handleDeleteQuiz = () => {
    if (!deleteConfirmQuiz) return;
    const updated = quizzes.filter((q) => q.id !== deleteConfirmQuiz.id);
    onUpdateQuizzes(updated);
    if (showToast) showToast(`Quiz "${deleteConfirmQuiz.title}" deleted.`);
    setDeleteConfirmQuiz(null);
  };

  // Stats
  const totalCount = quizzes.length;
  const activeCount = quizzes.filter((q) => q.status === 'Active').length;
  const draftCount = quizzes.filter((q) => q.status === 'Draft').length;
  const totalSubmissions = quizzes.reduce((sum, q) => sum + (q.submissionsCount || 0), 0);

  return (
    <div className="educator-section-view">
      {/* Top Section Header */}
      <div className="educator-section-header-row">
        <div>
          <h1 className="educator-section-title">Manage Quizzes</h1>
          <p className="educator-section-subtitle">
            Create, calibrate difficulty, manage assessments, and review live question banks.
          </p>
        </div>
        <button
          type="button"
          className="educator-primary-btn"
          onClick={() => {
            if (onCreateQuizClick) {
              onCreateQuizClick();
            } else {
              handleOpenCreate();
            }
          }}
        >
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
          <span>Create New Quiz</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="educator-stat-grid" style={{ marginBottom: '22px' }}>
        <div className="educator-stat-card card-blue">
          <div className="educator-stat-icon-wrap">
            <ListIcon size={24} color="#2563EB" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Total Quizzes</span>
            <div className="educator-stat-value">{totalCount}</div>
          </div>
        </div>

        <div className="educator-stat-card card-green">
          <div className="educator-stat-icon-wrap">
            <CheckCircleIcon size={24} color="#10B981" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Active / Published</span>
            <div className="educator-stat-value">{activeCount}</div>
          </div>
        </div>

        <div className="educator-stat-card card-amber">
          <div className="educator-stat-icon-wrap">
            <ClockIcon size={24} color="#F59E0B" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Drafts & In-Review</span>
            <div className="educator-stat-value">{draftCount}</div>
          </div>
        </div>

        <div className="educator-stat-card card-purple">
          <div className="educator-stat-icon-wrap">
            <StarIcon size={24} color="#8B5CF6" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Total Submissions</span>
            <div className="educator-stat-value">{totalSubmissions}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="educator-filter-toolbar">
        <div className="educator-filter-search-box">
          <SearchIcon size={18} color="#64748B" />
          <input
            type="text"
            placeholder="Search quizzes by title, category, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="educator-clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              <XIcon size={14} color="#64748B" />
            </button>
          )}
        </div>

        <div className="educator-filter-selects">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="educator-select-input"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="educator-select-input"
          >
            {difficulties.map((d) => (
              <option key={d} value={d}>
                Difficulty: {d}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="educator-select-input"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                Status: {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quizzes List Cards */}
      <div className="educator-quiz-cards-grid">
        {filteredQuizzes.length > 0 ? (
          filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="educator-quiz-item-card">
              <div className="educator-quiz-card-top">
                <div className="educator-quiz-tags">
                  <span
                    className="educator-pill-badge"
                    style={{
                      backgroundColor: quiz.categoryBg || '#EFF6FF',
                      color: quiz.categoryColor || '#1D4ED8'
                    }}
                  >
                    {quiz.category}
                  </span>
                  <span
                    className="educator-pill-badge"
                    style={{
                      backgroundColor:
                        quiz.difficulty === 'Easy'
                          ? '#ECFDF5'
                          : quiz.difficulty === 'Medium'
                          ? '#FFFBEB'
                          : '#FEF2F2',
                      color:
                        quiz.difficulty === 'Easy'
                          ? '#059669'
                          : quiz.difficulty === 'Medium'
                          ? '#D97706'
                          : '#DC2626'
                    }}
                  >
                    {quiz.difficulty}
                  </span>
                  <span
                    className={`educator-status-tag ${quiz.status.toLowerCase()}`}
                  >
                    {quiz.status}
                  </span>
                </div>
                <div className="educator-quiz-card-actions">
                  <button
                    type="button"
                    className="educator-icon-btn"
                    title="Edit Quiz"
                    onClick={() => handleOpenEdit(quiz)}
                  >
                    <EditIcon size={16} color="#475569" />
                  </button>
                  <button
                    type="button"
                    className="educator-icon-btn danger"
                    title="Delete Quiz"
                    onClick={() => setDeleteConfirmQuiz(quiz)}
                  >
                    <TrashIcon size={16} color="#DC2626" />
                  </button>
                </div>
              </div>

              <h3 className="educator-quiz-item-title">{quiz.title}</h3>
              <p className="educator-quiz-item-desc">{quiz.description}</p>

              {/* Quiz Metrics */}
              <div className="educator-quiz-metrics-row">
                <div className="educator-metric-col">
                  <span className="educator-metric-label">Questions</span>
                  <span className="educator-metric-val">
                    {quiz.questions ? quiz.questions.length : quiz.questionsCount || 0} Qs
                  </span>
                </div>
                <div className="educator-metric-col">
                  <span className="educator-metric-label">Duration</span>
                  <span className="educator-metric-val">{quiz.duration}</span>
                </div>
                <div className="educator-metric-col">
                  <span className="educator-metric-label">Submissions</span>
                  <span className="educator-metric-val">{quiz.submissionsCount || 0}</span>
                </div>
                <div className="educator-metric-col">
                  <span className="educator-metric-label">Avg. Score</span>
                  <span className="educator-metric-val">
                    {quiz.avgScore ? `${quiz.avgScore}%` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="educator-quiz-card-footer">
                <span className="educator-card-updated-text">
                  Updated: {quiz.lastUpdated || 'Recently'}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="educator-secondary-btn sm"
                    onClick={() => setViewingQuestionsQuiz(quiz)}
                  >
                    Questions ({quiz.questions ? quiz.questions.length : 0})
                  </button>
                  <button
                    type="button"
                    className="educator-secondary-btn sm"
                    onClick={() => handleToggleStatus(quiz)}
                  >
                    {quiz.status === 'Active' ? 'Set Draft' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    className="educator-secondary-btn sm"
                    onClick={() => handleDuplicateQuiz(quiz)}
                    title="Duplicate Quiz"
                  >
                    Duplicate
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="educator-empty-state-card">
            <ListIcon size={42} color="#94A3B8" />
            <h3>No Quizzes Found</h3>
            <p>
              No quizzes match your active filters or search term "{searchQuery}". Try clearing filters or create a new quiz.
            </p>
            <button
              type="button"
              className="educator-primary-btn"
              onClick={() => {
                if (onCreateQuizClick) {
                  onCreateQuizClick();
                } else {
                  handleOpenCreate();
                }
              }}
            >
              + Create New Quiz
            </button>
          </div>
        )}
      </div>

      {/* MODAL: View Questions */}
      {viewingQuestionsQuiz && (
        <div
          className="educator-modal-overlay"
          onClick={() => setViewingQuestionsQuiz(null)}
        >
          <div
            className="educator-modal-box"
            style={{ maxWidth: '680px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <div>
                <h3 className="educator-card-title">
                  Questions: {viewingQuestionsQuiz.title}
                </h3>
                <span style={{ fontSize: '0.80rem', color: '#64748B' }}>
                  {viewingQuestionsQuiz.category} • {viewingQuestionsQuiz.difficulty} •{' '}
                  {viewingQuestionsQuiz.duration}
                </span>
              </div>
              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setViewingQuestionsQuiz(null)}
              >
                ✕
              </button>
            </div>

            <div
              className="educator-modal-scroll-body"
              style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {viewingQuestionsQuiz.questions && viewingQuestionsQuiz.questions.length > 0 ? (
                viewingQuestionsQuiz.questions.map((q, qIndex) => (
                  <div
                    key={q.id || qIndex}
                    style={{
                      background: '#F8FAFC',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                      Q{qIndex + 1}: {q.question}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {q.options &&
                        q.options.map((opt, optIndex) => {
                          const isCorrect = q.correctIndex === optIndex;
                          return (
                            <div
                              key={optIndex}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.84rem',
                                background: isCorrect ? '#ECFDF5' : '#FFFFFF',
                                border: isCorrect ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                                color: isCorrect ? '#065F46' : '#334155',
                                fontWeight: isCorrect ? 600 : 400
                              }}
                            >
                              {isCorrect ? '✓ ' : ''}
                              {opt}
                            </div>
                          );
                        })}
                    </div>
                    {q.explanation && (
                      <div
                        style={{
                          marginTop: '10px',
                          fontSize: '0.80rem',
                          color: '#475569',
                          background: '#F1F5F9',
                          padding: '6px 10px',
                          borderRadius: '6px'
                        }}
                      >
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: '#64748B' }}>No questions available for this quiz.</p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '10px' }}>
              <button
                type="button"
                className="educator-primary-btn"
                onClick={() => {
                  const target = viewingQuestionsQuiz;
                  setViewingQuestionsQuiz(null);
                  handleOpenEdit(target);
                }}
              >
                Edit Questions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Quiz */}
      {isCreateModalOpen && (
        <div
          className="educator-modal-overlay"
          onClick={handleCloseModal}
        >
          <div
            className="educator-modal-box"
            style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <h3 className="educator-card-title">
                {editingQuiz ? 'Edit Quiz Assessment' : '+ Create New Quiz'}
              </h3>
              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={handleCloseModal}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label className="educator-field-label">Quiz Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Operating Systems & Concurrency"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="educator-text-input"
                  />
                </div>
                <div>
                  <label className="educator-field-label">Subject Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="educator-text-input"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <label className="educator-field-label">Difficulty *</label>
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
                <div>
                  <label className="educator-field-label">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 15 mins"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="educator-text-input"
                  />
                </div>
                <div>
                  <label className="educator-field-label">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="educator-text-input"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="educator-field-label">Description & Learning Objectives</label>
                <textarea
                  rows={2}
                  placeholder="Summarize the core topics and expectations for students..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="educator-text-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Question Builder */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>
                    Quiz Questions ({formData.questions.length})
                  </h4>
                  <button
                    type="button"
                    className="educator-secondary-btn sm"
                    onClick={handleAddQuestionField}
                  >
                    + Add Question
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {formData.questions.map((q, qIndex) => (
                    <div
                      key={q.id || qIndex}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderRadius: '12px',
                        padding: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1E293B' }}>
                          Question #{qIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestionField(qIndex)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#DC2626',
                            fontSize: '0.80rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </div>

                      <input
                        type="text"
                        required
                        placeholder="Enter the question text..."
                        value={q.question}
                        onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                        className="educator-text-input"
                        style={{ marginBottom: '12px' }}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        {q.options.map((opt, optIndex) => (
                          <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={q.correctIndex === optIndex}
                              onChange={() => handleCorrectIndexChange(qIndex, optIndex)}
                              title="Mark as correct answer"
                            />
                            <input
                              type="text"
                              required
                              placeholder={`Option ${optIndex + 1}`}
                              value={opt}
                              onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                              className="educator-text-input"
                              style={{ padding: '6px 10px', fontSize: '0.84rem' }}
                            />
                          </div>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Explanation for the correct answer (optional)..."
                        value={q.explanation || ''}
                        onChange={(e) => handleExplanationChange(qIndex, e.target.value)}
                        className="educator-text-input"
                        style={{ fontSize: '0.80rem', padding: '6px 10px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="educator-secondary-btn"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button type="submit" className="educator-primary-btn">
                  {editingQuiz ? 'Save Changes' : 'Create & Publish Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {deleteConfirmQuiz && (
        <div
          className="educator-modal-overlay"
          onClick={() => setDeleteConfirmQuiz(null)}
        >
          <div
            className="educator-modal-box"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <h3 className="educator-card-title" style={{ color: '#DC2626' }}>
                Delete Quiz?
              </h3>
              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setDeleteConfirmQuiz(null)}
              >
                ✕
              </button>
            </div>
            <p style={{ color: '#475569', fontSize: '0.90rem', margin: '0 0 20px 0' }}>
              Are you sure you want to permanently delete <strong>"{deleteConfirmQuiz.title}"</strong>?
              This action cannot be undone and will remove all student submission references.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="educator-secondary-btn"
                onClick={() => setDeleteConfirmQuiz(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={handleDeleteQuiz}
              >
                Yes, Delete Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducatorManageQuizzesView;
