import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BellIcon, CheckCircleIcon, FlameIcon, StarIcon, TrophyIcon, TrashIcon } from './Icons';
import { sharedDatabase } from '../services/sharedDatabase';

const NOTIFICATION_EVENT = 'learnsmart_notifications_updated';
const POLL_INTERVAL = 30000;

/**
 * Keeps the notification list of a dashboard in sync with MySQL.
 *
 * The backend is the single source of truth: it scopes every notification to
 * the account that is signed in, so the admin, educator and student
 * dashboards all read the very same table.
 */
export const useServerNotifications = ({ pollInterval = POLL_INTERVAL } = {}) => {
  const [notifications, setNotifications] = useState(() => sharedDatabase.getNotifications());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await sharedDatabase.syncNotificationsFromBackend(true);
      if (Array.isArray(list)) setNotifications(list);
      return list;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const handleUpdate = (e) => {
      const detail = e?.detail;
      if (Array.isArray(detail)) setNotifications(detail);
      else setNotifications(sharedDatabase.getNotifications());
    };

    window.addEventListener(NOTIFICATION_EVENT, handleUpdate);
    const timer = pollInterval ? setInterval(refresh, pollInterval) : null;

    return () => {
      window.removeEventListener(NOTIFICATION_EVENT, handleUpdate);
      if (timer) clearInterval(timer);
    };
  }, [refresh, pollInterval]);

  const markRead = useCallback(async (id) => {
    const updated = await sharedDatabase.markNotificationRead(id);
    if (Array.isArray(updated)) setNotifications(updated);
  }, []);

  const markAllRead = useCallback(async () => {
    const updated = await sharedDatabase.markAllNotificationsRead();
    if (Array.isArray(updated)) setNotifications(updated);
  }, []);

  const remove = useCallback(async (id) => {
    const updated = await sharedDatabase.deleteNotification(id);
    if (Array.isArray(updated)) setNotifications(updated);
  }, []);

  const clearAll = useCallback(async () => {
    const current = sharedDatabase.getNotifications();
    for (const item of current) {
      // Sequential so the backend never receives parallel deletes for one row.
      // eslint-disable-next-line no-await-in-loop
      await sharedDatabase.deleteNotification(item.id);
    }
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
    remove,
    clearAll
  };
};

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

/**
 * The shared notification panel used by the admin, educator and student
 * dashboards. Every action is persisted in MySQL through the backend.
 */
export const NotificationCenter = ({
  notifications = [],
  loading = false,
  onMarkAllAsRead,
  onDismissNotification,
  onNotificationAction,
  title = 'Notification Center',
  subtitle = 'Everything the platform sent you, straight from the database.'
}) => {
  const [filter, setFilter] = useState('all');

  const filteredList = notifications.filter((item) => {
    if (filter === 'unread') return item.unread;
    if (filter === 'quiz') return item.category === 'quiz';
    if (filter === 'streak') return item.category === 'streak';
    return true;
  });

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="tab-view-container notifications-view">
      <div className="tab-view-header">
        <div>
          <h2 className="tab-page-title">{title}</h2>
          <p className="tab-page-subtitle">{subtitle}</p>
        </div>

        <div className="notifications-header-actions">
          {unreadCount > 0 && (
            <button type="button" className="mark-all-read-btn" onClick={onMarkAllAsRead}>
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
        {loading && notifications.length === 0 ? (
          <div className="no-notifications-empty">
            <BellIcon size={40} color="#94A3B8" />
            <p className="empty-title">Loading notifications…</p>
          </div>
        ) : filteredList.length > 0 ? (
          filteredList.map((item) => (
            <div
              key={item.id}
              className={`notif-item-row ${item.unread ? 'unread' : 'read'}`}
              onClick={() => onNotificationAction && onNotificationAction(item)}
            >
              <div className="notif-icon-circle">{getNotificationIcon(item.category)}</div>

              <div className="notif-content-col">
                <div className="notif-top-row">
                  <h4 className="notif-item-title">{item.title}</h4>
                </div>
                <p className="notif-item-message">{item.message}</p>
              </div>

              <div className="notif-item-actions">
                <span className="notif-timestamp">{item.timestamp || item.time || 'Just now'}</span>
                {item.unread && <span className="unread-dot" title="Unread notification" />}
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

export default NotificationCenter;
