import React, { useState, useEffect, useRef } from 'react';
import AdminHeader from '../components/admin/AdminHeader';
import AdminSidebar from '../components/admin/AdminSidebar';
import StatCard from '../components/admin/StatCard';
import UserGrowthChart from '../components/admin/UserGrowthChart';
import QuizCategoryChart from '../components/admin/QuizCategoryChart';
import RecentUsers from '../components/admin/RecentUsers';
import QuickActions from '../components/admin/QuickActions';

import { AdminUserManagementView } from '../components/AdminUserManagementView';
import { AdminQuizManagementView } from '../components/AdminQuizManagementView';
import { AdminAnalyticsView } from '../components/AdminAnalyticsView';
import { AdminReportsView } from '../components/AdminReportsView';
import { AdminSettingsView } from '../components/AdminSettingsView';
import { AdminNotificationsView } from '../components/AdminNotificationsView';
import { AdminProfileView } from '../components/AdminProfileView';
import { AdminAddUserModal } from '../components/AdminAddUserModal';

import { sharedDatabase } from '../services/sharedDatabase';
import { authService } from '../services/authService';
import '../styles/adminDashboard.css';

export const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const mainRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Live data synchronized with sharedDatabase
  const [users, setUsers] = useState(() => {
    try {
      if (typeof sharedDatabase?.getUsers === 'function') return sharedDatabase.getUsers() || [];
      if (typeof sharedDatabase?.getAllUsers === 'function') return sharedDatabase.getAllUsers() || [];
      return [];
    } catch {
      return [];
    }
  });

  const [quizzes, setQuizzes] = useState(() => {
    try {
      if (typeof sharedDatabase?.getQuizzes === 'function') return sharedDatabase.getQuizzes() || [];
      return [];
    } catch {
      return [];
    }
  });

  const [students, setStudents] = useState(() => {
    try {
      if (typeof sharedDatabase?.getStudents === 'function') return sharedDatabase.getStudents() || [];
      return [];
    } catch {
      return [];
    }
  });

  const [educators, setEducators] = useState(() => {
    try {
      if (typeof sharedDatabase?.getEducators === 'function') return sharedDatabase.getEducators() || [];
      return [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      if (typeof sharedDatabase?.getAdminNotifications === 'function') return sharedDatabase.getAdminNotifications() || [];
      return [];
    } catch {
      return [];
    }
  });

  const [stats, setStats] = useState(() => {
    try {
      if (typeof sharedDatabase?.getSystemStats === 'function') return sharedDatabase.getSystemStats() || {};
      return {};
    } catch {
      return {};
    }
  });

  const currentUser = (() => {
    try {
      return authService.getCurrentUser() || {
        name: 'Admin',
        role: 'Administrator',
        email: 'admin@learnsmart.edu',
        title: 'Administrator'
      };
    } catch {
      return {
        name: 'Admin',
        role: 'Administrator',
        email: 'admin@learnsmart.edu',
        title: 'Administrator'
      };
    }
  })();

  const refreshData = () => {
    try {
      if (typeof sharedDatabase?.getUsers === 'function') setUsers(sharedDatabase.getUsers() || []);
      if (typeof sharedDatabase?.getQuizzes === 'function') setQuizzes(sharedDatabase.getQuizzes() || []);
      if (typeof sharedDatabase?.getStudents === 'function') setStudents(sharedDatabase.getStudents() || []);
      if (typeof sharedDatabase?.getEducators === 'function') setEducators(sharedDatabase.getEducators() || []);
      if (typeof sharedDatabase?.getAdminNotifications === 'function') setNotifications(sharedDatabase.getAdminNotifications() || []);
      if (typeof sharedDatabase?.getSystemStats === 'function') setStats(sharedDatabase.getSystemStats() || {});
    } catch (err) {
      console.warn('Admin refresh error:', err);
    }
  };

  useEffect(() => {
    let unsubAdmin = null;
    let unsubStudents = null;
    try {
      if (typeof sharedDatabase?.subscribeAdmin === 'function') {
        unsubAdmin = sharedDatabase.subscribeAdmin(() => {
          refreshData();
        });
      }
      if (typeof sharedDatabase?.subscribe === 'function') {
        unsubStudents = sharedDatabase.subscribe(() => {
          refreshData();
        });
      }
    } catch (err) {
      console.warn('Admin subscribe error:', err);
    }

    const handleLiveEvents = () => refreshData();
    window.addEventListener('learnsmart_quizzes_updated', handleLiveEvents);
    window.addEventListener('learnsmart_submissions_updated', handleLiveEvents);
    window.addEventListener('storage', handleLiveEvents);

    return () => {
      if (unsubAdmin) unsubAdmin();
      if (unsubStudents) unsubStudents();
      window.removeEventListener('learnsmart_quizzes_updated', handleLiveEvents);
      window.removeEventListener('learnsmart_submissions_updated', handleLiveEvents);
      window.removeEventListener('storage', handleLiveEvents);
    };
  }, []);

  const handleToggleUserStatus = (userId, role) => {
    sharedDatabase.toggleUserStatus(userId, role);
    refreshData();
    showToast('User account status updated.');
  };

  const handleDeleteUser = (userId, role) => {
    sharedDatabase.deleteUser(userId, role);
    refreshData();
    showToast('User removed from platform.');
  };

  const handleToggleQuizStatus = (quizId) => {
    if (quizId) {
      sharedDatabase.toggleQuizStatus(quizId);
      showToast('Quiz status updated.');
    }
    refreshData();
  };

  const handleDeleteQuiz = (quizId) => {
    if (quizId) {
      sharedDatabase.deleteQuiz(quizId);
      showToast('Quiz removed.');
    }
    refreshData();
  };

  const handleUserAdded = (newUser) => {
    if (newUser.role === 'educator') {
      sharedDatabase.registerEducator({
        name: newUser.name,
        email: newUser.email,
        department: newUser.department || 'Computer Science',
        educatorId: newUser.customId || `ED-2025-${Math.floor(Math.random() * 900) + 100}`
      });
    } else {
      sharedDatabase.registerStudent({
        name: newUser.name,
        email: newUser.email,
        studentId: newUser.customId || `LS-2025-${Math.floor(Math.random() * 900) + 100}`,
        major: newUser.department || 'Computer Science'
      });
    }
    refreshData();
    showToast(`New ${newUser.role} "${newUser.name}" added successfully!`);
  };

  const handleMarkRead = (id) => {
    const updated = sharedDatabase.markAdminNotificationRead(id);
    setNotifications(updated);
  };

  const handleMarkAllRead = () => {
    const updated = sharedDatabase.markAllAdminNotificationsRead();
    setNotifications(updated);
  };

  const unreadNotifCount = notifications.filter((n) => n.unread).length;
  const activeQuizzesCount = quizzes.filter((q) => q.status === 'Active' || !q.status).length;
  const draftQuizzesCount = Math.max(0, quizzes.length - activeQuizzesCount);

  const statCards = [
    {
      id: 'users',
      label: 'Total Users',
      value: users.length || stats.totalUsers || 0,
      subtitle: `${students.length} Students • ${educators.length} Educators`,
      color: 'blue',
      onClick: () => setActiveTab('users'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      id: 'quizzes',
      label: 'Total Quizzes',
      value: quizzes.length || stats.totalQuizzes || 0,
      subtitle: `${activeQuizzesCount} Published • ${draftQuizzesCount} Drafts`,
      color: 'green',
      onClick: () => setActiveTab('quizzes'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
    },
    {
      id: 'active',
      label: 'Active Quizzes',
      value: activeQuizzesCount,
      subtitle: 'Live in student catalog',
      color: 'orange',
      onClick: () => setActiveTab('quizzes'),
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      ),
    },
    {
      id: 'health',
      label: 'System Health',
      value: stats.systemHealth || 'Online',
      subtitle: `${stats.serverUptime || '99.98%'} Uptime • ${stats.apiLatency || '42ms'}`,
      color: 'purple',
      onClick: () => setActiveTab('analytics'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="ad-shell">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="ad-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Header */}
      <AdminHeader
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={onLogout}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unreadCount={unreadNotifCount}
        adminUser={currentUser}
      />

      <div className="ad-body">
        {/* Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setSidebarOpen(false);
          }}
          onLogout={onLogout}
          isOpen={sidebarOpen}
          unreadCount={unreadNotifCount}
        />

        {/* Main Content Area */}
        <main ref={mainRef} className="ad-main">
          {/* Dashboard Tab - System Overview */}
          {activeTab === 'dashboard' && (
            <div className="admin-overview-container">
              <div className="ad-page-header">
                <h1 className="ad-page-title">System Overview</h1>
                <p className="ad-page-subtitle">Monitor platform activity and manage users</p>
              </div>

              {/* Stat Cards Row */}
              <div className="ad-stats-row">
                {statCards.map((s) => (
                  <StatCard key={s.id} {...s} />
                ))}
              </div>

              {/* Charts Row */}
              <div className="ad-charts-row">
                <div className="ad-chart-card ad-growth-card">
                  <h3 className="ad-card-title">User Growth</h3>
                  <UserGrowthChart users={users} />
                </div>
                <div className="ad-chart-card ad-category-card">
                  <h3 className="ad-card-title">Quiz Category Distribution</h3>
                  <QuizCategoryChart
                    quizzes={quizzes}
                    onSelectCategory={() => setActiveTab('quizzes')}
                  />
                </div>
              </div>

              {/* Bottom Row */}
              <div className="ad-bottom-row">
                <div className="ad-card ad-recent-card">
                  <RecentUsers
                    users={users}
                    searchQuery={searchQuery}
                    onViewAll={() => setActiveTab('users')}
                  />
                </div>
                <div className="ad-card ad-actions-card">
                  <QuickActions
                    onOpenAddUser={() => setIsAddUserModalOpen(true)}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <AdminUserManagementView
              users={users}
              onToggleStatus={handleToggleUserStatus}
              onDeleteUser={handleDeleteUser}
              onOpenAddUser={() => setIsAddUserModalOpen(true)}
            />
          )}

          {/* Quiz Management Tab */}
          {activeTab === 'quizzes' && (
            <AdminQuizManagementView
              quizzes={quizzes}
              onToggleStatus={handleToggleQuizStatus}
              onDeleteQuiz={handleDeleteQuiz}
            />
          )}

          {/* System Analytics Tab */}
          {activeTab === 'analytics' && (
            <AdminAnalyticsView
              students={students}
              educators={educators}
              quizzes={quizzes}
              stats={stats}
            />
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <AdminReportsView
              students={students}
              educators={educators}
              quizzes={quizzes}
              stats={stats}
            />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <AdminSettingsView />
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <AdminNotificationsView
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
            />
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <AdminProfileView
              adminUser={currentUser}
            />
          )}
        </main>
      </div>

      {/* Add User Modal */}
      <AdminAddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onUserAdded={handleUserAdded}
      />
    </div>
  );
};

export default AdminDashboard;
