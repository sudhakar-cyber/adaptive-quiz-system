import React, { useState } from 'react';
import {
  BellIcon,
  CheckCircleIcon,
  FlameIcon,
  StarIcon,
  TrophyIcon,
  BookOpenIcon,
  ClockIcon,
  XIcon
} from './Icons';

export const NotificationsView = ({
  notifications = [],
  onMarkAllAsRead,
  onDismissNotification,
  onNotificationAction
}) => {
  const [filter, setFilter] = useState('all');

  const filteredList = notifications.filter((item) => {
    if (filter === 'unread') return item.unread;
    if (filter === 'quiz') return item.category === 'quiz';
    if (filter === 'streak') return item.category === 'streak';
    return true;
  });

  const unreadCount = notifications.filter((n) => n.unread).length;

  const getNotificationIcon = (category) => {
    switch (category) {
      case 'quiz':
        return <StarIcon size={18} color="#1D68F2" />;
      case 'streak':
        return <FlameIcon size={18} color="#FF6B00" />;
      case 'milestone':
        return <TrophyIcon size={18} color="#F59E0B" />;
      default:
        return <BellIcon size={18} color="#8B5CF6" />;
    }
  };

  return (
    <div className="tab-view-container notifications-view">
      <div className="tab-view-header">
        <div>
          <h2 className="tab-page-title">Notification Center</h2>
          <p className="tab-page-subtitle">
            Stay up to date with quiz evaluations, streak milestones, and personalized study alerts.
          </p>
        </div>

        <div className="notifications-header-actions">
          {unreadCount > 0 && (
            <button
              type="button"
              className="mark-all-read-btn"
              onClick={onMarkAllAsRead}
            >
              <CheckCircleIcon size={15} color="#1A6BFF" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      <div className="notif-filters-bar">
        <button
          type="button"
          className={`notif-filter-pill ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          className={`notif-filter-pill ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
        <button
          type="button"
          className={`notif-filter-pill ${filter === 'quiz' ? 'active' : ''}`}
          onClick={() => setFilter('quiz')}
        >
          Quizzes
        </button>
        <button
          type="button"
          className={`notif-filter-pill ${filter === 'streak' ? 'active' : ''}`}
          onClick={() => setFilter('streak')}
        >
          Streaks & Milestones
        </button>
      </div>

      <div className="notifications-list-card">
        {filteredList.length > 0 ? (
          filteredList.map((item) => (
            <div
              key={item.id}
              className={`notif-item-row ${item.unread ? 'unread' : 'read'}`}
              onClick={() => onNotificationAction && onNotificationAction(item)}
            >
              <div className="notif-icon-circle">
                {getNotificationIcon(item.category)}
              </div>

              <div className="notif-content-col">
                <div className="notif-top-row">
                  <h4 className="notif-item-title">{item.title}</h4>
                  <span className="notif-timestamp">{item.timestamp}</span>
                </div>
                <p className="notif-item-message">{item.message}</p>
              </div>

              <div className="notif-item-actions">
                {item.unread && <span className="unread-dot" title="Unread notification" />}
                <button
                  type="button"
                  className="notif-dismiss-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDismissNotification) onDismissNotification(item.id);
                  }}
                  aria-label="Dismiss notification"
                >
                  <XIcon size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-notifications-empty">
            <BellIcon size={40} color="#94A3B8" />
            <p className="empty-title">All caught up!</p>
            <p className="empty-sub">No notifications match your current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const NotificationsDropdown = ({
  notifications = [],
  onClose,
  onViewAll,
  onMarkAllAsRead
}) => {
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="notifications-dropdown-menu" role="menu">
      <div className="dropdown-header">
        <div className="dropdown-title-group">
          <span className="dropdown-title">Notifications</span>
          {unreadCount > 0 && (
            <span className="dropdown-unread-tag">{unreadCount} new</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="dropdown-mark-read"
            onClick={onMarkAllAsRead}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="dropdown-items-list">
        {notifications.slice(0, 4).map((n) => (
          <div
            key={n.id}
            className={`dropdown-item-row ${n.unread ? 'unread' : ''}`}
            onClick={() => {
              if (onViewAll) onViewAll();
              onClose();
            }}
          >
            <div className="dropdown-dot-indicator">
              {n.unread && <span className="mini-blue-dot" />}
            </div>
            <div className="dropdown-item-info">
              <span className="dropdown-item-title">{n.title}</span>
              <span className="dropdown-item-text">{n.message}</span>
              <span className="dropdown-item-time">{n.timestamp}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dropdown-footer">
        <button
          type="button"
          className="dropdown-view-all-btn"
          onClick={() => {
            if (onViewAll) onViewAll();
            onClose();
          }}
        >
          View all notifications →
        </button>
      </div>
    </div>
  );
};
