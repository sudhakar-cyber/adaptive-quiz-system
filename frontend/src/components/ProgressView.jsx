import React from 'react';
import {
  ChartIcon,
  StarIcon,
  FlameIcon,
  TargetIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  ClockIcon,
  AwardIcon,
  RotateCcwIcon
} from './Icons';

export const ProgressView = ({
  quizzesTaken = 18,
  avgScore = '85.4%',
  streakDays = 7,
  quizHistory = [],
  onRetakeQuiz
}) => {
  const subjectBreakdown = [
    {
      name: 'Mathematics',
      score: 90,
      color: '#00C48C',
      mastery: 'Mastered',
      topicsCompleted: '14 / 15 Topics',
      bgLight: '#E6FAF0'
    },
    {
      name: 'Data Structures & Algorithms',
      score: 82,
      color: '#00D2D3',
      mastery: 'Proficient',
      topicsCompleted: '12 / 15 Topics',
      bgLight: '#E0FAFA'
    },
    {
      name: 'Python Programming',
      score: 76,
      color: '#FFB900',
      mastery: 'Intermediate',
      topicsCompleted: '9 / 12 Topics',
      bgLight: '#FFF8E6'
    },
    {
      name: 'Web Security',
      score: 68,
      color: '#FF7675',
      mastery: 'Developing',
      topicsCompleted: '6 / 10 Topics',
      bgLight: '#FFF0F0'
    },
    {
      name: 'Others (Cloud & OS)',
      score: 60,
      color: '#6C5CE7',
      mastery: 'Foundational',
      topicsCompleted: '5 / 8 Topics',
      bgLight: '#F3E8FF'
    }
  ];

  return (
    <div className="tab-view-container progress-view">
      <div className="tab-view-header">
        <div>
          <h2 className="tab-page-title">My Learning Progress & Analytics</h2>
          <p className="tab-page-subtitle">
            Comprehensive real-time tracking of your quiz performance, subject mastery, and history.
          </p>
        </div>
      </div>

      <div className="progress-kpi-grid">
        <div className="kpi-card card-kpi-blue">
          <div className="kpi-icon-wrap bg-blue-light">
            <TargetIcon size={24} color="#1D68F2" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Quizzes Completed</span>
            <span className="kpi-value">{quizzesTaken}</span>
            <span className="kpi-trend trend-up">
              <TrendingUpIcon size={12} color="#10B981" />
              <span>+3 this week</span>
            </span>
          </div>
        </div>

        <div className="kpi-card card-kpi-green">
          <div className="kpi-icon-wrap bg-green-light">
            <StarIcon size={24} color="#10B981" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Average Score</span>
            <span className="kpi-value">{avgScore}</span>
            <span className="kpi-trend trend-up">
              <TrendingUpIcon size={12} color="#10B981" />
              <span>+5.2% vs last month</span>
            </span>
          </div>
        </div>

        <div className="kpi-card card-kpi-orange">
          <div className="kpi-icon-wrap bg-orange-light">
            <FlameIcon size={24} color="#F97316" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Current Streak</span>
            <span className="kpi-value">{streakDays} Days</span>
            <span className="kpi-subtext text-orange">Best streak: 12 days</span>
          </div>
        </div>

        <div className="kpi-card card-kpi-purple">
          <div className="kpi-icon-wrap bg-purple-light">
            <AwardIcon size={24} color="#8B5CF6" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Global Percentile</span>
            <span className="kpi-value">Top 5%</span>
            <span className="kpi-subtext text-purple">Rank #42 in cohort</span>
          </div>
        </div>
      </div>

      <div className="progress-details-grid">
        <div className="progress-section-card">
          <div className="section-card-header">
            <h3 className="section-card-title">Subject Mastery Breakdown</h3>
            <span className="section-badge-info">5 Active Subjects</span>
          </div>

          <div className="subject-progress-bars-list">
            {subjectBreakdown.map((subj) => (
              <div key={subj.name} className="subject-bar-item">
                <div className="subject-bar-header">
                  <div className="subject-name-group">
                    <span
                      className="subject-bar-dot"
                      style={{ backgroundColor: subj.color }}
                    />
                    <span className="subject-bar-title">{subj.name}</span>
                    <span
                      className="mastery-pill"
                      style={{ backgroundColor: subj.bgLight, color: subj.color }}
                    >
                      {subj.mastery}
                    </span>
                  </div>
                  <div className="subject-bar-score-group">
                    <span className="topics-count-text">{subj.topicsCompleted}</span>
                    <span className="subject-score-percent">{subj.score}%</span>
                  </div>
                </div>

                <div className="subject-progress-track">
                  <div
                    className="subject-progress-fill"
                    style={{
                      width: `${subj.score}%`,
                      backgroundColor: subj.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="progress-section-card strengths-card">
          <div className="section-card-header">
            <h3 className="section-card-title">AI Performance Insights</h3>
          </div>

          <div className="insights-container">
            <div className="insight-block insight-positive">
              <div className="insight-badge-pill badge-green">
                <CheckCircleIcon size={14} color="#059669" />
                <span>Strongest Areas</span>
              </div>
              <ul className="insight-bullets">
                <li>
                  <strong>Discrete Mathematics:</strong> 90% mastery rate across Set Theory and Logic questions.
                </li>
                <li>
                  <strong>Python Syntax & Loops:</strong> Consistent 100% accuracy in list comprehensions.
                </li>
              </ul>
            </div>

            <div className="insight-block insight-warning">
              <div className="insight-badge-pill badge-amber">
                <TargetIcon size={14} color="#D97706" />
                <span>Recommended Focus Areas</span>
              </div>
              <ul className="insight-bullets">
                <li>
                  <strong>Binary Search Trees (DSA):</strong> Practice tree rotations and balancing algorithms.
                </li>
                <li>
                  <strong>Cross-Site Scripting (XSS):</strong> Review CSP directives and DOM sanitization.
                </li>
              </ul>
            </div>

            <div className="weekly-goal-box">
              <div className="goal-text-row">
                <span className="goal-title">Weekly Goal: 4 Quizzes</span>
                <span className="goal-stat">3 of 4 Done</span>
              </div>
              <div className="goal-progress-track">
                <div className="goal-progress-fill" style={{ width: '75%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="progress-section-card history-card">
        <div className="section-card-header">
          <h3 className="section-card-title">Recent Quiz Activity History</h3>
          <span className="section-badge-info">Last 4 Quizzes</span>
        </div>

        <div className="history-table-wrapper">
          <table className="quiz-history-table">
            <thead>
              <tr>
                <th>Quiz Name</th>
                <th>Category</th>
                <th>Score</th>
                <th>Status</th>
                <th>Date Taken</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {quizHistory.length > 0 ? (
                quizHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold text-dark">{item.title}</td>
                    <td>
                      <span className="category-tag">{item.category}</span>
                    </td>
                    <td>
                      <span className="score-cell-badge">{item.score}%</span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          item.score >= 80
                            ? 'status-mastered'
                            : item.score >= 70
                            ? 'status-passed'
                            : 'status-review'
                        }`}
                      >
                        {item.score >= 80 ? 'Mastered' : item.score >= 70 ? 'Passed' : 'Needs Review'}
                      </span>
                    </td>
                    <td className="text-muted">{item.date}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="retake-table-btn"
                        onClick={() => onRetakeQuiz && onRetakeQuiz(item.title)}
                      >
                        <RotateCcwIcon size={13} />
                        <span>Retake</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No recent quizzes found. Take a quiz to view your history!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
