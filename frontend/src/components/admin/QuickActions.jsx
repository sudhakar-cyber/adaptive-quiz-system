import React from 'react';

const ACTIONS = [
  {
    id: 'add-user',
    label: 'Add User',
    color: 'blue',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
  },
  {
    id: 'manage-quizzes',
    label: 'Manage Quizzes',
    color: 'green',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: 'view-reports',
    label: 'View Reports',
    color: 'orange',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

const QuickActions = ({ onOpenAddUser, onNavigateTab }) => {
  const handleActionClick = (actionId) => {
    if (actionId === 'add-user') {
      onOpenAddUser && onOpenAddUser();
    } else if (actionId === 'manage-quizzes') {
      onNavigateTab && onNavigateTab('quizzes');
    } else if (actionId === 'view-reports') {
      onNavigateTab && onNavigateTab('reports');
    }
  };

  return (
    <>
      <h3 className="qa-title">Quick Actions</h3>
      <div className="qa-list">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`qa-btn qa-${a.color}`}
            onClick={() => handleActionClick(a.id)}
            title={`Perform action: ${a.label}`}
          >
            <span className="qa-icon">{a.icon}</span>
            <span className="qa-label">{a.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};

export default QuickActions;
