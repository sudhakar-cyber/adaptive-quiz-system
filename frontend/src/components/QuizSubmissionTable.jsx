import React, { useState } from 'react';

export const INITIAL_SUBMISSIONS = [
  {
    id: 1,
    student: 'Rahul K.',
    quizTitle: 'Python Basics',
    score: '92%',
    status: 'Completed',
    date: '28 Sep 2025'
  },
  {
    id: 2,
    student: 'Priya S.',
    quizTitle: 'Data Structures',
    score: '85%',
    status: 'Completed',
    date: '27 Sep 2025'
  },
  {
    id: 3,
    student: 'Vikram M.',
    quizTitle: 'Web Security',
    score: '71%',
    status: 'In Progress',
    date: '26 Sep 2025'
  },
  {
    id: 4,
    student: 'Sneha R.',
    quizTitle: 'Algorithms',
    score: '88%',
    status: 'Completed',
    date: '25 Sep 2025'
  },
  // Extra data for "View All" modal
  {
    id: 5,
    student: 'Arjun P.',
    quizTitle: 'Machine Learning Intro',
    score: '95%',
    status: 'Completed',
    date: '24 Sep 2025'
  },
  {
    id: 6,
    student: 'Ananya D.',
    quizTitle: 'Database Systems',
    score: '68%',
    status: 'In Progress',
    date: '23 Sep 2025'
  },
  {
    id: 7,
    student: 'Karthik N.',
    quizTitle: 'Cloud Computing',
    score: '91%',
    status: 'Completed',
    date: '22 Sep 2025'
  }
];

export const QuizSubmissionTable = ({
  submissions = INITIAL_SUBMISSIONS,
  searchFilter = '',
  onViewAll
}) => {
  const [showAllModal, setShowAllModal] = useState(false);

  // Filter based on search input if provided
  const filteredSubmissions = submissions.filter((sub) => {
    if (!searchFilter.trim()) return true;
    const query = searchFilter.toLowerCase();
    return (
      sub.student.toLowerCase().includes(query) ||
      sub.quizTitle.toLowerCase().includes(query) ||
      sub.status.toLowerCase().includes(query) ||
      sub.score.toLowerCase().includes(query) ||
      sub.date.toLowerCase().includes(query)
    );
  });

  // Display top 4 submissions on dashboard to exactly match the reference image
  const displayedSubmissions = filteredSubmissions.slice(0, 4);

  const handleViewAllClick = (e) => {
    e.preventDefault();
    if (onViewAll) {
      onViewAll();
    } else {
      setShowAllModal(true);
    }
  };

  const renderBadge = (status) => {
    const isCompleted = status.toLowerCase() === 'completed';
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

  return (
    <div className="educator-content-card">
      <div className="educator-table-header-row">
        <h2 className="educator-card-title">Recent Quiz Submissions</h2>
        <button
          type="button"
          className="educator-view-all-link"
          onClick={handleViewAllClick}
        >
          View All →
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
                <tr key={row.id}>
                  <td className="educator-student-name">{row.student}</td>
                  <td className="educator-quiz-title">{row.quizTitle}</td>
                  <td className="educator-score-cell">{row.score}</td>
                  <td>{renderBadge(row.status)}</td>
                  <td className="educator-date-cell">{row.date}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                  No submissions match your search "{searchFilter}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View All Modal */}
      {showAllModal && (
        <div className="educator-modal-overlay" onClick={() => setShowAllModal(false)}>
          <div
            className="educator-modal-box"
            style={{ maxWidth: '680px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <h3 className="educator-card-title">All Student Quiz Submissions</h3>
              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setShowAllModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="educator-table-wrapper" style={{ maxHeight: '360px', overflowY: 'auto' }}>
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
                  {submissions.map((row) => (
                    <tr key={row.id}>
                      <td className="educator-student-name">{row.student}</td>
                      <td className="educator-quiz-title">{row.quizTitle}</td>
                      <td className="educator-score-cell">{row.score}</td>
                      <td>{renderBadge(row.status)}</td>
                      <td className="educator-date-cell">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizSubmissionTable;
