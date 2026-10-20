import React, { useState } from 'react';
import {
  BellIcon,
  CheckCircleIcon,
  XIcon,
  BookOpenIcon,
  UserPlusIcon,
  SettingsIcon,
  FlameIcon,
  SendIcon,
  TrashIcon
} from './Icons';
import { sharedDatabase } from '../services/sharedDatabase';

export const AdminNotificationsView = ({
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onDeleteNotification,
  onClearAllNotifications,
  showToast,
  onRefresh
}) => {
  const [filter, setFilter] = useState('all');
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'announcement',
    priority: 'normal'
  });

  // Checkboxes State as requested:
  // 1. all(student & Educators)
  // 2. Educators
  // 3. students
  const [sendToAll, setSendToAll] = useState(false);
  const [sendToEducators, setSendToEducators] = useState(false);
  const [sendToStudents, setSendToStudents] = useState(false);

  // Checkbox Handlers
  const handleToggleAll = (e) => {
    const checked = e.target.checked;
    setSendToAll(checked);
    setSendToEducators(checked);
    setSendToStudents(checked);
  };

  const handleToggleEducators = (e) => {
    const checked = e.target.checked;
    setSendToEducators(checked);
    if (checked && sendToStudents) {
      setSendToAll(true);
    } else {
      setSendToAll(false);
    }
  };

  const handleToggleStudents = (e) => {
    const checked = e.target.checked;
    setSendToStudents(checked);
    if (checked && sendToEducators) {
      setSendToAll(true);
    } else {
      setSendToAll(false);
    }
  };

  const handleSendNotificationSubmit = (e) => {
    e.preventDefault();

    if (!sendToAll && !sendToEducators && !sendToStudents) {
      if (showToast) {
        showToast('Please select at least one recipient group: All, Educators, or students.');
      } else {
        alert('Please select at least one recipient group: All, Educators, or students.');
      }
      return;
    }

    if (!formData.title.trim()) {
      if (showToast) showToast('Please enter a notification title.');
      else alert('Please enter a notification title.');
      return;
    }

    if (!formData.message.trim()) {
      if (showToast) showToast('Please enter a notification message.');
      else alert('Please enter a notification message.');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      message: formData.message.trim(),
      category: formData.category,
      priority: formData.priority,
      sender: 'Administrator',
      educatorName: 'Administrator'
    };

    const broadcastId = `bcast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    let recipientSummary = '';

    // 1. Send to students if selected or All
    if (sendToAll || sendToStudents) {
      sharedDatabase.sendStudentNotification({
        title: payload.title,
        message: payload.message,
        category: payload.category,
        priority: payload.priority,
        educatorName: 'Administrator',
        broadcastId
      });
    }

    // 2. Send to Educators if selected or All
    if (sendToAll || sendToEducators) {
      sharedDatabase.sendEducatorNotification({
        title: payload.title,
        message: payload.message,
        category: payload.category,
        priority: payload.priority,
        sender: 'Administrator',
        broadcastId
      });
    }

    // Summary description for toast and admin notification log
    if (sendToAll || (sendToEducators && sendToStudents)) {
      recipientSummary = 'all(student & Educators)';
    } else if (sendToEducators) {
      recipientSummary = 'Educators';
    } else if (sendToStudents) {
      recipientSummary = 'students';
    }

    // 3. Log to Admin Notification Center
    sharedDatabase.sendAdminNotification({
      title: `Sent to ${recipientSummary}: ${payload.title}`,
      message: payload.message,
      category: payload.category,
      type: 'info',
      broadcastId,
      rawTitle: payload.title,
      targetAudience: recipientSummary
    });

    if (showToast) {
      showToast(`Notification sent successfully to ${recipientSummary}!`);
    }

    if (typeof onRefresh === 'function') {
      onRefresh();
    }

    // Reset form and close modal
    setFormData({
      title: '',
      message: '',
      category: 'announcement',
      priority: 'normal'
    });
    setSendToAll(false);
    setSendToEducators(false);
    setSendToStudents(false);
    setIsSendModalOpen(false);
  };

  const handleDeleteNotification = (notif) => {
    if (onDeleteNotification) {
      onDeleteNotification(notif);
    } else {
      sharedDatabase.deleteAdminNotification(notif);
      if (showToast) {
        showToast('Notification deleted successfully');
      }
      if (typeof onRefresh === 'function') {
        onRefresh();
      }
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all notifications? Any broadcast announcements sent to students or educators will also be removed.')) {
      if (onClearAllNotifications) {
        onClearAllNotifications();
      } else {
        sharedDatabase.clearAllAdminNotifications();
        if (showToast) {
          showToast('All notifications cleared successfully');
        }
        if (typeof onRefresh === 'function') {
          onRefresh();
        }
      }
    }
  };

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
      case 'announcement':
        return <SendIcon size={18} color="#059669" />;
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
            System alerts, institutional onboarding events, and real-time announcements
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Send notifications Button */}
          <button
            type="button"
            className="admin-primary-btn"
            onClick={() => setIsSendModalOpen(true)}
          >
            <SendIcon size={16} color="#FFFFFF" />
            <span>Send notifications</span>
          </button>

          <button
            type="button"
            className="admin-secondary-btn"
            onClick={onMarkAllRead}
          >
            <CheckCircleIcon size={16} color="#6366F1" />
            <span>Mark All as Read</span>
          </button>

          {notifications.length > 0 && (
            <button
              type="button"
              className="admin-secondary-btn danger"
              onClick={handleClearAll}
              title="Delete all notifications"
            >
              <TrashIcon size={16} color="#DC2626" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-filter-tabs">
        {['all', 'unread', 'announcement', 'user', 'quiz', 'system'].map((f) => (
          <button
            key={f}
            className={`notif-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'announcement' ? 'Announcements' : f.charAt(0).toUpperCase() + f.slice(1)}
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
              onClick={() => onMarkRead && onMarkRead(notif.id)}
            >
              <div className="notif-item-icon-box">
                {getNotificationIcon(notif.category)}
              </div>
              <div className="notif-item-content">
                <div className="notif-item-header">
                  <span className="notif-item-title">{notif.title}</span>
                  <span className="notif-item-time">{notif.timestamp || notif.date || 'Today'}</span>
                </div>
                <p className="notif-item-message">{notif.message}</p>
              </div>
              <div className="notif-item-actions" onClick={(e) => e.stopPropagation()}>
                {notif.unread && (
                  <div className="notif-unread-dot" title="Unread notification" />
                )}
                <button
                  type="button"
                  className="notif-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNotification(notif);
                  }}
                  title="Delete notification"
                  aria-label="Delete notification"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: Send Notifications Modal with Checkboxes */}
      {isSendModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsSendModalOpen(false)}>
          <div
            className="admin-modal-card"
            style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div className="modal-title-group">
                <div
                  className="quiz-category-tag-badge"
                  style={{ backgroundColor: '#EEF2FF', color: '#6C5CE7' }}
                >
                  <SendIcon size={20} color="currentColor" />
                </div>
                <div>
                  <h3 className="modal-title">Send Notifications</h3>
                  <span style={{ fontSize: '0.80rem', color: '#64748B' }}>
                    Broadcast announcements, institutional alerts, and notices
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsSendModalOpen(false)}
              >
                <XIcon size={20} color="#64748B" />
              </button>
            </div>

            <form onSubmit={handleSendNotificationSubmit}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Checkboxes Section:
                    1. all(student & Educators)
                    2. Educators
                    3. students */}
                <div className="notif-recipient-box">
                  <label className="notif-recipient-label">
                    Select Target Recipients *
                  </label>
                  <div className="notif-checkbox-group">
                    {/* Checkbox 1: all(student & Educators) */}
                    <label className={`notif-checkbox-item ${sendToAll ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={sendToAll}
                        onChange={handleToggleAll}
                      />
                      <span className="notif-checkbox-text">
                        1. all(student & Educators)
                      </span>
                      <span className="notif-checkbox-desc">
                        Broadcast to everyone
                      </span>
                    </label>

                    {/* Checkbox 2: Educators */}
                    <label className={`notif-checkbox-item ${sendToEducators ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={sendToEducators}
                        onChange={handleToggleEducators}
                      />
                      <span className="notif-checkbox-text">
                        2. Educators
                      </span>
                      <span className="notif-checkbox-desc">
                        Instructors and faculty
                      </span>
                    </label>

                    {/* Checkbox 3: students */}
                    <label className={`notif-checkbox-item ${sendToStudents ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={sendToStudents}
                        onChange={handleToggleStudents}
                      />
                      <span className="notif-checkbox-text">
                        3. students
                      </span>
                      <span className="notif-checkbox-desc">
                        Learners and enrolled students
                      </span>
                    </label>
                  </div>
                </div>

                {/* Title */}
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label>Notification Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Platform Maintenance Notice / Mid-Term Assessment Schedule"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Category & Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group" style={{ margin: 0 }}>
                    <label>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="announcement">Announcement</option>
                      <option value="system">System Alert</option>
                      <option value="quiz">Quiz Update</option>
                      <option value="warning">Important Reminder</option>
                    </select>
                  </div>

                  <div className="admin-form-group" style={{ margin: 0 }}>
                    <label>Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label>Notification Message *</label>
                  <textarea
                    rows="3"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #E2E8F0',
                      background: '#F8FAFC',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      color: '#0F172A',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                    placeholder="Enter the broadcast message for the selected recipients..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() => setIsSendModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-primary-btn"
                >
                  <SendIcon size={16} color="#FFFFFF" />
                  <span>Send Notification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationsView;
