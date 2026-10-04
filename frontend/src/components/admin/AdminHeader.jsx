import React, { useState } from 'react';

const AdminHeader = ({ onMenuToggle, onLogout, onSelectTab, searchQuery = '', onSearchChange }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="adh-bar">
      {/* Left: Hamburger (mobile) + Brand */}
      <div className="adh-left">
        <button className="adh-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
          <span /><span /><span />
        </button>

        <div
          className="adh-brand"
          onClick={() => onSelectTab && onSelectTab('dashboard')}
          title="Back to Dashboard"
        >
          {/* Graduation cap logo matching reference screenshot */}
          <div className="adh-logo">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="38" height="38">
              <path d="M12 22V31C12 36.5 17 40 24 40C31 40 36 36.5 36 31V22L24 29L12 22Z" fill="#2E1065"/>
              <path d="M12 22C14 26.5 18.5 29.5 24 29.5C29.5 29.5 34 26.5 36 22L24 28.5L12 22Z" fill="#3B0764"/>
              <path d="M24 7L4 17L24 27L44 17L24 7Z" fill="#4C1D95"/>
              <path d="M24 8.5L6.5 17L24 25.5L41.5 17L24 8.5Z" fill="#581C87"/>
              <circle cx="24" cy="17" r="2.5" fill="#FFFFFF"/>
              <path d="M24 17L8 22V30" stroke="#3B0764" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8" cy="31" r="2.5" fill="#3B0764"/>
            </svg>
          </div>
          <div className="adh-brand-text">
            <span className="adh-brand-name">LearnSmart</span>
            <span className="adh-brand-sub">Adaptive Quiz System</span>
          </div>
        </div>
      </div>

      {/* Center: Search */}
      <div className="adh-search-wrap">
        <div className="adh-search-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <input
          type="text"
          className="adh-search"
          placeholder="Search users, quizzes..."
          value={searchQuery}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSelectTab) {
              onSelectTab('users');
            }
          }}
        />
      </div>

      {/* Right: Bell + Profile */}
      <div className="adh-right">
        {/* Notification Bell */}
        <button
          className="adh-bell"
          aria-label="Notifications"
          onClick={() => onSelectTab && onSelectTab('notifications')}
          title="Notifications"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="adh-bell-badge">5</span>
        </button>

        {/* Admin Profile */}
        <div className="adh-profile-wrap">
          <button
            className="adh-profile-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Administrator Profile Menu"
          >
            <div className="adh-avatar">A</div>
            <div className="adh-profile-info">
              <span className="adh-profile-name">Admin</span>
              <span className="adh-profile-role">Administrator</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" className="adh-chevron">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {dropdownOpen && (
            <div className="adh-dropdown">
              <button
                className="adh-dropdown-item"
                onClick={() => {
                  setDropdownOpen(false);
                  if (onSelectTab) onSelectTab('profile');
                }}
              >
                Profile
              </button>
              <button
                className="adh-dropdown-item"
                onClick={() => {
                  setDropdownOpen(false);
                  if (onSelectTab) onSelectTab('settings');
                }}
              >
                Settings
              </button>
              <div className="adh-dropdown-divider" />
              <button
                className="adh-dropdown-item adh-dropdown-logout"
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout && onLogout();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Prominent Direct Header Logout Button */}
        <button
          className="adh-direct-logout-btn"
          onClick={onLogout}
          title="Sign Out of Admin Portal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
