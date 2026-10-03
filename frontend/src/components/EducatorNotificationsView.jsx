import React, { useState } from 'react';
import {
  BellIcon,
  CheckCircleIcon,
  StarIcon,
  TrashIcon
} from './Icons';

export const EducatorNotificationsView = ({
  notifications = [],
  onUpdateNotifications,
  showToast,
  onNavigateToTab
}) => {
  const [filter, setFilter] = useState('all');

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return item.unread;
    if (filter === 'submission') return item.category === 'submission';
    if (filter === 'review') return item.category === 'review';
    if (filter === 'alert') return item.category === 'alert';
    return true;
  });

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, unread: false }));
    onUpdateNotifications(updated);
    if (showToast) showToast('All educator notifications marked as read.');
  };

  const handleClearAll = () => {
    onUpdateNotifications([]);
    if (showToast) showToast('All notifications cleared.');
  };

  const handleMarkAsRead = (id) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, unread: false } : n
    );
    onUpdateNotifications(updated);
    if (showToast) showToast('Notification marked as read.');
  };

  const handleDismiss = (id) => {
    const updated = notifications.filter((n) => n.id !== id);
    onUpdateNotifications(updated);
    if (showToast) showToast('Notification dismissed.');
  };

  const handleActionClick = (notif) => {
    if (notif.category === 'submission' || notif.category === 'review') {
      if (onNavigateToTab) onNavigateToTab('Student Performance');
    } else if (notif.category === 'alert') {
      if (onNavigateToTab) onNavigateToTab('Analytics');
    }
  };

  return (
    <div className="educator-section-view">
      {/* Header */}
      <div className="educator-section-header-row">
        <div>
          <h1 className="educator-section-title">Educator Notifications</h1>
          <p className="educator-section-subtitle">
            Submission alerts, subjective evaluation requests, and at-risk student notifications.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {unreadCount > 0 && (
            <button
              type="button"
              className="educator-secondary-btn"
              onClick={handleMarkAllRead}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircleIcon size={16} color="#10B981" />
              <span>Mark All as Read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              className="educator-secondary-btn"
              onClick={handleClearAll}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <TrashIcon size={14} color="#64748B" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="educator-filter-toolbar" style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`educator-time-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            className={`educator-time-pill ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`educator-time-pill ${filter === 'submission' ? 'active' : ''}`}
            onClick={() => setFilter('submission')}
          >
            Submissions
          </button>
          <button
            type="button"
            className={`educator-time-pill ${filter === 'review' ? 'active' : ''}`}
            onClick={() => setFilter('review')}
          >
            Manual Reviews
          </button>
          <button
            type="button"
            className={`educator-time-pill ${filter === 'alert' ? 'active' : ''}`}
            onClick={() => setFilter('alert')}
          >
            Alerts & Warnings
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className="educator-content-card"
              style={{
                padding: '16px 20px',
                borderLeft: notif.unread ? '4px solid #10B981' : '1px solid #E2E8F0',
                backgroundColor: notif.unread ? '#FFFFFF' : '#FAFAFC',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor:
                      notif.category === 'submission'
                        ? '#ECFDF5'
                        : notif.category === 'review'
                        ? '#EFF6FF'
                        : notif.category === 'alert'
                        ? '#FEF2F2'
                        : '#F1F5F9',
                    color:
                      notif.category === 'submission'
                        ? '#10B981'
                        : notif.category === 'review'
                        ? '#2563EB'
                        : notif.category === 'alert'
                        ? '#DC2626'
                        : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {notif.category === 'submission' ? (
                    <StarIcon size={20} color="#10B981" />
                  ) : notif.category === 'alert' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  ) : (
                    <BellIcon size={20} color="#2563EB" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: '#0F172A' }}>
                      {notif.title}
                    </h3>
                    {notif.unread && (
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          display: 'inline-block'
                        }}
                      />
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569', lineHeight: 1.45 }}>
                    {notif.message}
                  </p>
                  <span style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '6px', display: 'inline-block' }}>
                    {notif.timestamp}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="educator-secondary-btn sm"
                  onClick={() => handleActionClick(notif)}
                >
                  View Details
                </button>
                {notif.unread && (
                  <button
                    type="button"
                    className="educator-secondary-btn sm"
                    onClick={() => handleMarkAsRead(notif.id)}
                  >
                    Mark Read
                  </button>
                )}
                <button
                  type="button"
                  className="educator-icon-btn danger"
                  onClick={() => handleDismiss(notif.id)}
                  title="Dismiss notification"
                >
                  <TrashIcon size={14} color="#DC2626" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="educator-empty-state-card">
            <BellIcon size={42} color="#94A3B8" />
            <h3>No Notifications</h3>
            <p>You have caught up with all notifications in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EducatorNotificationsView;
