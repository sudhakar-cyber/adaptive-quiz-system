import React, { useState } from 'react';
import {
  SearchIcon,
  FilterIcon,
  TrashIcon,
  XIcon,
  FileTextIcon,
  PlayIcon,
  EditIcon,
  CheckCircleIcon,
  ClockIcon
} from './Icons';
import { INITIAL_EDUCATOR_QUIZZES } from '../data/educatorData';
import sharedDatabase from '../services/sharedDatabase';

export const AdminQuizManagementView = ({
  quizzes = [],
  onToggleStatus,
  onDeleteQuiz
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newQuizForm, setNewQuizForm] = useState({
    title: '',
    category: 'Programming',
    duration: '15 mins',
    difficulty: 'Medium',
    description: '',
    createdBy: 'Educator'
  });

  // Effective list of quizzes with safe seed fallback
  const rawList = Array.isArray(quizzes) && quizzes.length > 0 ? quizzes : INITIAL_EDUCATOR_QUIZZES;

  // Dynamically extract categories for filter
  const availableCategories = Array.from(
    new Set([
      'Programming',
      'DSA',
      'Cyber Security',
      'Machine Learning',
      'Cloud Computing',
      'Web Development',
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
      q.createdBy?.toLowerCase().includes(query);

    const matchCategory =
      categoryFilter === 'all' ||
      q.category?.toLowerCase() === categoryFilter.toLowerCase();

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && (q.status === 'Active' || !q.status)) ||
      (statusFilter === 'draft' && q.status === 'Draft');

    return matchSearch && matchCategory && matchStatus;
  });

  const handleCreateQuizSubmit = (e) => {
    e.preventDefault();
    if (!newQuizForm.title.trim()) {
      alert('Please enter a quiz title.');
      return;
    }

    const categoryColors = {
      Programming: { bg: '#E6FAF0', color: '#00BA88' },
      DSA: { bg: '#DBEAFE', color: '#1D4ED8' },
      'Cyber Security': { bg: '#F3E8FF', color: '#7E22CE' },
      'Machine Learning': { bg: '#FEF3C7', color: '#B45309' },
      'Cloud Computing': { bg: '#E0F2FE', color: '#0369A1' },
      'Web Development': { bg: '#FFEDD5', color: '#C2410C' }
    };

    const colorConfig = categoryColors[newQuizForm.category] || { bg: '#EEF2FF', color: '#4F46E5' };

    const created = sharedDatabase.addQuiz({
      title: newQuizForm.title.trim(),
      category: newQuizForm.category,
      categoryBg: colorConfig.bg,
      categoryColor: colorConfig.color,
      difficulty: newQuizForm.difficulty,
      duration: newQuizForm.duration,
      description: newQuizForm.description.trim() || 'Comprehensive course assessment aligned with academic curriculum standards.',
      createdBy: newQuizForm.createdBy.trim() || 'Administrator',
      status: 'Active',
      questionsCount: 5,
      questions: [
        {
          id: 1,
          question: `Sample Question 1 for ${newQuizForm.title}`,
          options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
          correctIndex: 0
        },
        {
          id: 2,
          question: `Explain fundamental concepts covered in ${newQuizForm.category}`,
          options: ['Standard Definition', 'Alternative Model', 'Legacy Implementation'],
          correctIndex: 0
        }
      ]
    });

    if (created && typeof onToggleStatus === 'function') {
      // triggers parent state refresh
      onToggleStatus(null);
    }

    setIsCreateModalOpen(false);
    setNewQuizForm({
      title: '',
      category: 'Programming',
      duration: '15 mins',
      difficulty: 'Medium',
      description: '',
      createdBy: 'Educator'
    });
  };

  return (
    <div className="admin-management-container">
      {/* Top Banner */}
      <div className="management-header">
        <div>
          <h1 className="management-title">Quiz Management</h1>
          <p className="management-subtitle">
            Oversee all curriculum quizzes, examine student performance, and regulate publication status
          </p>
        </div>
        <button
          className="admin-primary-btn"
          onClick={() => setIsCreateModalOpen(true)}
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
            placeholder="Search quizzes by title or educator..."
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

        {(search || categoryFilter !== 'all' || statusFilter !== 'all') && (
          <button
            className="admin-secondary-btn"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            onClick={() => {
              setSearch('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Quiz Stats Ribbon */}
      <div className="user-stats-ribbon">
        <div className="stat-pill">
          <span className="stat-pill-label">Total Published</span>
          <span className="stat-pill-val">{rawList.length}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Active Quizzes</span>
          <span className="stat-pill-val">
            {rawList.filter((q) => q.status === 'Active' || !q.status).length}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Drafts</span>
          <span className="stat-pill-val">
            {rawList.filter((q) => q.status === 'Draft').length}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Total Submissions</span>
          <span className="stat-pill-val">
            {rawList.reduce((acc, q) => acc + (q.submissionsCount || 42), 0)}
          </span>
        </div>
      </div>

      {/* Quizzes Table */}
      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ minWidth: '260px' }}>Quiz Name</th>
                <th style={{ minWidth: '130px' }}>Category</th>
                <th style={{ minWidth: '130px' }}>Created By</th>
                <th style={{ minWidth: '90px', textAlign: 'center' }}>Attempts</th>
                <th style={{ minWidth: '110px', textAlign: 'center' }}>Average Score</th>
                <th style={{ minWidth: '90px', textAlign: 'center' }}>Status</th>
                <th style={{ minWidth: '110px' }}>Date</th>
                <th style={{ textAlign: 'right', minWidth: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.length === 0 ? (
                <tr>
                  <td colSpan="8" className="table-empty-cell">
                    No quizzes found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredQuizzes.map((quiz) => {
                  const isActive = quiz.status === 'Active' || !quiz.status;
                  return (
                    <tr key={quiz.id} className="admin-table-row">
                      {/* Name & Questions */}
                      <td>
                        <div
                          className="user-cell clickable"
                          onClick={() => setSelectedQuiz(quiz)}
                          title="Click to view quiz details"
                        >
                          <div
                            className="quiz-category-tag-badge"
                            style={{
                              backgroundColor: quiz.categoryBg || '#EEF2FF',
                              color: quiz.categoryColor || '#4F46E5'
                            }}
                          >
                            <FileTextIcon size={16} color="currentColor" />
                          </div>
                          <div>
                            <div className="user-name-link">{quiz.title}</div>
                            <div className="user-sub-email">
                              {quiz.questionsCount || (quiz.questions || []).length || 5} Questions • {quiz.duration || '15 mins'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span
                          className="quiz-cat-pill"
                          style={{
                            backgroundColor: quiz.categoryBg || '#EEF2FF',
                            color: quiz.categoryColor || '#4F46E5'
                          }}
                        >
                          {quiz.category}
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
                          {quiz.submissionsCount || 38}
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
                        <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
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
                          {/* View details */}
                          <button
                            className="btn-icon-subtle"
                            title="Inspect Quiz Structure"
                            onClick={() => setSelectedQuiz(quiz)}
                          >
                            <EditIcon size={16} color="#6366F1" />
                          </button>

                          {/* Toggle Active / Draft */}
                          <button
                            className={`btn-status-toggle ${isActive ? 'deactivate' : 'activate'}`}
                            title={isActive ? 'Set to Draft' : 'Activate Quiz'}
                            onClick={() => onToggleStatus(quiz.id)}
                          >
                            {isActive ? 'Set Draft' : 'Activate'}
                          </button>

                          {/* Delete */}
                          <button
                            className="btn-icon-danger"
                            title="Delete quiz"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${quiz.title}"?`)) {
                                onDeleteQuiz(quiz.id);
                              }
                            }}
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

      {/* Quiz Details Modal */}
      {selectedQuiz && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedQuiz(null)}>
          <div className="admin-modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-group">
                <div
                  className="quiz-category-tag-badge"
                  style={{
                    backgroundColor: selectedQuiz.categoryBg || '#EEF2FF',
                    color: selectedQuiz.categoryColor || '#4F46E5',
                    width: '38px',
                    height: '38px'
                  }}
                >
                  <FileTextIcon size={20} color="currentColor" />
                </div>
                <div>
                  <h3 className="modal-user-name">{selectedQuiz.title}</h3>
                  <span className="quiz-creator-text">By {selectedQuiz.createdBy || 'Educator'}</span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedQuiz(null)}>
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
                  <span>{selectedQuiz.difficulty || 'Adaptive (Easy - Hard)'}</span>
                </div>
                <div className="profile-field">
                  <label>Duration</label>
                  <span>{selectedQuiz.duration || '15 mins'}</span>
                </div>
                <div className="profile-field">
                  <label>Status</label>
                  <span className={`status-badge ${selectedQuiz.status === 'Draft' ? 'inactive' : 'active'}`}>
                    {selectedQuiz.status || 'Active'}
                  </span>
                </div>
                <div className="profile-field">
                  <label>Pass Rate</label>
                  <span>{selectedQuiz.passRate ? `${selectedQuiz.passRate}%` : '89.5%'}</span>
                </div>
                <div className="profile-field">
                  <label>Total Attempts</label>
                  <span>{selectedQuiz.submissionsCount || 38}</span>
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
                <h4 className="sub-heading">
                  Curriculum Questions ({(selectedQuiz.questions || []).length || 5})
                </h4>
                <div className="questions-sample-list">
                  {(selectedQuiz.questions || [
                    { id: 1, question: 'What is the time complexity of searching in a Balanced Binary Search Tree?', type: 'MCQ' },
                    { id: 2, question: 'Explain the difference between Symmetric and Asymmetric encryption algorithms.', type: 'Adaptive' },
                    { id: 3, question: 'Which built-in Python function returns the length of a sequence?', type: 'MCQ' }
                  ]).map((q, idx) => (
                    <div key={idx} className="question-sample-item">
                      <span className="q-number">Q{idx + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <span className="q-text">{q.question || q.title}</span>
                        {Array.isArray(q.options) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {q.options.map((opt, optIdx) => (
                              <span
                                key={optIdx}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: optIdx === q.correctIndex ? '#ECFDF5' : '#F1F5F9',
                                  color: optIdx === q.correctIndex ? '#059669' : '#64748B',
                                  fontWeight: optIdx === q.correctIndex ? '700' : '500',
                                  border: optIdx === q.correctIndex ? '1px solid #A7F3D0' : '1px solid #E2E8F0'
                                }}
                              >
                                {opt} {optIdx === q.correctIndex ? '✓' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button className="admin-secondary-btn" onClick={() => setSelectedQuiz(null)}>
                Close
              </button>
              <button
                className={`admin-status-action-btn ${selectedQuiz.status === 'Draft' ? 'btn-success' : 'btn-warn'}`}
                onClick={() => {
                  onToggleStatus(selectedQuiz.id);
                  setSelectedQuiz({
                    ...selectedQuiz,
                    status: selectedQuiz.status === 'Draft' ? 'Active' : 'Draft'
                  });
                }}
              >
                {selectedQuiz.status === 'Draft' ? 'Publish Quiz' : 'Unpublish to Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Quiz Modal */}
      {isCreateModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-group">
                <div
                  className="quiz-category-tag-badge"
                  style={{ backgroundColor: '#EEF2FF', color: '#6C5CE7' }}
                >
                  <FileTextIcon size={20} color="currentColor" />
                </div>
                <div>
                  <h3 className="modal-title">Create New Quiz</h3>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>
                <XIcon size={20} color="#64748B" />
              </button>
            </div>

            <form onSubmit={handleCreateQuizSubmit}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label>Quiz Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. React Architecture & State Management"
                    value={newQuizForm.title}
                    onChange={(e) => setNewQuizForm({ ...newQuizForm, title: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Category</label>
                  <select
                    value={newQuizForm.category}
                    onChange={(e) => setNewQuizForm({ ...newQuizForm, category: e.target.value })}
                  >
                    <option value="Programming">Programming</option>
                    <option value="DSA">DSA</option>
                    <option value="Cyber Security">Cyber Security</option>
                    <option value="Machine Learning">Machine Learning</option>
                    <option value="Cloud Computing">Cloud Computing</option>
                    <option value="Web Development">Web Development</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label>Duration</label>
                    <select
                      value={newQuizForm.duration}
                      onChange={(e) => setNewQuizForm({ ...newQuizForm, duration: e.target.value })}
                    >
                      <option value="10 mins">10 mins</option>
                      <option value="15 mins">15 mins</option>
                      <option value="20 mins">20 mins</option>
                      <option value="30 mins">30 mins</option>
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Difficulty Tier</label>
                    <select
                      value={newQuizForm.difficulty}
                      onChange={(e) => setNewQuizForm({ ...newQuizForm, difficulty: e.target.value })}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Author / Faculty Lead</label>
                  <input
                    type="text"
                    placeholder="e.g. Faculty Lead"
                    value={newQuizForm.createdBy}
                    onChange={(e) => setNewQuizForm({ ...newQuizForm, createdBy: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Description & Learning Objectives</label>
                  <textarea
                    rows="3"
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
                    placeholder="Brief description of skills tested..."
                    value={newQuizForm.description}
                    onChange={(e) => setNewQuizForm({ ...newQuizForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-primary-btn">
                  Publish Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuizManagementView;
