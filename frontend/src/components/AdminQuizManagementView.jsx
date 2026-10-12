import React, { useState, useEffect } from 'react';
import {
  SearchIcon,
  FilterIcon,
  TrashIcon,
  XIcon,
  FileTextIcon,
  EditIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  ListIcon
} from './Icons';
import { INITIAL_EDUCATOR_QUIZZES } from '../data/educatorData';
import { sharedDatabase } from '../services/sharedDatabase';

export const AdminQuizManagementView = ({
  quizzes = [],
  onToggleStatus,
  onDeleteQuiz,
  onUpdateQuizzes,
  onSaveQuiz,
  showToast,
  externalSearch = ''
}) => {
  const [search, setSearch] = useState(externalSearch);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [selectedQuiz, setSelectedQuiz] = useState(null); // Preview / Inspect
  const [isFormModalOpen, setIsFormModalOpen] = useState(false); // Create or Edit Modal
  const [editingQuiz, setEditingQuiz] = useState(null); // null = Create, object = Edit
  const [deleteConfirmQuiz, setDeleteConfirmQuiz] = useState(null); // Quiz pending delete confirmation

  // Synchronize external search if passed from top header search bar
  useEffect(() => {
    if (externalSearch !== undefined) {
      setSearch(externalSearch);
    }
  }, [externalSearch]);

  // Form State for Quiz Create / Edit
  const [formData, setFormData] = useState({
    title: '',
    category: 'Programming',
    difficulty: 'Medium',
    duration: '15 mins',
    status: 'Active',
    createdBy: 'Administrator',
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

  // Effective list of quizzes with safe fallback
  const rawList = Array.isArray(quizzes) && quizzes.length > 0
    ? quizzes
    : (typeof sharedDatabase?.getQuizzes === 'function' ? sharedDatabase.getQuizzes() : INITIAL_EDUCATOR_QUIZZES);

  // Dynamically extract categories for filter
  const standardCategories = [
    'Programming',
    'DSA',
    'Cyber Security',
    'Machine Learning',
    'Cloud Computing',
    'Database Systems',
    'Web Development'
  ];

  const availableCategories = Array.from(
    new Set([
      ...standardCategories,
      ...rawList.map((q) => q.category).filter(Boolean)
    ])
  );

  // Filter quizzes
  const filteredQuizzes = rawList.filter((q) => {
    const query = search.toLowerCase().trim();
    const matchSearch =
      !query ||
      q.title?.toLowerCase().includes(query) ||
      q.category?.toLowerCase().includes(query) ||
      q.createdBy?.toLowerCase().includes(query) ||
      q.description?.toLowerCase().includes(query);

    const matchCategory =
      categoryFilter === 'all' ||
      q.category?.trim().toLowerCase() === categoryFilter.trim().toLowerCase();

    const matchDifficulty =
      difficultyFilter === 'all' ||
      q.difficulty?.trim().toLowerCase() === difficultyFilter.trim().toLowerCase();

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && (q.status === 'Active' || !q.status)) ||
      (statusFilter === 'draft' && q.status === 'Draft');

    return matchSearch && matchCategory && matchDifficulty && matchStatus;
  });

  // Reset all active filters
  const handleResetFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setDifficultyFilter('all');
    setStatusFilter('all');
  };

  // Open Create Quiz Modal
  const handleOpenCreate = () => {
    setEditingQuiz(null);
    setFormData({
      title: '',
      category: 'Programming',
      difficulty: 'Medium',
      duration: '15 mins',
      status: 'Active',
      createdBy: 'Administrator',
      description: '',
      questions: [
        {
          id: Date.now(),
          question: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          explanation: ''
        }
      ]
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Quiz Modal
  const handleOpenEdit = (quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      title: quiz.title || '',
      category: quiz.category || 'Programming',
      difficulty: quiz.difficulty || 'Medium',
      duration: quiz.duration || '15 mins',
      status: quiz.status || 'Active',
      createdBy: quiz.createdBy || 'Administrator',
      description: quiz.description || '',
      questions: Array.isArray(quiz.questions) && quiz.questions.length > 0
        ? JSON.parse(JSON.stringify(quiz.questions))
        : [
            {
              id: Date.now(),
              question: '',
              options: ['', '', '', ''],
              correctIndex: 0,
              explanation: ''
            }
          ]
    });
    if (selectedQuiz) setSelectedQuiz(null);
    setIsFormModalOpen(true);
  };

  // Question builder operations
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

  const handleRemoveQuestion = (qIndex) => {
    if (formData.questions.length <= 1) {
      if (showToast) showToast('A curriculum quiz must contain at least 1 question.');
      else alert('A curriculum quiz must contain at least 1 question.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== qIndex)
    }));
  };

  const handleQuestionTextChange = (qIndex, text) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      updated[qIndex] = { ...updated[qIndex], question: text };
      return { ...prev, questions: updated };
    });
  };

  const handleOptionChange = (qIndex, optIndex, text) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      const opts = [...(updated[qIndex].options || ['', '', '', ''])];
      opts[optIndex] = text;
      updated[qIndex] = { ...updated[qIndex], options: opts };
      return { ...prev, questions: updated };
    });
  };

  const handleCorrectIndexChange = (qIndex, correctIdx) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      updated[qIndex] = { ...updated[qIndex], correctIndex: parseInt(correctIdx, 10) };
      return { ...prev, questions: updated };
    });
  };

  const handleExplanationChange = (qIndex, text) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      updated[qIndex] = { ...updated[qIndex], explanation: text };
      return { ...prev, questions: updated };
    });
  };

  // Color config for quiz categories
  const getCategoryStyles = (category) => {
    const map = {
      Programming: { bg: '#E6FAF0', color: '#00BA88' },
      DSA: { bg: '#DBEAFE', color: '#1D4ED8' },
      'Cyber Security': { bg: '#F3E8FF', color: '#7E22CE' },
      'Machine Learning': { bg: '#FEF3C7', color: '#B45309' },
      'Cloud Computing': { bg: '#E0F2FE', color: '#0369A1' },
      'Web Development': { bg: '#FFEDD5', color: '#C2410C' },
      'Database Systems': { bg: '#EDE9FE', color: '#6D28D9' }
    };
    return map[category] || { bg: '#EEF2FF', color: '#4F46E5' };
  };

  // Difficulty badge styling
  const getDifficultyBadge = (diff) => {
    const d = (diff || 'Medium').toLowerCase();
    if (d === 'easy') {
      return { bg: '#D1FAE5', color: '#047857', border: '#A7F3D0' };
    }
    if (d === 'hard') {
      return { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' };
    }
    return { bg: '#FFEDD5', color: '#C2410C', border: '#FED7AA' };
  };

  // Save Quiz Form Submit (Create or Edit)
  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      if (showToast) showToast('Please enter a quiz title.');
      else alert('Please enter a quiz title.');
      return;
    }

    // Validate that questions have some content
    const cleanedQuestions = formData.questions.map((q, idx) => ({
      id: q.id || idx + 1,
      question: q.question?.trim() || `Question ${idx + 1}`,
      options: Array.isArray(q.options) && q.options.length === 4
        ? q.options.map((opt, i) => opt?.trim() || `Option ${i + 1}`)
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
      explanation: q.explanation?.trim() || ''
    }));

    const colorConfig = getCategoryStyles(formData.category);
    const diffBadge = getDifficultyBadge(formData.difficulty);

    if (editingQuiz) {
      // Editing existing quiz
      const updatedQuiz = {
        ...editingQuiz,
        title: formData.title.trim(),
        category: formData.category,
        categoryBg: colorConfig.bg,
        categoryColor: colorConfig.color,
        difficulty: formData.difficulty,
        diffBg: diffBadge.bg,
        diffColor: diffBadge.color,
        duration: formData.duration || '15 mins',
        status: formData.status,
        createdBy: formData.createdBy.trim() || 'Administrator',
        description: formData.description.trim() || 'Core assessment testing fundamental mastery.',
        questionsCount: cleanedQuestions.length,
        questions: cleanedQuestions,
        lastUpdated: 'Just now'
      };

      if (typeof onSaveQuiz === 'function') {
        onSaveQuiz(updatedQuiz, true);
      } else {
        sharedDatabase.updateQuiz(editingQuiz.id, updatedQuiz);
        if (typeof onUpdateQuizzes === 'function') {
          const updatedAll = rawList.map((q) =>
            String(q.id) === String(editingQuiz.id) ? updatedQuiz : q
          );
          onUpdateQuizzes(updatedAll);
        } else if (typeof onToggleStatus === 'function') {
          onToggleStatus(null);
        }
        if (showToast) showToast(`Quiz "${updatedQuiz.title}" updated successfully!`);
      }
    } else {
      // Creating new quiz
      const newQuizData = {
        id: `quiz-${Date.now()}`,
        title: formData.title.trim(),
        category: formData.category,
        categoryBg: colorConfig.bg,
        categoryColor: colorConfig.color,
        difficulty: formData.difficulty,
        diffBg: diffBadge.bg,
        diffColor: diffBadge.color,
        duration: formData.duration || '15 mins',
        status: formData.status,
        isRecommended: formData.status === 'Active',
        recommendationReason: 'Curriculum Assessment • Published by Administrator',
        createdBy: formData.createdBy.trim() || 'Administrator',
        description: formData.description.trim() || 'Comprehensive course assessment aligned with academic curriculum standards.',
        questionsCount: cleanedQuestions.length,
        questions: cleanedQuestions,
        submissionsCount: 0,
        avgScore: 0,
        passRate: 0,
        lastUpdated: 'Just now'
      };

      if (typeof onSaveQuiz === 'function') {
        onSaveQuiz(newQuizData, false);
      } else {
        const created = sharedDatabase.addQuiz(newQuizData);
        if (typeof onUpdateQuizzes === 'function') {
          onUpdateQuizzes([created, ...rawList]);
        } else if (typeof onToggleStatus === 'function') {
          onToggleStatus(null);
        }
        if (showToast) showToast(`New quiz "${newQuizData.title}" published successfully!`);
      }
    }

    setIsFormModalOpen(false);
    setEditingQuiz(null);
  };

  // Toggle quiz status between Active and Draft
  const handleToggleStatusAction = (quiz) => {
    if (!quiz) return;
    const newStatus = quiz.status === 'Draft' ? 'Active' : 'Draft';

    if (typeof onToggleStatus === 'function') {
      onToggleStatus(quiz.id);
    } else {
      sharedDatabase.toggleQuizStatus(quiz.id);
      if (typeof onUpdateQuizzes === 'function') {
        const updated = rawList.map((q) =>
          String(q.id) === String(quiz.id) ? { ...q, status: newStatus } : q
        );
        onUpdateQuizzes(updated);
      }
      if (showToast) showToast(`Quiz "${quiz.title}" status changed to ${newStatus}.`);
    }

    if (selectedQuiz && String(selectedQuiz.id) === String(quiz.id)) {
      setSelectedQuiz({ ...selectedQuiz, status: newStatus });
    }
  };

  // Perform quiz deletion
  const handleConfirmDelete = () => {
    if (!deleteConfirmQuiz) return;
    const quizToDelete = deleteConfirmQuiz;

    if (typeof onDeleteQuiz === 'function') {
      onDeleteQuiz(quizToDelete.id);
    } else {
      sharedDatabase.deleteQuiz(quizToDelete.id);
      if (typeof onUpdateQuizzes === 'function') {
        const updated = rawList.filter((q) => String(q.id) !== String(quizToDelete.id));
        onUpdateQuizzes(updated);
      }
      if (showToast) showToast(`Quiz "${quizToDelete.title}" removed from curriculum.`);
    }

    if (selectedQuiz && String(selectedQuiz.id) === String(quizToDelete.id)) {
      setSelectedQuiz(null);
    }
    setDeleteConfirmQuiz(null);
  };

  // Metric counts
  const totalPublishedCount = rawList.length;
  const activeQuizzesCount = rawList.filter((q) => q.status === 'Active' || !q.status).length;
  const draftQuizzesCount = rawList.filter((q) => q.status === 'Draft').length;
  const totalQuestionsCount = rawList.reduce(
    (acc, q) => acc + (q.questionsCount || (q.questions || []).length || 5),
    0
  );

  return (
    <div className="admin-management-container">
      {/* Top Banner */}
      <div className="management-header">
        <div>
          <h1 className="management-title">Quiz Management</h1>
          <p className="management-subtitle">
            Oversee curriculum assessments, author questions, adjust difficulty tiers, and control publication status
          </p>
        </div>
        <button
          type="button"
          className="admin-primary-btn"
          onClick={handleOpenCreate}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Create New Quiz</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        {/* Search */}
        <div className="filter-search-box">
          <SearchIcon size={17} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search quizzes by title, category, author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category Filter */}
        <div className="filter-select-group">
          <label>Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat.toLowerCase()}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter */}
        <div className="filter-select-group">
          <label>Difficulty:</label>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="filter-select-group">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {(search || categoryFilter !== 'all' || difficultyFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            className="admin-secondary-btn"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            onClick={handleResetFilters}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Quiz Stats Ribbon */}
      <div className="user-stats-ribbon">
        <div className="stat-pill">
          <span className="stat-pill-label">Total Published</span>
          <span className="stat-pill-val">{totalPublishedCount}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Active Quizzes</span>
          <span className="stat-pill-val" style={{ color: '#10B981' }}>
            {activeQuizzesCount}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Drafts</span>
          <span className="stat-pill-val" style={{ color: '#F59E0B' }}>
            {draftQuizzesCount}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Total Questions</span>
          <span className="stat-pill-val" style={{ color: '#6366F1' }}>
            {totalQuestionsCount}
          </span>
        </div>
      </div>

      {/* Quizzes Table */}
      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ minWidth: '240px' }}>Quiz Name</th>
                <th style={{ minWidth: '130px' }}>Category</th>
                <th style={{ minWidth: '100px' }}>Difficulty</th>
                <th style={{ minWidth: '130px' }}>Created By</th>
                <th style={{ minWidth: '90px', textAlign: 'center' }}>Attempts</th>
                <th style={{ minWidth: '100px', textAlign: 'center' }}>Avg Score</th>
                <th style={{ minWidth: '90px', textAlign: 'center' }}>Status</th>
                <th style={{ minWidth: '110px' }}>Date</th>
                <th style={{ textAlign: 'right', minWidth: '180px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="table-empty-cell">
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <ListIcon size={36} color="#94A3B8" />
                      <span style={{ fontSize: '0.96rem', fontWeight: 700, color: '#334155' }}>
                        No quizzes match your filter criteria.
                      </span>
                      <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
                        Try clearing active filters or click &quot;Create New Quiz&quot; to author a new assessment.
                      </span>
                      {(search || categoryFilter !== 'all' || difficultyFilter !== 'all' || statusFilter !== 'all') && (
                        <button
                          type="button"
                          className="admin-secondary-btn"
                          style={{ marginTop: '8px' }}
                          onClick={handleResetFilters}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQuizzes.map((quiz) => {
                  const isActive = quiz.status === 'Active' || !quiz.status;
                  const catStyle = getCategoryStyles(quiz.category);
                  const diffStyle = getDifficultyBadge(quiz.difficulty);
                  const qCount = quiz.questionsCount || (quiz.questions || []).length || 5;

                  return (
                    <tr key={quiz.id} className="admin-table-row">
                      {/* Name & Questions */}
                      <td>
                        <div
                          className="user-cell clickable"
                          onClick={() => setSelectedQuiz(quiz)}
                          title="Click to inspect quiz details and questions"
                        >
                          <div
                            className="quiz-category-tag-badge"
                            style={{
                              backgroundColor: quiz.categoryBg || catStyle.bg,
                              color: quiz.categoryColor || catStyle.color
                            }}
                          >
                            <FileTextIcon size={16} color="currentColor" />
                          </div>
                          <div>
                            <div className="user-name-link">{quiz.title}</div>
                            <div className="user-sub-email">
                              {qCount} Questions • {quiz.duration || '15 mins'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span
                          className="quiz-cat-pill"
                          style={{
                            backgroundColor: quiz.categoryBg || catStyle.bg,
                            color: quiz.categoryColor || catStyle.color
                          }}
                        >
                          {quiz.category}
                        </span>
                      </td>

                      {/* Difficulty */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            backgroundColor: diffStyle.bg,
                            color: diffStyle.color,
                            border: `1px solid ${diffStyle.border}`
                          }}
                        >
                          {quiz.difficulty || 'Medium'}
                        </span>
                      </td>

                      {/* Created By */}
                      <td>
                        <span className="quiz-creator-text">
                          {quiz.createdBy || 'Educator'}
                        </span>
                      </td>

                      {/* Attempts */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="quiz-metric-num">
                          {quiz.submissionsCount !== undefined ? quiz.submissionsCount : 38}
                        </span>
                      </td>

                      {/* Average Score */}
                      <td style={{ textAlign: 'center' }}>
                        <span className="quiz-score-badge">
                          {quiz.avgScore ? `${quiz.avgScore}%` : '82.4%'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${isActive ? 'active' : 'draft'}`}>
                          {isActive ? 'Active' : 'Draft'}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td>
                        <span className="user-joined-text">
                          {quiz.lastUpdated || '28 Sep 2025'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-action-btns">
                          {/* Inspect / View Questions */}
                          <button
                            type="button"
                            className="btn-icon-subtle"
                            title="Inspect Questions & Curriculum"
                            onClick={() => setSelectedQuiz(quiz)}
                          >
                            <EyeIcon size={16} color="#6366F1" />
                          </button>

                          {/* Edit Quiz */}
                          <button
                            type="button"
                            className="btn-icon-subtle"
                            title="Edit Quiz & Questions"
                            onClick={() => handleOpenEdit(quiz)}
                          >
                            <EditIcon size={16} color="#059669" />
                          </button>

                          {/* Toggle Active / Draft */}
                          <button
                            type="button"
                            className={`btn-status-toggle ${isActive ? 'deactivate' : 'activate'}`}
                            title={isActive ? 'Set to Draft' : 'Activate Quiz'}
                            onClick={() => handleToggleStatusAction(quiz)}
                          >
                            {isActive ? 'Set Draft' : 'Activate'}
                          </button>

                          {/* Delete Quiz */}
                          <button
                            type="button"
                            className="btn-icon-danger"
                            title="Delete quiz from platform"
                            onClick={() => setDeleteConfirmQuiz(quiz)}
                          >
                            <TrashIcon size={16} color="#EF4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Quiz Details & Questions Preview */}
      {selectedQuiz && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedQuiz(null)}>
          <div className="admin-modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-group">
                <div
                  className="quiz-category-tag-badge"
                  style={{
                    backgroundColor: selectedQuiz.categoryBg || getCategoryStyles(selectedQuiz.category).bg,
                    color: selectedQuiz.categoryColor || getCategoryStyles(selectedQuiz.category).color,
                    width: '38px',
                    height: '38px'
                  }}
                >
                  <FileTextIcon size={20} color="currentColor" />
                </div>
                <div>
                  <h3 className="modal-user-name">{selectedQuiz.title}</h3>
                  <span className="quiz-creator-text">Authored by {selectedQuiz.createdBy || 'Educator'}</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedQuiz(null)}
              >
                <XIcon size={20} color="#64748B" />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="profile-detail-grid">
                <div className="profile-field">
                  <label>Category</label>
                  <span>{selectedQuiz.category}</span>
                </div>
                <div className="profile-field">
                  <label>Difficulty Tier</label>
                  <span>{selectedQuiz.difficulty || 'Medium'}</span>
                </div>
                <div className="profile-field">
                  <label>Duration</label>
                  <span>{selectedQuiz.duration || '15 mins'}</span>
                </div>
                <div className="profile-field">
                  <label>Status</label>
                  <span className={`status-badge ${selectedQuiz.status === 'Draft' ? 'draft' : 'active'}`}>
                    {selectedQuiz.status || 'Active'}
                  </span>
                </div>
                <div className="profile-field">
                  <label>Pass Rate</label>
                  <span>{selectedQuiz.passRate ? `${selectedQuiz.passRate}%` : '89.5%'}</span>
                </div>
                <div className="profile-field">
                  <label>Total Attempts</label>
                  <span>{selectedQuiz.submissionsCount !== undefined ? selectedQuiz.submissionsCount : 38}</span>
                </div>
              </div>

              {selectedQuiz.description && (
                <div className="quiz-desc-block">
                  <label>Curriculum Description</label>
                  <p>{selectedQuiz.description}</p>
                </div>
              )}

              {/* Questions Sample / List */}
              <div className="quiz-questions-preview">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 className="sub-heading" style={{ margin: 0 }}>
                    Curriculum Questions ({(selectedQuiz.questions || []).length || selectedQuiz.questionsCount || 0})
                  </h4>
                  <button
                    type="button"
                    className="admin-secondary-btn"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => handleOpenEdit(selectedQuiz)}
                  >
                    <EditIcon size={14} color="currentColor" />
                    <span>Edit Questions</span>
                  </button>
                </div>

                <div className="questions-sample-list" style={{ maxHeight: '300px' }}>
                  {((selectedQuiz.questions && selectedQuiz.questions.length > 0)
                    ? selectedQuiz.questions
                    : [
                        { id: 1, question: `Sample assessment question 1 for ${selectedQuiz.title}`, options: ['Standard Answer A (Correct)', 'Alternative Model B', 'Legacy Paradigm C', 'Theoretical Concept D'], correctIndex: 0 },
                        { id: 2, question: `Core principles testing comprehension of ${selectedQuiz.category}`, options: ['Standard Answer A (Correct)', 'Option B', 'Option C', 'Option D'], correctIndex: 0 }
                      ]
                  ).map((q, idx) => (
                    <div key={idx} className="question-sample-item">
                      <span className="q-number">Q{idx + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <span className="q-text" style={{ fontWeight: 600 }}>{q.question || q.title}</span>
                        {Array.isArray(q.options) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = optIdx === (q.correctIndex || 0);
                              return (
                                <span
                                  key={optIdx}
                                  style={{
                                    fontSize: '0.78rem',
                                    padding: '3px 10px',
                                    borderRadius: '6px',
                                    background: isCorrect ? '#ECFDF5' : '#F1F5F9',
                                    color: isCorrect ? '#059669' : '#475569',
                                    fontWeight: isCorrect ? '700' : '500',
                                    border: isCorrect ? '1.5px solid #A7F3D0' : '1px solid #E2E8F0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  {isCorrect && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                  )}
                                  {opt}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {q.explanation && (
                          <div style={{ marginTop: '6px', fontSize: '0.76rem', color: '#64748B', fontStyle: 'italic' }}>
                            Explanation: {q.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => setSelectedQuiz(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => handleOpenEdit(selectedQuiz)}
              >
                <EditIcon size={16} color="currentColor" />
                <span>Edit Quiz</span>
              </button>
              <button
                type="button"
                className={`admin-status-action-btn ${selectedQuiz.status === 'Draft' ? 'btn-success' : 'btn-warn'}`}
                onClick={() => handleToggleStatusAction(selectedQuiz)}
              >
                {selectedQuiz.status === 'Draft' ? 'Publish Quiz' : 'Unpublish to Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Create / Edit Quiz Form with Question Builder */}
      {isFormModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsFormModalOpen(false)}>
          <div
            className="admin-modal-card wide"
            style={{ maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div className="modal-title-group">
                <div
                  className="quiz-category-tag-badge"
                  style={{ backgroundColor: '#EEF2FF', color: '#6C5CE7' }}
                >
                  <FileTextIcon size={20} color="currentColor" />
                </div>
                <div>
                  <h3 className="modal-title">
                    {editingQuiz ? `Edit Quiz: ${editingQuiz.title}` : 'Create New Curriculum Quiz'}
                  </h3>
                  <span style={{ fontSize: '0.80rem', color: '#64748B' }}>
                    {editingQuiz ? 'Modify curriculum details, timing, and questions' : 'Author a new quiz assessment with custom questions and answers'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsFormModalOpen(false)}
              >
                <XIcon size={20} color="#64748B" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Title & Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                  <div className="admin-form-group" style={{ margin: 0 }}>
                    <label>Quiz Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. React Architecture & State Management"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group" style={{ margin: 0 }}>
                    <label>Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {availableCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Difficulty, Duration, Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div className="admin-form-group" style={{ margin: 0 }}>
                    <label>Difficulty Tier *</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div className="admin-form-group" style={{ margin: 0 }}>
                    <label>Duration</label>
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    >
                      <option value="5 mins">5 mins</option>
                      <option value="10 mins">10 mins</option>
                      <option value="15 mins">15 mins</option>
                      <option value="20 mins">20 mins</option>
                      <option value="30 mins">30 mins</option>
                      <option value="45 mins">45 mins</option>
                    </select>
                  </div>

                  <div className="admin-form-group" style={{ margin: 0 }}>
                    <label>Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active (Published)</option>
                      <option value="Draft">Draft (Hidden)</option>
                    </select>
                  </div>
                </div>

                {/* Author */}
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label>Author / Faculty Lead</label>
                  <input
                    type="text"
                    placeholder="e.g. Administrator"
                    value={formData.createdBy}
                    onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label>Description & Learning Objectives</label>
                  <textarea
                    rows="2"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #E2E8F0',
                      background: '#F8FAFC',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      color: '#0F172A',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                    placeholder="Curriculum expectations, topics evaluated, and course guidelines..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Question Builder Section */}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                        Quiz Questions ({formData.questions.length})
                      </h4>
                      <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                        Provide question prompt, 4 choices, and select the radio button for the correct answer
                      </span>
                    </div>
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                      onClick={handleAddQuestion}
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
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#6C5CE7' }}>
                            Question #{qIndex + 1}
                          </span>
                          {formData.questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(qIndex)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#EF4444',
                                fontSize: '0.80rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '2px 6px'
                              }}
                            >
                              Remove Question
                            </button>
                          )}
                        </div>

                        {/* Question Text */}
                        <div style={{ marginBottom: '12px' }}>
                          <input
                            type="text"
                            required
                            placeholder={`Enter text for Question ${qIndex + 1}...`}
                            value={q.question}
                            onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              borderRadius: '8px',
                              border: '1.5px solid #CBD5E1',
                              background: '#FFFFFF',
                              fontSize: '0.88rem',
                              fontFamily: 'inherit',
                              color: '#0F172A',
                              outline: 'none'
                            }}
                          />
                        </div>

                        {/* 4 Options with Radio to choose correct index */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          {q.options.map((opt, optIndex) => (
                            <div
                              key={optIndex}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: q.correctIndex === optIndex ? '#F0FDF4' : '#FFFFFF',
                                border: q.correctIndex === optIndex ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '6px 10px'
                              }}
                            >
                              <input
                                type="radio"
                                name={`correct-radio-${qIndex}`}
                                id={`q-${qIndex}-opt-${optIndex}`}
                                checked={q.correctIndex === optIndex}
                                onChange={() => handleCorrectIndexChange(qIndex, optIndex)}
                                title="Click to mark as correct answer"
                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                              />
                              <input
                                type="text"
                                required
                                placeholder={`Option ${optIndex + 1}${optIndex === q.correctIndex ? ' (Correct)' : ''}`}
                                value={opt}
                                onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                                style={{
                                  flex: 1,
                                  border: 'none',
                                  background: 'transparent',
                                  fontSize: '0.84rem',
                                  fontFamily: 'inherit',
                                  color: '#0F172A',
                                  outline: 'none'
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        <div>
                          <input
                            type="text"
                            placeholder="Explanation / educational rationale (optional)..."
                            value={q.explanation || ''}
                            onChange={(e) => handleExplanationChange(qIndex, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 12px',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              background: '#FFFFFF',
                              fontSize: '0.80rem',
                              fontFamily: 'inherit',
                              color: '#64748B',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() => setIsFormModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-primary-btn">
                  {editingQuiz ? 'Save Quiz Changes' : 'Publish Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Quiz Confirmation */}
      {deleteConfirmQuiz && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteConfirmQuiz(null)}>
          <div className="admin-modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="modal-title" style={{ color: '#EF4444' }}>
                Delete Curriculum Quiz
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeleteConfirmQuiz(null)}
              >
                <XIcon size={20} color="#64748B" />
              </button>
            </div>

            <div className="admin-modal-body">
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete <strong>&quot;{deleteConfirmQuiz.title}&quot;</strong>?
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                This will remove the quiz from both the educator catalog and student adaptive challenge pool.
              </p>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => setDeleteConfirmQuiz(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-primary-btn"
                style={{ background: '#EF4444' }}
                onClick={handleConfirmDelete}
              >
                Delete Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuizManagementView;
