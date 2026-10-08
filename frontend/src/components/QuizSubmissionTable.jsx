import React, { useState } from 'react';

export const INITIAL_SUBMISSIONS = [];

export const QuizSubmissionTable = ({
  submissions = INITIAL_SUBMISSIONS,
  searchFilter = '',
  onViewAll
}) => {
  const [showAllModal, setShowAllModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Filter based on search input if provided
  const filteredSubmissions = submissions.filter((sub) => {
    if (!searchFilter.trim()) return true;
    const query = searchFilter.toLowerCase();
    return (
      (sub.student || '').toLowerCase().includes(query) ||
      (sub.quizTitle || '').toLowerCase().includes(query) ||
      (sub.status || '').toLowerCase().includes(query) ||
      (sub.score || '').toLowerCase().includes(query) ||
      (sub.date || '').toLowerCase().includes(query)
    );
  });

  // Display top 4 submissions on dashboard to match design
  const displayedSubmissions = filteredSubmissions.slice(0, 4);

  const handleViewAllClick = (e) => {
    e.preventDefault();
    setShowAllModal(true);
  };

  const renderBadge = (status = 'Completed') => {
    const isCompleted = (status || '').toLowerCase() === 'completed';
    return (
      <span
        className={`educator-status-badge ${
          isCompleted ? 'completed' : 'in-progress'
        }`}
      >
        {status}
      </span>
    );
  };

  // Modal filtered list
  const modalSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      !modalSearch.trim() ||
      (sub.student || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
      (sub.quizTitle || '').toLowerCase().includes(modalSearch.toLowerCase());
    const matchesStatus =
      statusFilter === 'All' ||
      (sub.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="educator-content-card">
      <div className="educator-table-header-row">
        <div>
          <h2 className="educator-card-title">Recent Quiz Submissions</h2>
          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
            {submissions.length} total recorded {submissions.length === 1 ? 'attempt' : 'attempts'}
          </span>
        </div>
        <button
          type="button"
          className="educator-view-all-link"
          onClick={handleViewAllClick}
          title="Open complete quiz submissions log"
        >
          View All ({submissions.length}) →
        </button>
      </div>

      <div className="educator-table-wrapper">
        <table className="educator-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Quiz Title</th>
              <th>Score</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {displayedSubmissions.length > 0 ? (
              displayedSubmissions.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedSubmission(row)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view submission breakdown"
                >
                  <td className="educator-student-name">
                    <strong>{row.student}</strong>
                  </td>
                  <td className="educator-quiz-title">{row.quizTitle}</td>
                  <td className="educator-score-cell">{row.score}</td>
                  <td>{renderBadge(row.status)}</td>
                  <td className="educator-date-cell">{row.date}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.4rem' }}>📝</span>
                    <span>{searchFilter ? `No submissions match "${searchFilter}".` : 'No student quiz submissions recorded yet.'}</span>
                    <span style={{ fontSize: '0.76rem', color: '#CBD5E1' }}>Completed student attempts will automatically appear here in real-time.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Row Details Modal */}
      {selectedSubmission && (
        <div
          className="educator-modal-overlay"
          onClick={() => setSelectedSubmission(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="educator-modal-box"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <h3 className="educator-card-title">Submission Details</h3>
              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setSelectedSubmission(null)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Student</span>
                <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>{selectedSubmission.student}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Quiz Title</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1E293B' }}>{selectedSubmission.quizTitle}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Score Achieved</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563EB' }}>{selectedSubmission.score}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Status</span>
                <span>{renderBadge(selectedSubmission.status)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Submitted</span>
                <span style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 500 }}>{selectedSubmission.date}</span>
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="educator-btn-secondary"
                onClick={() => setSelectedSubmission(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View All Submissions Modal */}
      {showAllModal && (
        <div
          className="educator-modal-overlay"
          onClick={() => setShowAllModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="educator-modal-box"
            style={{ maxWidth: '780px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <div>
                <h3 className="educator-card-title">All Student Quiz Submissions</h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  {submissions.length} total attempts recorded
                </span>
              </div>
              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setShowAllModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Filter and Search Bar inside modal */}
            <div style={{ padding: '12px 16px', display: 'flex', gap: '10px', flexWrap: 'wrap', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <input
                type="text"
                placeholder="Search by student or quiz..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem'
                }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>

            <div className="educator-table-wrapper" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table className="educator-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Quiz Title</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {modalSubmissions.length > 0 ? (
                    modalSubmissions.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedSubmission(row)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="educator-student-name">
                          <strong>{row.student}</strong>
                        </td>
                        <td className="educator-quiz-title">{row.quizTitle}</td>
                        <td className="educator-score-cell">{row.score}</td>
                        <td>{renderBadge(row.status)}</td>
                        <td className="educator-date-cell">{row.date}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                        No submissions match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Showing {modalSubmissions.length} of {submissions.length} submissions
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {onViewAll && (
                  <button
                    type="button"
                    className="educator-btn-primary"
                    onClick={() => {
                      setShowAllModal(false);
                      onViewAll();
                    }}
                  >
                    Go to Student Performance →
                  </button>
                )}
                <button
                  type="button"
                  className="educator-btn-secondary"
                  onClick={() => setShowAllModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizSubmissionTable;
