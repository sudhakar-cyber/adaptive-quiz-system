import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import capIcon from '../assets/cap_icon.png';
import {
  BellIcon,
  SearchIcon,
  ChevronDownIcon,
  UserIcon,
  LogoutIcon,
  SettingsIcon
} from './Icons';
import { PortalSwitcher } from './PortalSwitcher';
import { authService } from '../services/authService';

export const DashboardHeader = ({
  onToggleMobileMenu,
  searchQuery = '',
  onSearchChange,
  onLogout,
  onOpenNotifications,
  onOpenProfile,
  onOpenSettings,
  educatorName = 'Dr. Sarah Jenkins',
  educatorEmail = 'educator@learnsmart.com',
  educatorRole = 'Educator',
  notificationCount = 0,
  avatarUrl = null,
  notificationsList = []
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);
  const navigate = useNavigate();

  const educatorInitials = (() => {
    if (!educatorName) return 'ED';
    const cleanName = educatorName.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length === 1 && parts[0]) return parts[0].slice(0, 2).toUpperCase();
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return 'ED';
  })();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="educator-header">
      {/* Left: Hamburger (Mobile) + LearnSmart Branding */}
      <div className="educator-header-left">
        <button
          type="button"
          className="educator-mobile-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Toggle Navigation Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div className="educator-brand-link">
          <img
            src={capIcon}
            alt="LearnSmart Graduation Cap"
            className="educator-brand-cap"
          />
          <div className="educator-brand-texts">
            <span className="educator-brand-name">LearnSmart</span>
            <span className="educator-brand-sub">Adaptive Quiz System</span>
          </div>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="educator-header-center">
        <div className="educator-search-box">
          <SearchIcon size={18} className="educator-search-icon" color="#64748B" />
          <input
            type="text"
            className="educator-search-input"
            placeholder="Search quizzes, topics..."
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            aria-label="Search quizzes and topics"
          />
        </div>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="educator-header-right">
        {/* Notification Bell */}
        <div style={{ position: 'relative' }} ref={notifMenuRef}>
          <button
            type="button"
            className="educator-notif-btn"
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowProfileMenu(false);
            }}
            aria-label="Notifications"
            title="Notifications"
          >
            <BellIcon size={20} color="currentColor" />
            {notificationCount > 0 && (
              <span className="educator-notif-badge">{notificationCount}</span>
            )}
          </button>

          {showNotifMenu && (
            <div className="educator-dropdown-menu" style={{ width: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', fontWeight: 700, fontSize: '0.88rem', color: 'inherit', borderBottom: '1px solid var(--border-light, #F1F5F9)' }}>
                <span>Notifications ({notificationCount})</span>
                {onOpenNotifications && (
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: '#2563EB', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => {
                      setShowNotifMenu(false);
                      onOpenNotifications();
                    }}
                  >
                    View All →
                  </button>
                )}
              </div>
              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                {notificationsList && notificationsList.length > 0 ? (
                  notificationsList.slice(0, 4).map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--border-light, #F8FAFC)',
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setShowNotifMenu(false);
                        if (onOpenNotifications) onOpenNotifications();
                      }}
                    >
                      <p style={{ margin: 0, fontWeight: 600, color: 'inherit' }}>{notif.title}</p>
                      <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>{notif.timestamp}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px 12px', fontSize: '0.82rem', color: '#94A3B8', textAlign: 'center' }}>
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Pill with Avatar, Name, Role & Dropdown */}
        <div style={{ position: 'relative' }} ref={profileMenuRef}>
          <button
            type="button"
            className="educator-profile-pill"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-expanded={showProfileMenu}
            aria-haspopup="true"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={educatorName}
                className="educator-avatar-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="educator-avatar-fallback"
              style={{ display: avatarUrl ? 'none' : 'flex' }}
            >
              {educatorInitials}
            </div>
            <div className="educator-profile-info">
              <span className="educator-profile-name">{educatorName}</span>
              <span className="educator-profile-role">{educatorRole}</span>
            </div>
            <ChevronDownIcon
              size={16}
              className={`educator-chevron ${showProfileMenu ? 'open' : ''}`}
            />
          </button>

          {showProfileMenu && (
            <div className="educator-dropdown-menu">
              <div
                style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light, #F1F5F9)', cursor: 'pointer' }}
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onOpenProfile) onOpenProfile();
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'inherit' }}>{educatorName}</div>
                <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>{educatorEmail}</div>
              </div>
              <button
                type="button"
                className="educator-dropdown-item"
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onOpenProfile) onOpenProfile();
                }}
              >
                <UserIcon size={16} color="#64748B" />
                <span>My Profile</span>
              </button>
              <button
                type="button"
                className="educator-dropdown-item"
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onOpenSettings) onOpenSettings();
                }}
              >
                <SettingsIcon size={16} color="#64748B" />
                <span>Settings</span>
              </button>
              <div className="educator-dropdown-divider" />
              <button
                type="button"
                className="educator-dropdown-item"
                onClick={() => {
                  setShowProfileMenu(false);
                  authService.switchPortal('student');
                  navigate('/dashboard');
                }}
              >
                <span style={{ fontSize: '15px', marginRight: '2px' }}>🎓</span>
                <span>Student Dashboard</span>
              </button>
              <button
                type="button"
                className="educator-dropdown-item"
                onClick={() => {
                  setShowProfileMenu(false);
                  authService.switchPortal('admin');
                  navigate('/admin-dashboard');
                }}
              >
                <span style={{ fontSize: '15px', marginRight: '2px' }}>⚙️</span>
                <span>Admin Dashboard</span>
              </button>
              <div className="educator-dropdown-divider" />
              <button
                type="button"
                className="educator-dropdown-item danger"
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onLogout) onLogout();
                }}
              >
                <LogoutIcon size={16} color="#DC2626" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
