import React, { useState } from 'react';
import {
  BellIcon,
  CheckCircleIcon,
  XIcon,
  BookOpenIcon,
  UserPlusIcon,
  SettingsIcon,
  FlameIcon
} from './Icons';

export const AdminNotificationsView = ({
  notifications = [],
  onMarkRead,
  onMarkAllRead
}) => {
  const [filter, setFilter] = useState('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return n.unread;
    return n.category === filter;
  });

  const getNotificationIcon = (category) => {
    switch (category) {
      case 'user':
        return <UserPlusIcon size={18} color="#3B82F6" />;
      case 'quiz':
        return <BookOpenIcon size={18} color="#10B981" />;
      case 'warning':
        return <FlameIcon size={18} color="#EF4444" />;
      case 'system':
      default:
        return <BellIcon size={18} color="#8B5CF6" />;
    }
  };

  return (
    <div className="admin-management-container">
      <div className="management-header">
        <div>
          <h1 className="management-title">Notifications Center</h1>
          <p className="management-subtitle">
            System alerts, institutional onboarding events, and real-time quiz activity
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="admin-secondary-btn" onClick={onMarkAllRead}>
            <CheckCircleIcon size={16} color="#6366F1" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-filter-tabs">
        {['all', 'unread', 'user', 'quiz', 'system'].map((f) => (
          <button
            key={f}
            className={`notif-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="notifications-list-card">
        {filtered.length === 0 ? (
          <div className="table-empty-cell" style={{ padding: '48px 20px' }}>
            No notifications in this category.
          </div>
        ) : (
          filtered.map((notif) => (
            <div
              key={notif.id}
              className={`notif-card-item ${notif.unread ? 'unread' : ''}`}
              onClick={() => onMarkRead(notif.id)}
            >
              <div className="notif-item-icon-box">
                {getNotificationIcon(notif.category)}
              </div>
              <div className="notif-item-content">
                <div className="notif-item-header">
                  <span className="notif-item-title">{notif.title}</span>
                  <span className="notif-item-time">{notif.timestamp || 'Today'}</span>
                </div>
                <p className="notif-item-message">{notif.message}</p>
              </div>
              {notif.unread && (
                <div className="notif-unread-dot" title="Unread notification" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsView;
