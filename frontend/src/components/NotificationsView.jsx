import React, { useState } from 'react';
import {
  BellIcon,
  CheckCircleIcon,
  FlameIcon,
  StarIcon,
  TrophyIcon,
  TrashIcon
} from './Icons';
import { sharedDatabase } from '../services/sharedDatabase';

export const NotificationsView = ({
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDismissNotification,
  onClearAllNotifications,
  onNotificationAction
}) => {
  const handleClearAll = async () => {
    if (onClearAllNotifications) {
      await onClearAllNotifications();
    } else {
      await sharedDatabase.clearAllNotifications();
    }
  };
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
          <button
            type="button"
            className="mark-all-read-btn"
            disabled={unreadCount === 0}
            onClick={onMarkAllAsRead}
            title={unreadCount > 0 ? 'Mark all notifications as read' : 'All notifications are read'}
            style={unreadCount === 0 ? { opacity: 0.5, cursor: 'default' } : {}}
          >
            <CheckCircleIcon size={15} color={unreadCount > 0 ? '#1A6BFF' : '#94A3B8'} />
            <span>Mark all as read</span>
          </button>
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

        <button
          type="button"
          className="educator-secondary-btn"
          disabled={notifications.length === 0}
          onClick={handleClearAll}
          title="Delete all notifications"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'rgb(220, 38, 38)',
            borderColor: 'rgb(254, 202, 202)',
            marginLeft: 'auto',
            ...(notifications.length === 0 ? { opacity: 0.5, cursor: 'default' } : {})
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="">
            <polyline points="3 6 5 6 21 6" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Clear All</span>
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
                </div>
                <p className="notif-item-message">{item.message}</p>
              </div>

              <div className="notif-item-actions">
                <span className="notif-timestamp">{item.timestamp || item.time || 'Just now'}</span>
                {item.unread && (
                  <>
                    <span className="unread-dot" title="Unread notification" />
                    <button
                      type="button"
                      className="notif-mark-read-btn"
                      title="Mark as read"
                      aria-label="Mark as read"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onMarkAsRead) {
                          onMarkAsRead(item.id);
                        } else {
                          sharedDatabase.markNotificationRead(item.id);
                        }
                      }}
                    >
                      <CheckCircleIcon size={14} color="#10B981" />
                      <span>Mark as Read</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="notif-dismiss-btn notif-delete-btn"
                  title="Delete notification"
                  aria-label="Delete notification"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDismissNotification) {
                      onDismissNotification(item.id);
                    } else {
                      sharedDatabase.deleteNotification(item.id);
                    }
                  }}
                >
                  <TrashIcon size={15} />
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
