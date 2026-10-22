import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import '../styles/portalSwitcher.css';

export const PORTALS = [
  {
    id: 'student',
    name: 'Student Dashboard',
    path: '/dashboard',
    icon: '🎓',
    desc: 'Adaptive quizzes, learning path & AI tutor',
    badgeClass: 'student-portal'
  },
  {
    id: 'educator',
    name: 'Educator Dashboard',
    path: '/educator-dashboard',
    icon: '👨‍🏫',
    desc: 'Quiz authoring, cohort telemetry & reviews',
    badgeClass: 'educator-portal'
  },
  {
    id: 'admin',
    name: 'Admin Dashboard',
    path: '/admin-dashboard',
    icon: '⚙️',
    desc: 'User management, platform analytics & reports',
    badgeClass: 'admin-portal'
  }
];

export const PortalSwitcher = ({ currentPortal = 'student', showToast = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const activePortal = PORTALS.find((p) => p.id === currentPortal) || PORTALS[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPortal = (portal) => {
    setIsOpen(false);
    if (portal.id === currentPortal) return;

    // Switch authentication credentials & active role for destination portal
    if (typeof authService?.switchPortal === 'function') {
      authService.switchPortal(portal.id);
    } else {
      localStorage.setItem('learnsmart_role', portal.id);
      sessionStorage.setItem('learnsmart_role', portal.id);
    }

    if (showToast) {
      showToast(`Switched to ${portal.name}`);
    }

    // Direct client navigation to target dashboard route
    navigate(portal.path);
  };

  return (
    <div className="portal-switcher-container" ref={dropdownRef}>
      <button
        type="button"
        className={`portal-switcher-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Switch between Student, Educator, and Admin dashboards"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="portal-status-dot" aria-hidden="true" />
        <span className="portal-trigger-icon" aria-hidden="true">{activePortal.icon}</span>
        <span className="portal-trigger-label">{activePortal.name}</span>
        <span className={`portal-trigger-chevron ${isOpen ? 'rotated' : ''}`} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="portal-switcher-dropdown" role="menu">
          <div className="portal-dropdown-header">
            <div className="portal-dropdown-title">Connected Portals</div>
            <div className="portal-dropdown-subtitle">Switch your active dashboard view</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {PORTALS.map((portal) => {
              const isCurrent = portal.id === currentPortal;
              return (
                <button
                  key={portal.id}
                  type="button"
                  className={`portal-menu-item ${portal.badgeClass} ${isCurrent ? 'active-portal' : ''}`}
                  onClick={() => handleSelectPortal(portal)}
                  role="menuitem"
                >
                  <div className="portal-item-icon-box">{portal.icon}</div>
                  <div className="portal-item-details">
                    <div className="portal-item-top">
                      <span className="portal-item-name">{portal.name}</span>
                      {isCurrent && <span className="portal-active-badge">Active</span>}
                    </div>
                    <span className="portal-item-desc">{portal.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="portal-dropdown-footer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Live MySQL data synchronized across all dashboards</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalSwitcher;
