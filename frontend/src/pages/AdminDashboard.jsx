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

import { sharedDatabase, getAuthToken } from '../services/sharedDatabase';
import { authService } from '../services/authService';
import '../styles/adminDashboard.css';

export const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuizCategory, setSelectedQuizCategory] = useState('all');
  const [selectedQuizStatus, setSelectedQuizStatus] = useState('all');
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

  const [submissions, setSubmissions] = useState(() => {
    try {
      if (typeof sharedDatabase?.getSubmissions === 'function') return sharedDatabase.getSubmissions() || [];
      return [];
    } catch {
      return [];
    }
  });

  const [adminProfile, setAdminProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('learnsmart_admin_profile');
      if (saved) return JSON.parse(saved);
      const authAdmin = authService.getCurrentUser();
      return {
        name: authAdmin?.name || 'Admin',
        fullName: authAdmin?.fullName || authAdmin?.name || 'System Administrator',
        email: authAdmin?.email || 'admin@learnsmart.edu',
        role: 'Administrator',
        title: authAdmin?.title || 'Senior Platform Administrator',
        department: 'Platform Operations & Infrastructure',
        phone: '+1 (555) 019-2834',
        location: 'Tech Wing - Server Room 4B',
        bio: 'Oversees the LearnSmart adaptive quiz platform, managing system configurations, educator permissions, student cohorts, and telemetry benchmarks.',
        twoFactorEnabled: true,
        accessLevel: 'Super Administrator (Tier 1)',
        joinedDate: 'January 2024',
        lastLogin: 'Just now',
        avatarImage: localStorage.getItem('learnsmart_admin_avatar') || null
      };
    } catch {
      return {
        name: 'Admin',
        fullName: 'System Administrator',
        email: 'admin@learnsmart.edu',
        role: 'Administrator',
        title: 'Senior Platform Administrator',
        department: 'Platform Operations & Infrastructure',
        phone: '+1 (555) 019-2834',
        location: 'Tech Wing - Server Room 4B',
        bio: 'Oversees the LearnSmart adaptive quiz platform, managing system configurations, educator permissions, student cohorts, and telemetry benchmarks.',
        twoFactorEnabled: true,
        accessLevel: 'Super Administrator (Tier 1)',
        joinedDate: 'January 2024',
        lastLogin: 'Just now',
        avatarImage: null
      };
    }
  });

  const handleUpdateAdminProfile = (updatedProfile) => {
    setAdminProfile(updatedProfile);
    try {
      localStorage.setItem('learnsmart_admin_profile', JSON.stringify(updatedProfile));
      if (updatedProfile.avatarImage) {
        localStorage.setItem('learnsmart_admin_avatar', updatedProfile.avatarImage);
      } else {
        localStorage.removeItem('learnsmart_admin_avatar');
      }
      authService.loginAdmin({
        ...updatedProfile,
        name: updatedProfile.fullName || updatedProfile.name || 'Admin'
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const refreshData = () => {
    try {
      if (typeof sharedDatabase?.getUsers === 'function') setUsers(sharedDatabase.getUsers() || []);
      if (typeof sharedDatabase?.getQuizzes === 'function') setQuizzes(sharedDatabase.getQuizzes() || []);
      if (typeof sharedDatabase?.getStudents === 'function') setStudents(sharedDatabase.getStudents() || []);
      if (typeof sharedDatabase?.getEducators === 'function') setEducators(sharedDatabase.getEducators() || []);
      if (typeof sharedDatabase?.getAdminNotifications === 'function') setNotifications(sharedDatabase.getAdminNotifications() || []);
      if (typeof sharedDatabase?.getSystemStats === 'function') setStats(sharedDatabase.getSystemStats() || {});
      if (typeof sharedDatabase?.getSubmissions === 'function') setSubmissions(sharedDatabase.getSubmissions() || []);
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
    window.addEventListener('learnsmart_students_updated', handleLiveEvents);
    window.addEventListener('learnsmart_admin_updated', handleLiveEvents);
    window.addEventListener('learnsmart_quizzes_updated', handleLiveEvents);
    window.addEventListener('learnsmart_submissions_updated', handleLiveEvents);
    window.addEventListener('storage', handleLiveEvents);

    // Live tracking from MySQL database
    if (typeof sharedDatabase?.syncAllFromBackend === 'function') {
      sharedDatabase.syncAllFromBackend().then(() => {
        refreshData();
      }).catch(() => {});
    }

    // Fetch administrator profile from MySQL database using actual logged-in admin credentials
    (async () => {
      try {
        const token = await getAuthToken();
        // Resolve actual admin identity from localStorage (set during login)
        const actualUid =
          localStorage.getItem('learnsmart_uid') ||
          sessionStorage.getItem('learnsmart_uid') ||
          '';
        const actualEmail =
          localStorage.getItem('learnsmart_email') ||
          sessionStorage.getItem('learnsmart_email') ||
          (() => {
            try {
              const raw = localStorage.getItem('learnsmart_admin');
              if (raw && raw.trim().startsWith('{')) {
                return JSON.parse(raw)?.email || '';
              }
            } catch { }
            return 'admin@learnsmart.edu';
          })();
        const actualName =
          localStorage.getItem('learnsmart_user') ||
          sessionStorage.getItem('learnsmart_user') ||
          'Admin';

        const headers = {
          'Authorization': `Bearer ${token}`,
          'X-User-Role': 'admin'
        };
        if (actualUid) headers['X-User-UID'] = actualUid;
        if (actualEmail) headers['X-User-Email'] = actualEmail;
        if (actualName) headers['X-User-Name'] = actualName;

        const res = await fetch('/api/users/me', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.name) {
            setAdminProfile((prev) => ({
              ...prev,
              fullName: data.name || prev.fullName,
              email: data.email || prev.email,
              phone: data.phone !== undefined && data.phone !== null ? data.phone : prev.phone,
              department: data.department || prev.department,
              title: data.title || prev.title,
              bio: data.bio || prev.bio,
              avatarImage: data.avatar_url || prev.avatarImage
            }));
          }
        }
      } catch (err) {
        console.warn('Backend admin profile fetch note:', err);
      }
    })();

    // Real-time periodic live tracking polling from MySQL
    const liveTrackingTimer = setInterval(() => {
      if (typeof sharedDatabase?.syncAllFromBackend === 'function') {
        sharedDatabase.syncAllFromBackend().catch(() => {});
      }
    }, 8000);

    return () => {
      clearInterval(liveTrackingTimer);
      if (unsubAdmin) unsubAdmin();
      if (unsubStudents) unsubStudents();
      window.removeEventListener('learnsmart_students_updated', handleLiveEvents);
      window.removeEventListener('learnsmart_admin_updated', handleLiveEvents);
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('learnsmart_submissions_updated', {
          detail: sharedDatabase.getSubmissions()
        })
      );
      window.dispatchEvent(new Event('storage'));
    }
    showToast('User removed from platform.');
  };

  const handleToggleQuizStatus = (quizId) => {
    if (quizId) {
      const updated = sharedDatabase.toggleQuizStatus(quizId);
      if (updated) {
        showToast(`Quiz "${updated.title}" status changed to ${updated.status}.`);
      } else {
        showToast('Quiz status updated.');
      }
    }
    refreshData();
  };

  const handleDeleteQuiz = (quizId) => {
    if (quizId) {
      sharedDatabase.deleteQuiz(quizId);
      showToast('Quiz removed from curriculum.');
    }
    refreshData();
  };

  const handleUpdateQuizzes = (updatedQuizzes) => {
    if (Array.isArray(updatedQuizzes)) {
      setQuizzes(updatedQuizzes);
      sharedDatabase.persistQuizzes(updatedQuizzes);
      refreshData();
    }
  };

  const handleSaveQuiz = (quizData, isEdit = false) => {
    if (isEdit) {
      const updated = sharedDatabase.updateQuiz(quizData.id, quizData);
      refreshData();
      showToast(`Quiz "${quizData.title}" updated successfully!`);
      return updated;
    } else {
      const created = sharedDatabase.addQuiz(quizData);
      refreshData();
      showToast(`Quiz "${created.title}" published successfully!`);
      return created;
    }
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
        studentId: newUser.customId || sharedDatabase.generateUniqueStudentId(),
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

  const handleDeleteNotification = (notifOrId) => {
    const updated = sharedDatabase.deleteAdminNotification(notifOrId);
    setNotifications(updated);
    showToast('Notification deleted successfully');
  };

  const handleClearAllNotifications = () => {
    const updated = sharedDatabase.clearAllAdminNotifications();
    setNotifications(updated);
    showToast('All notifications cleared successfully');
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
      onClick: () => {
        setSelectedQuizCategory('all');
        setSelectedQuizStatus('all');
        setActiveTab('quizzes');
        showToast('Viewing all quizzes in Quiz Management');
      },
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
      onClick: () => {
        setSelectedQuizCategory('all');
        setSelectedQuizStatus('active');
        setActiveTab('quizzes');
        showToast('Filtered to active quizzes in Quiz Management');
      },
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
          if (tab === 'quizzes') {
            setSelectedQuizCategory('all');
            setSelectedQuizStatus('all');
          }
          setActiveTab(tab);
          setSidebarOpen(false);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unreadCount={unreadNotifCount}
        adminUser={adminProfile}
      />

      <div className="ad-body">
        {/* Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'quizzes') {
              setSelectedQuizCategory('all');
              setSelectedQuizStatus('all');
            }
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
                  <div className="ad-card-header-flex">
                    <h3 className="ad-card-title">User Growth</h3>
                    <button
                      type="button"
                      className="ad-card-action-link"
                      onClick={() => setActiveTab('users')}
                      title="Manage institutional users"
                    >
                      Manage Users →
                    </button>
                  </div>
                  <UserGrowthChart
                    users={users}
                    onSelectPoint={() => setActiveTab('users')}
                  />
                </div>
                <div className="ad-chart-card ad-category-card">
                  <div className="ad-card-header-flex">
                    <h3 className="ad-card-title">Quiz Category Distribution</h3>
                    <button
                      type="button"
                      className="ad-card-action-link"
                      onClick={() => {
                        setSelectedQuizCategory('all');
                        setSelectedQuizStatus('all');
                        setActiveTab('quizzes');
                      }}
                      title="View all quiz categories"
                    >
                      Manage Quizzes →
                    </button>
                  </div>
                  <QuizCategoryChart
                    quizzes={quizzes}
                    onSelectCategory={(categoryName) => {
                      setSelectedQuizCategory(categoryName);
                      setSelectedQuizStatus('all');
                      setActiveTab('quizzes');
                      showToast(`Filtered quizzes by category: ${categoryName}`);
                    }}
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
              initialCategoryFilter={selectedQuizCategory}
              initialStatusFilter={selectedQuizStatus}
              onToggleStatus={handleToggleQuizStatus}
              onDeleteQuiz={handleDeleteQuiz}
              onUpdateQuizzes={handleUpdateQuizzes}
              onSaveQuiz={handleSaveQuiz}
              showToast={showToast}
              externalSearch={searchQuery}
            />
          )}

          {activeTab === 'analytics' && (
            <AdminAnalyticsView
              students={students}
              educators={educators}
              quizzes={quizzes}
              stats={stats}
              submissions={submissions}
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
              onDeleteNotification={handleDeleteNotification}
              onClearAllNotifications={handleClearAllNotifications}
              showToast={showToast}
              onRefresh={refreshData}
            />
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <AdminProfileView
              adminUser={adminProfile}
              onUpdateProfile={handleUpdateAdminProfile}
              showToast={showToast}
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
