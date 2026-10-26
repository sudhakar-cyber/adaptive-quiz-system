import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { activityService } from '../services/activityService';
import '../styles/activityFeed.css';

const ACTION_FILTERS = [
  { id: 'all', label: 'All Activities' },
  { id: 'attempt.submitted', label: 'Quiz Submissions' },
  { id: 'quiz.started', label: 'Quizzes Started' },
  { id: 'student.login', label: 'Student Logins' },
  { id: 'feedback.submitted', label: 'Feedback' },
  { id: 'learning.milestone', label: 'Milestones & AI' }
];

const AVATAR_COLORS = [
  'avatar-blue',
  'avatar-green',
  'avatar-purple',
  'avatar-amber',
  'avatar-orange',
  'avatar-cyan'
];

function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name = '') {
  if (!name || name === 'Student') return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Just now';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 15) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return 'Recently';
  }
}

export const LiveActivityFeed = ({
  role = 'educator',
  studentId = null,
  title = 'Student Activity Stream',
  subtitle = 'Real-time telemetry of quiz attempts, test starts, and learner actions',
  maxHeight = '440px',
  showHeader = true,
  refreshInterval = 12000
}) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadActivities = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await activityService.getActivities({
        limit: 80,
        studentId,
        roleFilter: role === 'student' ? 'student' : null
      });
      if (Array.isArray(data) && data.length > 0) {
        setActivities(data);
      } else {
        const fallback = activityService.getFallbackActivities(studentId);
        setActivities(fallback);
      }
    } catch (err) {
      console.warn('LiveActivityFeed load error:', err);
      const fallback = activityService.getFallbackActivities(studentId);
      setActivities(fallback);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [studentId, role]);

  useEffect(() => {
    loadActivities();

    // Live real-time event subscription for immediate zero-latency updates
    const unsubscribe = activityService.subscribe(() => {
      loadActivities(true);
    });

    // Auto-polling interval
    const timer = setInterval(() => {
      loadActivities(true);
    }, refreshInterval);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [loadActivities, refreshInterval]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // 1. Action filter
      if (selectedFilter !== 'all') {
        if (selectedFilter === 'learning.milestone') {
          if (act.action !== 'learning.milestone' && act.action !== 'ai.assisted') return false;
        } else if (selectedFilter === 'student.login') {
          if (act.action !== 'student.login' && act.action !== 'student.registered') return false;
        } else if (act.action !== selectedFilter) {
          return false;
        }
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const actorName = (act.actorName || '').toLowerCase();
        const summary = (act.summary || '').toLowerCase();
        const action = (act.action || '').toLowerCase();
        const quizTitle = (act.metadata?.quizTitle || '').toLowerCase();
        const category = (act.metadata?.category || '').toLowerCase();

        return (
          actorName.includes(q) ||
          summary.includes(q) ||
          action.includes(q) ||
          quizTitle.includes(q) ||
          category.includes(q)
        );
      }

      return true;
    });
  }, [activities, selectedFilter, searchQuery]);

  const renderBadge = (act) => {
    const action = act.action || '';
    const meta = act.metadata || {};

    if (action === 'attempt.submitted') {
      const score = meta.score !== undefined ? meta.score : null;
      const isPass = meta.status === 'Passed' || (score !== null && Number(score) >= 70);
      return (
        <>
          <span className={`act-badge ${isPass ? 'act-badge-pass' : 'act-badge-fail'}`}>
            {isPass ? '✓' : '✗'} {score !== null ? `${Math.round(score)}%` : ''} {isPass ? 'Passed' : 'Needs Review'}
          </span>
          {meta.correctCount !== undefined && meta.totalQuestions && (
            <span className="act-badge act-badge-category">
              {meta.correctCount}/{meta.totalQuestions} Correct
            </span>
          )}
        </>
      );
    }

    if (action === 'quiz.started') {
      return (
        <span className="act-badge act-badge-inprogress">
          ⏱️ Test In Progress
        </span>
      );
    }

    if (action === 'student.login') {
      return (
        <span className="act-badge act-badge-login">
          🔑 Active Session
        </span>
      );
    }

    if (action === 'student.registered') {
      return (
        <span className="act-badge act-badge-register">
          ✨ New Student
        </span>
      );
    }

    if (action === 'feedback.submitted') {
      const rating = meta.clarityRating || meta.educatorRating || 5;
      return (
        <span className="act-badge act-badge-feedback">
          ⭐ {rating}/5 Rating
        </span>
      );
    }

    if (action === 'learning.milestone') {
      return (
        <span className="act-badge act-badge-milestone">
          🏆 Milestone Reached
        </span>
      );
    }

    if (action === 'ai.assisted') {
      return (
        <span className="act-badge act-badge-inprogress">
          ⚡ AI Tutor
        </span>
      );
    }

    return null;
  };

  return (
    <div className="activity-feed-card" aria-label="Student Activity Feed">
      {showHeader && (
        <div className="activity-feed-header">
          <div className="activity-title-group">
            <div className="activity-feed-icon-wrap" aria-hidden="true">
              📡
            </div>
            <div className="activity-title-texts">
              <h3>
                {title}
                <span className="activity-live-badge">
                  <span className="live-pulse-dot" />
                  Live Sync (MySQL)
                </span>
              </h3>
              <p>{subtitle}</p>
            </div>
          </div>

          <div className="activity-header-actions">
            <button
              type="button"
              className={`activity-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
              onClick={() => loadActivities(false)}
              disabled={isRefreshing}
              title="Refresh student activities"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Strip */}
      <div className="activity-filter-strip">
        <div className="activity-pills-row" role="tablist">
          {ACTION_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`activity-pill-btn ${selectedFilter === f.id ? 'active' : ''}`}
              onClick={() => setSelectedFilter(f.id)}
              role="tab"
              aria-selected={selectedFilter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="activity-search-box">
          <svg className="activity-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="activity-search-input"
            placeholder="Search student or quiz..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Activities Timeline */}
      <div className="activity-timeline-list" style={{ maxHeight }}>
        {loading ? (
          <div className="activity-empty-state">
            <div className="activity-empty-icon">⏳</div>
            <h4>Loading student activities...</h4>
            <p>Connecting to MySQL database activity telemetry stream.</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="activity-empty-state">
            <div className="activity-empty-icon">🎯</div>
            <h4>No activity records found</h4>
            <p>
              {searchQuery.trim() || selectedFilter !== 'all'
                ? 'No activities match your current filter criteria.'
                : 'Student activities (quiz attempts, test starts, logins) will appear here live as they happen.'}
            </p>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const actorName = act.actorName || 'Learner';
            const colorClass = getAvatarColor(actorName);
            const initials = getInitials(actorName);
            const category = act.metadata?.category;

            return (
              <div key={act.id || `${act.action}-${act.createdAt}`} className="activity-row-item">
                <div className={`activity-avatar-circle ${colorClass}`} title={actorName}>
                  {initials}
                </div>

                <div className="activity-item-content">
                  <div className="activity-item-topline">
                    <div className="activity-actor-name">
                      <span>{actorName}</span>
                      <span className="activity-role-pill">{act.actorRole || 'student'}</span>
                    </div>
                    <span className="activity-timestamp" title={act.createdAt}>
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </div>

                  <p className="activity-summary-text">{act.summary || act.action}</p>

                  <div className="activity-badges-strip">
                    {renderBadge(act)}
                    {category && (
                      <span className="act-badge act-badge-category">
                        📁 {category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LiveActivityFeed;
