import React from 'react';
import {
  HomeIcon,
  BellIcon,
  UserIcon,
  LogoutIcon
} from './Icons';

// Custom icons specifically matching the reference image's sidebar
const CreateQuizIcon = ({ size = 19, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const ManageQuizzesIcon = ({ size = 19, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <path d="M9 14l2 2 4-4"></path>
  </svg>
);

const StudentPerformanceIcon = ({ size = 19, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

const AnalyticsIcon = ({ size = 19, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"></path>
    <path d="M7 16l4-8 4 5 5-9"></path>
  </svg>
);

const ReportsIcon = ({ size = 19, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

export const EducatorSidebar = ({
  activeTab = 'Dashboard',
  onSelectTab,
  onLogout,
  isOpen = false,
  onCloseMobile,
  notificationCount = 2
}) => {
  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: HomeIcon },
    { id: 'Create Quiz', label: 'Create Quiz', icon: CreateQuizIcon },
    { id: 'Manage Quizzes', label: 'Manage Quizzes', icon: ManageQuizzesIcon },
    { id: 'Student Performance', label: 'Student Performance', icon: StudentPerformanceIcon },
    { id: 'Analytics', label: 'Analytics', icon: AnalyticsIcon },
    { id: 'Reports', label: 'Reports', icon: ReportsIcon },
    { id: 'Notifications', label: 'Notifications', icon: BellIcon, badge: notificationCount > 0 ? notificationCount : null },
    { id: 'Profile', label: 'Profile', icon: UserIcon }
  ];

  const handleItemClick = (id) => {
    if (onSelectTab) onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="educator-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`educator-sidebar ${isOpen ? 'drawer-open' : ''}`}>
        <nav className="educator-sidebar-nav" aria-label="Educator Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isAnalyticsMatch =
              item.id === 'Analytics' &&
              (activeTab === 'Analytics' ||
                activeTab === 'Assessment & Learning Analytics' ||
                activeTab === 'Assessment Analytics');
            const isActive = activeTab === item.id || isAnalyticsMatch;

            return (
              <button
                key={item.id}
                type="button"
                className={`educator-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item.id)}
              >
                <span className="educator-nav-icon">
                  <Icon
                    size={19}
                    color={isActive ? '#FFFFFF' : '#94A3B8'}
                  />
                </span>
                <span className="educator-nav-label">{item.label}</span>
                {item.badge && (
                  <span className="educator-sidebar-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="educator-sidebar-bottom">
          <button
            type="button"
            className="educator-logout-btn"
            onClick={onLogout}
            title="Logout from account"
          >
            <span className="educator-nav-icon">
              <LogoutIcon size={19} color="#94A3B8" />
            </span>
            <span className="educator-nav-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default EducatorSidebar;
