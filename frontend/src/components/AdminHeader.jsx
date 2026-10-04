import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon, BellIcon, ChevronDownIcon, UserIcon, SettingsIcon, LogoutIcon } from './Icons';

export const AdminHeader = ({
  searchQuery,
  onSearchChange,
  searchResults = { users: [], quizzes: [] },
  onSelectSearchResult,
  unreadCount = 5,
  onOpenNotifications,
  onNavigateTab,
  onLogout,
  adminUser = { name: 'Admin', role: 'Administrator', email: 'admin@learnsmart.edu' }
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasSearchResults = searchQuery.trim().length > 0 &&
    (searchResults.users.length > 0 || searchResults.quizzes.length > 0);

  return (
    <header className="admin-header">
      {/* Brand / Logo */}
      <div className="admin-header-left">
        <div className="admin-brand" style={{ cursor: 'pointer' }} onClick={() => onNavigateTab('dashboard')}>
          <div className="admin-logo-icon">
            {/* Mortarboard icon matching reference */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3Z" fill="white" />
              <path d="M5 13.18V17.18C5 19.84 8.13 22 12 22C15.87 22 19 19.84 19 17.18V13.18L12 17L5 13.18Z" fill="white" fillOpacity="0.85" />
            </svg>
          </div>
          <div className="admin-brand-text">
            <span className="admin-brand-title">LearnSmart</span>
            <span className="admin-brand-subtitle">Adaptive Quiz System</span>
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="admin-search-wrapper" ref={searchRef}>
        <div className="admin-search-icon">
          <SearchIcon size={18} color="#64748B" />
        </div>
        <input
          type="text"
          className="admin-search-input"
          placeholder="Search users, quizzes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
        />

        {/* Live Search Results Popover */}
        {searchFocused && hasSearchResults && (
          <div className="admin-search-results-popover">
            {searchResults.users.length > 0 && (
              <div className="search-section">
                <div className="search-section-title">Users ({searchResults.users.length})</div>
                {searchResults.users.slice(0, 4).map((u) => (
                  <div
                    key={u.id}
                    className="search-item"
                    onClick={() => {
                      onSelectSearchResult({ type: 'user', item: u });
                      setSearchFocused(false);
                    }}
                  >
                    <div className="search-item-avatar">{u.avatarInitials || 'U'}</div>
                    <div className="search-item-info">
                      <div className="search-item-title">{u.name}</div>
                      <div className="search-item-subtitle">{u.role} • {u.email}</div>
                    </div>
                    <span className={`status-badge ${u.status === 'Active' ? 'active' : 'inactive'}`}>
                      {u.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {searchResults.quizzes.length > 0 && (
              <div className="search-section">
                <div className="search-section-title">Quizzes ({searchResults.quizzes.length})</div>
                {searchResults.quizzes.slice(0, 4).map((q) => (
                  <div
                    key={q.id}
                    className="search-item"
                    onClick={() => {
                      onSelectSearchResult({ type: 'quiz', item: q });
                      setSearchFocused(false);
                    }}
                  >
                    <div className="search-item-badge" style={{ backgroundColor: q.categoryBg || '#EEF2FF', color: q.categoryColor || '#4F46E5' }}>
                      {q.category?.slice(0, 3) || 'QZ'}
                    </div>
                    <div className="search-item-info">
                      <div className="search-item-title">{q.title}</div>
                      <div className="search-item-subtitle">{q.category} • {q.duration || '15 mins'}</div>
                    </div>
                    <span className="search-item-tag">{q.difficulty || 'Medium'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header Right: Notification Bell & Admin Profile */}
      <div className="admin-header-right">
        {/* Notification Bell with Badge */}
        <button
          className="admin-notif-btn"
          title="Notifications"
          onClick={onOpenNotifications}
        >
          <BellIcon size={21} color="#334155" />
          {unreadCount > 0 && (
            <span className="admin-notif-badge">{unreadCount}</span>
          )}
        </button>

        {/* Admin Profile Dropdown */}
        <div className="admin-profile-wrapper" ref={profileRef} style={{ position: 'relative' }}>
          <button
            className="admin-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className="admin-avatar">
              {adminUser.avatarInitials || 'A'}
            </div>
            <div className="admin-user-info">
              <span className="admin-user-name">{adminUser.name || 'Admin'}</span>
              <span className="admin-user-role">Administrator</span>
            </div>
            <ChevronDownIcon size={14} color="#64748B" />
          </button>

          {profileOpen && (
            <div className="admin-profile-menu">
              <div className="profile-menu-header">
                <strong>{adminUser.name || 'Admin'}</strong>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{adminUser.email}</span>
              </div>
              <div className="profile-menu-divider" />
              <button
                className="profile-menu-item"
                onClick={() => {
                  onNavigateTab('profile');
                  setProfileOpen(false);
                }}
              >
                <UserIcon size={16} color="#64748B" />
                <span>Profile</span>
              </button>
              <button
                className="profile-menu-item"
                onClick={() => {
                  onNavigateTab('settings');
                  setProfileOpen(false);
                }}
              >
                <SettingsIcon size={16} color="#64748B" />
                <span>Settings</span>
              </button>
              <div className="profile-menu-divider" />
              <button
                className="profile-menu-item logout"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
              >
                <LogoutIcon size={16} color="#EF4444" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
