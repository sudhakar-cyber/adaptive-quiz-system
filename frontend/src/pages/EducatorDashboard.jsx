import React, { useState, useEffect } from 'react';
import '../styles/educatorDashboard.css';
import { DashboardHeader } from '../components/DashboardHeader';
import { EducatorSidebar } from '../components/EducatorSidebar';
import { StatCard } from '../components/StatCard';
import { QuizSubmissionTable, INITIAL_SUBMISSIONS } from '../components/QuizSubmissionTable';
import { StudentPerformanceChart } from '../components/StudentPerformanceChart';
import { QuickActionCard } from '../components/QuickActionCard';
import { EducatorCreateQuizView } from '../components/EducatorCreateQuizView';
import { EducatorManageQuizzesView } from '../components/EducatorManageQuizzesView';
import { EducatorPerformanceView } from '../components/EducatorPerformanceView';
import { EducatorAnalyticsView } from '../components/EducatorAnalyticsView';
import { EducatorReportsView } from '../components/EducatorReportsView';
import { EducatorNotificationsView } from '../components/EducatorNotificationsView';
import { EducatorProfileView } from '../components/EducatorProfileView';
import {
  INITIAL_EDUCATOR_QUIZZES,
  INITIAL_EDUCATOR_NOTIFICATIONS,
  INITIAL_EDUCATOR_PROFILE
} from '../data/educatorData';
import { sharedDatabase } from '../services/sharedDatabase';

