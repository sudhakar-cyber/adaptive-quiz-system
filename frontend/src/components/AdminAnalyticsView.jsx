import React from 'react';
import {
  ChartIcon,
  TrophyIcon,
  FlameIcon,
  BookOpenIcon,
  UsersIcon,
  ActivityIcon,
  CheckCircleIcon
} from './Icons';
import sharedDatabase from '../services/sharedDatabase';

export const AdminAnalyticsView = ({
  students = [],
  educators = [],
  quizzes = [],
  stats = {}
}) => {
  const safeStudents = Array.isArray(students) && students.length > 0 ? students : (typeof sharedDatabase?.getStudents === 'function' ? sharedDatabase.getStudents() : []);
  const safeEducators = Array.isArray(educators) && educators.length > 0 ? educators : (typeof sharedDatabase?.getEducators === 'function' ? sharedDatabase.getEducators() : []);
  const safeQuizzes = Array.isArray(quizzes) && quizzes.length > 0 ? quizzes : (typeof sharedDatabase?.getQuizzes === 'function' ? sharedDatabase.getQuizzes() : []);

  // Calculated analytics
  const sortedByScore = [...safeStudents].sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
  const topStudents = sortedByScore.slice(0, 5);
  const supportStudents = [...safeStudents]
    .filter((s) => (s.avgScore || 0) < 75 || s.status === 'Needs Support')
    .slice(0, 5);

  const topQuizzes = [...safeQuizzes]
    .sort((a, b) => (b.submissionsCount || 0) - (a.submissionsCount || 0))
    .slice(0, 4);

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

      {/* Top 4 Performance KPIs */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card stat-blue">
          <div className="stat-icon-box">
            <TrophyIcon size={24} color="#3B82F6" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Platform Avg Score</span>
            <span className="stat-value">{stats.avgScore || '82.5%'}</span>
          </div>
        </div>

        <div className="admin-stat-card stat-green">
          <div className="stat-icon-box">
            <CheckCircleIcon size={24} color="#10B981" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Quiz Pass Rate</span>
            <span className="stat-value">88.4%</span>
          </div>
        </div>

        <div className="admin-stat-card stat-orange">
          <div className="stat-icon-box">
            <FlameIcon size={24} color="#F97316" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Completion Rate</span>
            <span className="stat-value">91.2%</span>
          </div>
        </div>

        <div className="admin-stat-card stat-purple">
          <div className="stat-icon-box">
            <ActivityIcon size={24} color="#8B5CF6" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Quiz Submissions</span>
            <span className="stat-value">{stats.completedQuizzes || 184}</span>
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
            {topStudents.map((s, idx) => (
              <div key={s.id || idx} className="leaderboard-item">
                <div className="rank-badge">#{idx + 1}</div>
                <div className="leaderboard-avatar">
                  {s.avatarInitials || s.name?.slice(0, 2).toUpperCase() || 'ST'}
                </div>
                <div className="leaderboard-details">
                  <div className="leaderboard-name">{s.name}</div>
                  <div className="leaderboard-sub">{s.studentId || 'LS-STUD'} • {s.quizzesCompleted || 10} Quizzes</div>
                </div>
                <div className="leaderboard-score">
                  <span className="score-number">{s.avgScore || 90}%</span>
                  <span className="score-label">Avg</span>
                </div>
              </div>
            ))}
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
                <div key={s.id || idx} className="leaderboard-item support">
                  <div className="support-icon-alert">!</div>
                  <div className="leaderboard-avatar role-student">
                    {s.avatarInitials || s.name?.slice(0, 2).toUpperCase() || 'ST'}
                  </div>
                  <div className="leaderboard-details">
                    <div className="leaderboard-name">{s.name}</div>
                    <div className="leaderboard-sub">{s.studentId || 'LS-STUD'} • Focus: {s.topSubject || 'Needs Review'}</div>
                  </div>
                  <div className="leaderboard-score">
                    <span className="score-number warn">{s.avgScore || 68}%</span>
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
            {topQuizzes.map((q, idx) => (
              <div key={q.id || idx} className="quiz-popularity-item">
                <div className="quiz-pop-icon" style={{ backgroundColor: q.categoryBg || '#EFF6FF', color: q.categoryColor || '#3B82F6' }}>
                  <BookOpenIcon size={18} color="currentColor" />
                </div>
                <div className="quiz-pop-details">
                  <div className="quiz-pop-title">{q.title}</div>
                  <div className="quiz-pop-meta">{q.category} • Created by {q.createdBy || 'Educator'}</div>
                </div>
                <div className="quiz-pop-stats">
                  <div className="stat-attempts">{q.submissionsCount || 45} attempts</div>
                  <div className="stat-avg">{q.avgScore ? `${q.avgScore}%` : '84%'} avg</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Educator Velocity & Faculty Output */}
        <div className="admin-chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Educator Activity & Output</h3>
          </div>
          <div className="analytics-list-body">
            {safeEducators.slice(0, 4).map((e, idx) => (
              <div key={e.id || idx} className="educator-summary-item">
                <div className="educator-sum-avatar">
                  {e.avatarInitials || e.name?.slice(0, 2).toUpperCase() || 'ED'}
                </div>
                <div className="educator-sum-info">
                  <div className="educator-sum-name">{e.name}</div>
                  <div className="educator-sum-dept">{e.department || 'Computer Science'} • {e.institution || 'LearnSmart'}</div>
                </div>
                <div className="educator-sum-stats">
                  <span className="stat-quizzes-badge">{e.quizzesCreated || 12} Quizzes</span>
                  <span className="stat-students-count">{e.totalStudents || 180} Students</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsView;
