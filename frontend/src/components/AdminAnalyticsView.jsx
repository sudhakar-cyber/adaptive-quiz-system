import React, { useState, useEffect, useMemo } from 'react';
import {
  ChartIcon,
  TrophyIcon,
  FlameIcon,
  BookOpenIcon,
  UsersIcon,
  ActivityIcon,
  CheckCircleIcon
} from './Icons';
import sharedDatabase, { getAuthToken } from '../services/sharedDatabase';

export const AdminAnalyticsView = ({
  students = [],
  educators = [],
  quizzes = [],
  stats = {},
  submissions = []
}) => {
  const [liveDbAnalytics, setLiveDbAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync real-time analytics directly from MySQL/SQLite database API
  useEffect(() => {
    let isMounted = true;

    const fetchDatabaseAnalytics = async () => {
      try {
        setIsLoading(true);
        const token = typeof getAuthToken === 'function' ? await getAuthToken() : 'admin-session-token';
        const res = await fetch('/api/results/analytics', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.kpis) {
            setLiveDbAnalytics(data);
          }
        }
      } catch (err) {
        // Fallback to local data layer if offline
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDatabaseAnalytics();

    const handleUpdate = () => fetchDatabaseAnalytics();
    window.addEventListener('learnsmart_submissions_updated', handleUpdate);
    window.addEventListener('learnsmart_quizzes_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('learnsmart_submissions_updated', handleUpdate);
      window.removeEventListener('learnsmart_quizzes_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const safeStudents = Array.isArray(students) ? students : (typeof sharedDatabase?.getStudents === 'function' ? sharedDatabase.getStudents() : []);
  const safeEducators = Array.isArray(educators) ? educators : (typeof sharedDatabase?.getEducators === 'function' ? sharedDatabase.getEducators() : []);
  const safeQuizzes = Array.isArray(quizzes) ? quizzes : (typeof sharedDatabase?.getQuizzes === 'function' ? sharedDatabase.getQuizzes() : []);
  const safeSubmissions = Array.isArray(submissions) ? submissions : (typeof sharedDatabase?.getSubmissions === 'function' ? sharedDatabase.getSubmissions() : []);

  // 1. Exact Platform Average Score (Strict calculation from stored database attempts)
  const platformAvgScore = useMemo(() => {
    if (liveDbAnalytics?.kpis?.avgScore) {
      return liveDbAnalytics.kpis.avgScore;
    }
    if (safeSubmissions.length > 0) {
      const sum = safeSubmissions.reduce((acc, sub) => {
        const sc = typeof sub.score === 'number' ? sub.score : parseFloat(String(sub.score).replace('%', '')) || 0;
        return acc + sc;
      }, 0);
      return `${Math.round((sum / safeSubmissions.length) * 10) / 10}%`;
    }
    const withScores = safeStudents.filter((s) => (s.avgScore || 0) > 0);
    if (withScores.length > 0) {
      const sum = withScores.reduce((acc, s) => acc + s.avgScore, 0);
      return `${Math.round((sum / withScores.length) * 10) / 10}%`;
    }
    return stats.avgScore || '0%';
  }, [liveDbAnalytics, safeSubmissions, safeStudents, stats.avgScore]);

  // 2. Exact Quiz Pass Rate (Benchmark >= 70%)
  const quizPassRate = useMemo(() => {
    if (liveDbAnalytics?.kpis?.passRate) {
      return liveDbAnalytics.kpis.passRate;
    }
    if (safeSubmissions.length > 0) {
      const passed = safeSubmissions.filter((sub) => {
        const sc = typeof sub.score === 'number' ? sub.score : parseFloat(String(sub.score).replace('%', '')) || 0;
        return sc >= 70;
      }).length;
      return `${Math.round((passed / safeSubmissions.length) * 100)}%`;
    }
    return stats.passRate || '0%';
  }, [liveDbAnalytics, safeSubmissions, stats.passRate]);

  // 3. Exact Platform Completion Rate
  const completionRate = useMemo(() => {
    if (liveDbAnalytics?.kpis?.completionRate) {
      return liveDbAnalytics.kpis.completionRate;
    }
    if (safeSubmissions.length === 0) return '0%';
    const activeQuizzesCount = safeQuizzes.filter((q) => {
      const s = (q.status || '').toLowerCase().trim();
      return s === 'active' || s === 'published' || !s;
    }).length;
    const targetQuizzes = Math.max(1, activeQuizzesCount);
    const targetStudents = Math.max(1, safeStudents.length);
    const completedCount = safeSubmissions.filter((s) => (s.status || '').toLowerCase() === 'completed').length;
    const pct = Math.min(100, Math.round((completedCount / (targetStudents * targetQuizzes)) * 100));
    return `${pct}%`;
  }, [liveDbAnalytics, safeSubmissions, safeQuizzes, safeStudents]);

  // 4. Exact Total Quiz Submissions Count
  const totalSubmissions = useMemo(() => {
    if (liveDbAnalytics?.kpis?.totalSubmissions !== undefined) {
      return liveDbAnalytics.kpis.totalSubmissions;
    }
    return safeSubmissions.length;
  }, [liveDbAnalytics, safeSubmissions]);

  // 5. Highest Performing Students (From database or stored student accounts)
  const topStudents = useMemo(() => {
    if (Array.isArray(liveDbAnalytics?.topStudents) && liveDbAnalytics.topStudents.length > 0) {
      return liveDbAnalytics.topStudents;
    }
    return [...safeStudents]
      .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
      .slice(0, 5);
  }, [liveDbAnalytics, safeStudents]);

  // 6. Students Needing Support (Attempts < 70% or flagged status)
  const supportStudents = useMemo(() => {
    if (Array.isArray(liveDbAnalytics?.supportStudents) && liveDbAnalytics.supportStudents.length > 0) {
      return liveDbAnalytics.supportStudents;
    }
    return [...safeStudents]
      .filter((s) => ((s.quizzesCompleted || 0) > 0 && (s.avgScore || 0) < 70) || s.status === 'Needs Support')
      .slice(0, 5);
  }, [liveDbAnalytics, safeStudents]);

  // 7. Most Attempted Quizzes (From database records)
  const topQuizzes = useMemo(() => {
    if (Array.isArray(liveDbAnalytics?.topQuizzes) && liveDbAnalytics.topQuizzes.length > 0) {
      return liveDbAnalytics.topQuizzes;
    }
    return [...safeQuizzes]
      .sort((a, b) => (b.submissionsCount || 0) - (a.submissionsCount || 0))
      .slice(0, 4);
  }, [liveDbAnalytics, safeQuizzes]);

  return (
    <div className="admin-management-container">
      {/* Page Header */}
      <div className="management-header">
        <div>
          <h1 className="management-title">System Analytics</h1>
          <p className="management-subtitle">
            Comprehensive breakdown of student learning trajectories, platform velocity, and educator performance
          </p>
        </div>
      </div>

      {/* Top 4 Performance KPIs - Computed Authentically from Database Attempts */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card stat-blue">
          <div className="stat-icon-box">
            <TrophyIcon size={24} color="#3B82F6" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Platform Avg Score</span>
            <span className="stat-value">{platformAvgScore}</span>
          </div>
        </div>

        <div className="admin-stat-card stat-green">
          <div className="stat-icon-box">
            <CheckCircleIcon size={24} color="#10B981" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Quiz Pass Rate</span>
            <span className="stat-value">{quizPassRate}</span>
          </div>
        </div>

        <div className="admin-stat-card stat-orange">
          <div className="stat-icon-box">
            <FlameIcon size={24} color="#F97316" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Completion Rate</span>
            <span className="stat-value">{completionRate}</span>
          </div>
        </div>

        <div className="admin-stat-card stat-purple">
          <div className="stat-icon-box">
            <ActivityIcon size={24} color="#8B5CF6" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Quiz Submissions</span>
            <span className="stat-value">{totalSubmissions}</span>
          </div>
        </div>
      </div>

      {/* Two Columns: Top Performers vs Students Needing Intervention */}
      <div className="admin-charts-grid" style={{ marginBottom: '24px' }}>
        {/* Highest Performing Students */}
        <div className="admin-chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Highest Performing Students</h3>
            <span className="badge-pill-success">Top Percentile</span>
          </div>
          <div className="analytics-list-body">
            {topStudents.length === 0 ? (
              <div className="empty-support-msg" style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                No student assessment records available yet.
              </div>
            ) : (
              topStudents.map((s, idx) => (
                <div key={s.id || s.email || idx} className="leaderboard-item">
                  <div className="rank-badge">#{idx + 1}</div>
                  <div className="leaderboard-avatar">
                    {s.avatarInitials || s.name?.slice(0, 2).toUpperCase() || 'ST'}
                  </div>
                  <div className="leaderboard-details">
                    <div className="leaderboard-name">{s.name}</div>
                    <div className="leaderboard-sub">
                      {s.studentId || 'LS-STUD'} • {s.quizzesCompleted ?? 0} Quizzes
                    </div>
                  </div>
                  <div className="leaderboard-score">
                    <span className="score-number">{s.avgScore ?? 0}%</span>
                    <span className="score-label">Avg</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Students Needing Improvement */}
        <div className="admin-chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Students Needing Support</h3>
            <span className="badge-pill-warning">Attention Needed</span>
          </div>
          <div className="analytics-list-body">
            {supportStudents.length === 0 ? (
              <div className="empty-support-msg">
                All active students are performing above target thresholds.
              </div>
            ) : (
              supportStudents.map((s, idx) => (
                <div key={s.id || s.email || idx} className="leaderboard-item support">
                  <div className="support-icon-alert">!</div>
                  <div className="leaderboard-avatar role-student">
                    {s.avatarInitials || s.name?.slice(0, 2).toUpperCase() || 'ST'}
                  </div>
                  <div className="leaderboard-details">
                    <div className="leaderboard-name">{s.name}</div>
                    <div className="leaderboard-sub">
                      {s.studentId || 'LS-STUD'} • Focus: {s.topSubject || 'Needs Review'}
                    </div>
                  </div>
                  <div className="leaderboard-score">
                    <span className="score-number warn">{s.avgScore ?? 0}%</span>
                    <span className="score-label">Score</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Educator Activity & Most Attempted Quizzes */}
      <div className="admin-charts-grid">
        {/* Most Attempted Quizzes */}
        <div className="admin-chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Most Attempted Quizzes</h3>
          </div>
          <div className="analytics-list-body">
            {topQuizzes.length === 0 ? (
              <div className="empty-support-msg" style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                No quizzes created or published yet.
              </div>
            ) : (
              topQuizzes.map((q, idx) => (
                <div key={q.id || idx} className="quiz-popularity-item">
                  <div className="quiz-pop-icon" style={{ backgroundColor: q.categoryBg || '#EFF6FF', color: q.categoryColor || '#3B82F6' }}>
                    <BookOpenIcon size={18} color="currentColor" />
                  </div>
                  <div className="quiz-pop-details">
                    <div className="quiz-pop-title">{q.title}</div>
                    <div className="quiz-pop-meta">{q.category} • Created by {q.authorName || q.createdBy || 'Educator'}</div>
                  </div>
                  <div className="quiz-pop-stats">
                    <div className="stat-attempts">{q.submissionsCount ?? 0} attempts</div>
                    <div className="stat-avg">{q.avgScore !== undefined && q.avgScore !== null ? `${q.avgScore}%` : '0%'} avg</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Educator Velocity & Faculty Output */}
        <div className="admin-chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Educator Activity & Output</h3>
          </div>
          <div className="analytics-list-body">
            {safeEducators.length === 0 ? (
              <div className="empty-support-msg" style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                No educator accounts registered yet.
              </div>
            ) : (
              safeEducators.slice(0, 4).map((e, idx) => {
                const authorQuizzes = safeQuizzes.filter((q) => {
                  if (q.authorId && (q.authorId === e.id || q.authorId === e.educatorId)) return true;
                  if (q.authorName && e.name && q.authorName.toLowerCase() === e.name.toLowerCase()) return true;
                  if (q.createdBy && e.name && q.createdBy.toLowerCase() === e.name.toLowerCase()) return true;
                  return false;
                });
                const quizzesCreated = e.quizzesCreated !== undefined && e.quizzesCreated !== null ? e.quizzesCreated : authorQuizzes.length;
                const totalStudents = e.totalStudents !== undefined && e.totalStudents !== null ? e.totalStudents : safeStudents.length;

                return (
                  <div key={e.id || idx} className="educator-summary-item">
                    <div className="educator-sum-avatar">
                      {e.avatarInitials || e.name?.slice(0, 2).toUpperCase() || 'ED'}
                    </div>
                    <div className="educator-sum-info">
                      <div className="educator-sum-name">{e.name}</div>
                      <div className="educator-sum-dept">{e.department || 'Computer Science'} • {e.institution || 'LearnSmart'}</div>
                    </div>
                    <div className="educator-sum-stats">
                      <span className="stat-quizzes-badge">{quizzesCreated} Quizzes</span>
                      <span className="stat-students-count">{totalStudents} Students</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsView;