export const EducatorDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [openCreateModal, setOpenCreateModal] = useState(false);

  // Core Persistent State for Educator
  const [quizzes, setQuizzes] = useState(() => {
    try {
      const saved = localStorage.getItem('learnsmart_educator_quizzes');
      return saved ? JSON.parse(saved) : INITIAL_EDUCATOR_QUIZZES;
    } catch {
      return INITIAL_EDUCATOR_QUIZZES;
    }
  });

  // Shared Students Database with real-time updates
  const [students, setStudents] = useState(() => sharedDatabase.getStudents());

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('learnsmart_educator_notifications');
      return saved ? JSON.parse(saved) : INITIAL_EDUCATOR_NOTIFICATIONS;
    } catch {
      return INITIAL_EDUCATOR_NOTIFICATIONS;
    }
  });

  const [profileData, setProfileData] = useState(() => {
    try {
      const saved = localStorage.getItem('learnsmart_educator_profile');
      return saved ? JSON.parse(saved) : INITIAL_EDUCATOR_PROFILE;
    } catch {
      return INITIAL_EDUCATOR_PROFILE;
    }
  });

  const [avatarImage, setAvatarImage] = useState(() => {
    try {
      const saved = localStorage.getItem('learnsmart_educator_avatar');
      if (saved && (saved.includes('priya_avatar') || saved.includes('assets/priya_avatar'))) {
        localStorage.removeItem('learnsmart_educator_avatar');
        return null;
      }
      return saved || null;
    } catch {
      return null;
    }
  });

  const [submissions, setSubmissions] = useState(() => sharedDatabase.getSubmissions());

  // Subscribe to real-time student updates, submissions, quizzes, and storage across tabs
  useEffect(() => {
    const unsubStudents = sharedDatabase.subscribe((updatedStudents) => {
      setStudents(updatedStudents);
    });

    const unsubSubmissions = sharedDatabase.subscribeSubmissions
      ? sharedDatabase.subscribeSubmissions((updatedSubmissions) => {
          setSubmissions(updatedSubmissions);
        })
      : () => {};

    const handleSubmissionsUpdated = (e) => {
      const updated = e?.detail || sharedDatabase.getSubmissions();
      setSubmissions(updated);
    };

    const handleQuizzesUpdated = (e) => {
      const updated = e?.detail || sharedDatabase.getQuizzes();
      setQuizzes(updated);
    };

    const handleStorageChange = (e) => {
      if (!e.key || e.key === 'learnsmart_shared_submissions') {
        setSubmissions(sharedDatabase.getSubmissions());
      }
      if (!e.key || e.key === 'learnsmart_educator_quizzes') {
        setQuizzes(sharedDatabase.getQuizzes());
      }
      if (!e.key || e.key === 'learnsmart_shared_students' || e.key === 'learnsmart_educator_students') {
        setStudents(sharedDatabase.getStudents());
      }
      if (!e.key || e.key === 'learnsmart_educator_notifications') {
        try {
          const savedNotifs = localStorage.getItem('learnsmart_educator_notifications');
          if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('learnsmart_submissions_updated', handleSubmissionsUpdated);
    window.addEventListener('learnsmart_quizzes_updated', handleQuizzesUpdated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubStudents();
      unsubSubmissions();
      window.removeEventListener('learnsmart_submissions_updated', handleSubmissionsUpdated);
      window.removeEventListener('learnsmart_quizzes_updated', handleQuizzesUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const unreadNotifCount = notifications.filter((n) => n.unread).length;

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  const handleAddStudent = (newStudentData) => {
    const created = sharedDatabase.addStudent(newStudentData);
    showToast(`Student ${created.name} added to cohort successfully!`);
  };

  const handleRemoveStudent = (studentId) => {
    sharedDatabase.removeStudent(studentId);
    showToast('Student removed from active cohort.');
  };

  const handleClearAllStudents = () => {
    sharedDatabase.clearAllStudents();
    showToast('All students removed from the directory.');
  };

  const handleResetStudent = (studentId) => {
    sharedDatabase.resetStudent(studentId);
    showToast('Student performance data reset successfully.');
  };

  const handleUpdateQuizzes = (updated) => {
    setQuizzes(updated);
    try {
      localStorage.setItem('learnsmart_educator_quizzes', JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }
  };

  const handleUpdateNotifications = (updated) => {
    setNotifications(updated);
    try {
      localStorage.setItem('learnsmart_educator_notifications', JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }
  };

  const handleUpdateProfile = (updated) => {
    setProfileData(updated);
    if (updated.avatarImage !== undefined) {
      setAvatarImage(updated.avatarImage);
    }
    try {
      localStorage.setItem('learnsmart_educator_profile', JSON.stringify(updated));
      if (updated.fullName) {
        localStorage.setItem('learnsmart_educator', updated.fullName);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleCreateQuiz = (newQuiz) => {
    const updated = [newQuiz, ...quizzes];
    handleUpdateQuizzes(updated);
    showToast(`New quiz "${newQuiz.title}" created & published successfully!`);
    setActiveTab('Manage Quizzes');
  };

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setOpenCreateModal(false);
  };

  // Dynamic Cohort Metrics
  const activeQuizzesCount = quizzes.filter((q) => q.status === 'Active').length;
  const topPerformersCount = students.filter(
    (s) => s.status === 'Top Performer' || (s.avgScore || 0) >= 85
  ).length;
  const atRiskCount = students.filter(
    (s) => s.status === 'Needs Support' || ((s.avgScore || 0) > 0 && s.avgScore < 60)
  ).length;

  const totalQuizzesCount = Math.max(1, quizzes.length);
  const totalCompletions = students.reduce((sum, s) => sum + (s.quizzesCompleted || 0), 0);

  const avgCompletionRate = (() => {
    if (students.length === 0) {
      if (submissions.length > 0) {
        const completed = submissions.filter((s) => (s.status || '').toLowerCase() === 'completed').length;
        return `${Math.round((completed / submissions.length) * 100)}%`;
      }
      return '0%';
    }
    if (totalCompletions > 0) {
      const pct = Math.min(100, Math.round((totalCompletions / (students.length * totalQuizzesCount)) * 100));
      return `${pct}%`;
    }
    const withScores = students.filter((s) => (s.avgScore || 0) > 0);
    if (withScores.length > 0) {
      const avg = Math.round(withScores.reduce((sum, s) => sum + s.avgScore, 0) / withScores.length);
      return `${avg}%`;
    }
    if (submissions.length > 0) {
      const completed = submissions.filter((s) => (s.status || '').toLowerCase() === 'completed').length;
      return `${Math.round((completed / submissions.length) * 100)}%`;
    }
    return '0%';
  })();

  const pendingSubmissionsCount = submissions.filter(
    (s) => s.status && s.status.toLowerCase() !== 'completed'
  ).length;
  const pendingReviewsCount = atRiskCount + pendingSubmissionsCount + unreadNotifCount;

  return (
    <div className="educator-dashboard-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="educator-toast" role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <DashboardHeader
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={onLogout}
        onOpenNotifications={() => setActiveTab('Notifications')}
        onOpenProfile={() => setActiveTab('Profile')}
        educatorName={profileData.fullName || 'Educator'}
        educatorRole={profileData.academicTitle ? 'Faculty' : 'Educator'}
        notificationCount={unreadNotifCount}
        avatarUrl={avatarImage}
        notificationsList={notifications}
      />

      <div className="educator-main-body">
        {/* Dark Navy Sidebar */}
        <EducatorSidebar
          activeTab={activeTab}
          onSelectTab={handleTabSelect}
          onLogout={onLogout}
          isOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          notificationCount={unreadNotifCount}
        />

        {/* Main Content Area */}
        <main className={`educator-main-content ${activeTab === 'Dashboard' ? 'educator-main-content-dashboard' : ''}`}>
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'Dashboard' && (
            <>
              {/* Greeting Section */}
              <section className="educator-greeting-section">
                <h1 className="educator-greeting-title">
                  Welcome, {profileData.fullName || 'Educator'}!
                </h1>
                <p className="educator-greeting-sub">
                  Manage quizzes, track student progress, and analyze learning outcomes.
                </p>
              </section>

              {/* 4 Stat Cards */}
              <section className="educator-stat-grid" aria-label="Educator Statistics">
                <StatCard
                  title="Total Quizzes"
                  value={quizzes.length.toString()}
                  subtitle={`${activeQuizzesCount} Active • ${quizzes.length - activeQuizzesCount} Drafts`}
                  variant="blue"
                  onClick={() => setActiveTab('Manage Quizzes')}
                  actionHint="Manage →"
                />
                <StatCard
                  title="Total Students"
                  value={students.length.toString()}
                  subtitle={`${topPerformersCount} Top • ${atRiskCount} Needs Support`}
                  variant="green"
                  onClick={() => setActiveTab('Student Performance')}
                  actionHint="View →"
                />
                <StatCard
                  title="Avg. Completion"
                  value={avgCompletionRate}
                  subtitle={totalCompletions > 0 ? `${totalCompletions} attempts completed` : 'Cohort curriculum progress'}
                  variant="amber"
                  onClick={() => setActiveTab('Analytics')}
                  actionHint="Analytics →"
                />
                <StatCard
                  title="Pending Reviews"
                  value={pendingReviewsCount.toString()}
                  subtitle={`${atRiskCount} at-risk • ${pendingSubmissionsCount} pending`}
                  variant="purple"
                  onClick={() => setActiveTab(atRiskCount > 0 ? 'Student Performance' : 'Notifications')}
                  actionHint="Review →"
                />
              </section>

              {/* Middle Section: Recent Quiz Submissions & Student Performance */}
              <section className="educator-middle-grid">
                <QuizSubmissionTable
                  submissions={submissions}
                  searchFilter={searchQuery}
                  onViewAll={() => setActiveTab('Student Performance')}
                />
                <StudentPerformanceChart
                  students={students}
                  onViewAll={() => setActiveTab('Student Performance')}
                />
              </section>

              {/* Bottom Section: Quick Actions */}
              <section className="educator-quick-actions-grid" aria-label="Quick Actions">
                <QuickActionCard
                  label="+ Create Quiz"
                  variant="blue"
                  onClick={() => setActiveTab('Create Quiz')}
                />
                <QuickActionCard
                  label="View Analytics"
                  variant="purple"
                  onClick={() => setActiveTab('Analytics')}
                />
                <QuickActionCard
                  label="Generate Report"
                  variant="green"
                  onClick={() => setActiveTab('Reports')}
                />
              </section>
            </>
          )}

          {/* TAB: CREATE QUIZ */}
          {activeTab === 'Create Quiz' && (
            <EducatorCreateQuizView
              onSaveQuiz={handleCreateQuiz}
              onCancel={() => setActiveTab('Manage Quizzes')}
              showToast={showToast}
            />
          )}

          {/* TAB 2: MANAGE QUIZZES */}
          {activeTab === 'Manage Quizzes' && (
            <EducatorManageQuizzesView
              quizzes={quizzes}
              onUpdateQuizzes={handleUpdateQuizzes}
              showToast={showToast}
              externalSearch={searchQuery}
              openCreateModalInitially={openCreateModal}
              onCloseCreateModal={() => setOpenCreateModal(false)}
              onCreateQuizClick={() => setActiveTab('Create Quiz')}
            />
          )}

          {/* TAB 3: STUDENT PERFORMANCE */}
          {activeTab === 'Student Performance' && (
            <EducatorPerformanceView
              students={students}
              showToast={showToast}
              externalSearch={searchQuery}
              onAddStudent={handleAddStudent}
              onRemoveStudent={handleRemoveStudent}
              onClearAllStudents={handleClearAllStudents}
              onResetStudent={handleResetStudent}
            />
          )}

          {/* TAB 4: ANALYTICS */}
          {activeTab === 'Analytics' && (
            <EducatorAnalyticsView showToast={showToast} />
          )}

          {/* TAB 5: REPORTS */}
          {activeTab === 'Reports' && (
            <EducatorReportsView showToast={showToast} />
          )}

          {/* TAB 6: NOTIFICATIONS */}
          {activeTab === 'Notifications' && (
            <EducatorNotificationsView
              notifications={notifications}
              onUpdateNotifications={handleUpdateNotifications}
              students={students}
              educatorName={profileData.fullName || 'Educator'}
              showToast={showToast}
              onNavigateToTab={setActiveTab}
            />
          )}

          {/* TAB 7: PROFILE */}
          {activeTab === 'Profile' && (
            <EducatorProfileView
              profileData={profileData}
              onUpdateProfile={handleUpdateProfile}
              onLogout={onLogout}
              showToast={showToast}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default EducatorDashboard;
