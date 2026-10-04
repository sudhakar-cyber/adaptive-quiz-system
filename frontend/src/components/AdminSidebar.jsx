import React from 'react';
import {
  GridIcon,
  UsersIcon,
  FileTextIcon,
  ActivityIcon,
  BookOpenIcon,
  SettingsIcon,
  BellIcon,
  UserIcon,
  LogoutIcon
} from './Icons';

export const AdminSidebar = ({
  activeTab = 'dashboard',
  onSelectTab,
  onLogout,
  unreadNotifs = 5,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <GridIcon size={19} color="currentColor" />
    },
    {
      id: 'users',
      label: 'User Management',
      icon: <UsersIcon size={19} color="currentColor" />
    },
    {
      id: 'quizzes',
      label: 'Quiz Management',
      icon: <FileTextIcon size={19} color="currentColor" />
    },
    {
      id: 'analytics',
      label: 'System Analytics',
      icon: <ActivityIcon size={19} color="currentColor" />
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <BookOpenIcon size={19} color="currentColor" />
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon size={19} color="currentColor" />
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <BellIcon size={19} color="currentColor" />,
      badge: unreadNotifs > 0 ? unreadNotifs : null
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <UserIcon size={19} color="currentColor" />
    }
  ];

  const handleNavClick = (tabId) => {
    onSelectTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className={`admin-sidebar ${isMobileOpen ? 'open' : ''}`}>
      <nav className="admin-nav-list">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`admin-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
              {item.badge && (
                <span className="admin-nav-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout button docked at bottom of sidebar */}
      <div className="admin-sidebar-footer">
        <button
          className="admin-logout-btn"
          onClick={onLogout}
        >
          <span className="admin-nav-icon">
            <LogoutIcon size={19} color="currentColor" />
          </span>
          <span className="admin-nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
