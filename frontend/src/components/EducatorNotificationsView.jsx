import React, { useState, useMemo } from 'react';
import {
  BellIcon,
  CheckCircleIcon,
  CheckIcon,
  StarIcon,
  TrashIcon,
  SendIcon,
  SearchIcon,
  XIcon,
  UserIcon,
  FilterIcon
} from './Icons';
import { sharedDatabase, getInitials } from '../services/sharedDatabase';

export const EducatorNotificationsView = ({
  notifications = [],
  onUpdateNotifications,
  students = [],
  educatorName = 'Educator',
  showToast,
  onNavigateToTab
}) => {
  const [filter, setFilter] = useState('all');

  // Selected Notification IDs on the main page for batch actions
  const [selectedNotifIds, setSelectedNotifIds] = useState([]);

  // Modal State for Sending Notification
  const [openSendModal, setOpenSendModal] = useState(false);
  const [sendToAllStudents, setSendToAllStudents] = useState(true);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationCategory, setNotificationCategory] = useState('announcement');
  const [notificationPriority, setNotificationPriority] = useState('normal');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Cohort Students (from prop or sharedDatabase fallback)
  const cohortStudents = useMemo(() => {
    if (Array.isArray(students) && students.length > 0) {
      return students;
    }
    return sharedDatabase.getStudents();
  }, [students]);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const sentCount = notifications.filter((n) => n.category === 'sent').length;

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return item.unread;
    if (filter === 'submission') return item.category === 'submission';
    if (filter === 'review') return item.category === 'review';
    if (filter === 'alert') return item.category === 'alert';
    if (filter === 'sent') return item.category === 'sent';
    return true;
  });

  // Main Page: Select All Notifications logic
  const allNotificationsSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((n) => selectedNotifIds.includes(n.id));

  const handleToggleSelectAllNotifications = () => {
    if (allNotificationsSelected) {
      const visibleSet = new Set(filteredNotifications.map((n) => n.id));
      setSelectedNotifIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      const newSet = new Set([...selectedNotifIds, ...filteredNotifications.map((n) => n.id)]);
      setSelectedNotifIds(Array.from(newSet));
    }
  };

  const handleToggleNotification = (id) => {
    setSelectedNotifIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleMarkSelectedRead = () => {
    if (selectedNotifIds.length === 0) return;
    const selectedSet = new Set(selectedNotifIds);
    const updated = notifications.map((n) =>
      selectedSet.has(n.id) ? { ...n, unread: false } : n
    );
    onUpdateNotifications(updated);
    setSelectedNotifIds([]);
    if (showToast) showToast('Selected notifications marked as read.');
  };

  const handleDeleteSelected = () => {
    if (selectedNotifIds.length === 0) return;
    const selectedSet = new Set(selectedNotifIds);
    const updated = notifications.filter((n) => !selectedSet.has(n.id));
    onUpdateNotifications(updated);
    setSelectedNotifIds([]);
    if (showToast) showToast('Selected notifications deleted.');
  };

  // Quick Preset Templates
  const handleApplyPreset = (type) => {
    if (type === 'quiz') {
      setNotificationTitle('Upcoming Quiz: Adaptive Python & Logic');
      setNotificationCategory('quiz');
      setNotificationPriority('normal');
      setNotificationMessage(
        'Please ensure you have completed your scheduled module attempt. Detailed feedback and performance analytics will be published right after completion.'
      );
    } else if (type === 'support') {
      setNotificationTitle('Study Check-in & Additional Resources');
      setNotificationCategory('alert');
      setNotificationPriority('high');
      setNotificationMessage(
        'I noticed some challenges in the latest quiz topics. Supplemental practice modules and dedicated office hours are open to help you succeed!'
      );
    } else if (type === 'praise') {
      setNotificationTitle('Commendation: Outstanding Mastery & Consistency');
      setNotificationCategory('feedback');
      setNotificationPriority('normal');
      setNotificationMessage(
        'Fantastic performance on your recent quizzes! Your mastery of algorithmic problem solving is truly impressive. Keep up the high standard!'
      );
    } else if (type === 'announcement') {
      setNotificationTitle('Course Cohort Announcement');
      setNotificationCategory('announcement');
      setNotificationPriority('normal');
      setNotificationMessage(
        'New adaptive quizzes and practice modules have been published. Please check your Learning Path tab and complete the exercises this week.'
      );
    }
  };

  // Send Notification Handler
  const handleSendNotification = (e) => {
    if (e) e.preventDefault();

    if (!sendToAllStudents) {
      if (showToast) showToast('⚠️ Please select All Students to send the notification.');
      return;
    }
    if (!notificationTitle.trim()) {
      if (showToast) showToast('⚠️ Please enter a notification title.');
      return;
    }
    if (!notificationMessage.trim()) {
      if (showToast) showToast('⚠️ Please enter your notification message.');
      return;
    }

    setIsSubmitting(true);

    try {
      const targetStudentNames = cohortStudents.map((s) => s.name);

      // Send to shared student notifications
      sharedDatabase.sendStudentNotification({
        title: notificationTitle.trim(),
        message: notificationMessage.trim(),
        category: notificationCategory,
        priority: notificationPriority,
        targetStudentIds: 'all',
        targetStudentNames,
        educatorName
      });

      // Record in educator notifications log
      const recipientSummary = 'All Students';

      const newEducatorEntry = {
        id: `sent-${Date.now()}`,
        title: `Sent: ${notificationTitle.trim()}`,
        message: `Delivered to ${recipientSummary}: "${notificationMessage.trim()}"`,
        category: 'sent',
        timestamp: 'Just now',
        unread: false,
        priority: notificationPriority,
        recipientCount: cohortStudents.length > 0 ? cohortStudents.length : 'All',
        recipients: targetStudentNames
      };

      onUpdateNotifications([newEducatorEntry, ...notifications]);

      if (showToast) {
        showToast('✅ Notification successfully sent to All Students!');
      }

      // Reset modal fields & close
      setNotificationTitle('');
      setNotificationMessage('');
      setNotificationCategory('announcement');
      setNotificationPriority('normal');
      setOpenSendModal(false);
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to send notification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, unread: false }));
    onUpdateNotifications(updated);
    if (showToast) showToast('All educator notifications marked as read.');
  };

  const handleClearAll = () => {
    onUpdateNotifications([]);
    setSelectedNotifIds([]);
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
    setSelectedNotifIds((prev) => prev.filter((item) => item !== id));
    if (showToast) showToast('Notification dismissed.');
  };

  const handleActionClick = (notif) => {
    if (notif.category === 'submission' || notif.category === 'review') {
      if (onNavigateToTab) onNavigateToTab('Student Performance');
    } else if (notif.category === 'alert') {
      if (onNavigateToTab) onNavigateToTab('Analytics');
    } else if (notif.category === 'sent') {
      if (onNavigateToTab) onNavigateToTab('Student Performance');
    }
  };

  return (
    <div className="educator-section-view">
      {/* Header Row with Send Notification button */}
      <div className="educator-section-header-row">
        <div>
          <h1 className="educator-section-title">Educator Notifications</h1>
          <p className="educator-section-subtitle">
            Submission alerts, evaluation requests, student alerts, and broadcast messaging.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Send Notification Button with Send Icon */}
          <button
            type="button"
            className="educator-primary-btn"
            id="send-notification-btn"
            onClick={() => {
              setSendToAllStudents(true);
              setOpenSendModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <SendIcon size={16} color="#FFFFFF" />
            <span>Send Notification</span>
          </button>

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
      <div className="educator-filter-toolbar" style={{ marginBottom: '14px' }}>
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
          <button
            type="button"
            className={`educator-time-pill ${filter === 'sent' ? 'active' : ''}`}
            onClick={() => setFilter('sent')}
          >
            Sent to Students ({sentCount})
          </button>
        </div>
      </div>

      {/* Select All Checkbox Toolbar on Educator Notifications Page */}
      {filteredNotifications.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label
              htmlFor="select-all-notifications-checkbox"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
                margin: 0
              }}
            >
              <input
                type="checkbox"
                id="select-all-notifications-checkbox"
                checked={allNotificationsSelected}
                onChange={handleToggleSelectAllNotifications}
                className="educator-custom-checkbox"
              />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                Select All
              </span>
            </label>

            {selectedNotifIds.length > 0 && (
              <span style={{ fontSize: '0.80rem', color: '#10B981', fontWeight: 600 }}>
                ({selectedNotifIds.length} of {filteredNotifications.length} selected)
              </span>
            )}
          </div>

          {selectedNotifIds.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="educator-secondary-btn sm"
                onClick={handleMarkSelectedRead}
              >
                Mark Selected as Read
              </button>
              <button
                type="button"
                className="educator-secondary-btn sm"
                style={{ color: '#DC2626', borderColor: '#FECACA' }}
                onClick={handleDeleteSelected}
              >
                Delete Selected ({selectedNotifIds.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => {
            const isSelected = selectedNotifIds.includes(notif.id);

            return (
              <div
                key={notif.id}
                className="educator-content-card"
                style={{
                  padding: '16px 20px',
                  borderLeft: notif.category === 'sent'
                    ? '4px solid #3B82F6'
                    : notif.unread
                    ? '4px solid #10B981'
                    : '1px solid #E2E8F0',
                  backgroundColor: isSelected
                    ? '#F0FDF4'
                    : notif.unread
                    ? '#FFFFFF'
                    : '#FAFAFC',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                  {/* Checkbox for selecting notification */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleNotification(notif.id)}
                    className="educator-custom-checkbox"
                    style={{ marginTop: '10px' }}
                    title="Select notification"
                    aria-label={`Select notification ${notif.title}`}
                  />

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
                          : notif.category === 'sent'
                          ? '#EFF6FF'
                          : '#F1F5F9',
                      color:
                        notif.category === 'submission'
                          ? '#10B981'
                          : notif.category === 'review'
                          ? '#2563EB'
                          : notif.category === 'alert'
                          ? '#DC2626'
                          : notif.category === 'sent'
                          ? '#2563EB'
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
                    ) : notif.category === 'sent' ? (
                      <SendIcon size={18} color="#2563EB" />
                    ) : (
                      <BellIcon size={20} color="#2563EB" />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
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
                      {notif.category === 'sent' && (
                        <span className="educator-status-pill info" style={{ fontSize: '0.70rem' }}>
                          Sent to {notif.recipientCount || 'Students'}
                        </span>
                      )}
                      {notif.priority === 'high' && (
                        <span className="educator-status-pill warning" style={{ fontSize: '0.70rem' }}>
                          High Priority
                        </span>
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
                    {notif.category === 'sent' ? 'View Cohort' : 'View Details'}
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
            );
          })
        ) : (
          <div className="educator-empty-state-card">
            <BellIcon size={42} color="#94A3B8" />
            <h3>No Notifications</h3>
            <p>You have caught up with all notifications in this category.</p>
          </div>
        )}
      </div>

      {/* =========================================================================
          SEND NOTIFICATION MODAL WITH ALL STUDENTS LIST & SELECT ALL CHECKBOX
          ========================================================================= */}
      {openSendModal && (
        <div
          className="educator-modal-overlay"
          onClick={() => setOpenSendModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-notification-title"
        >
          <div
            className="educator-send-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="educator-send-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: '#ECFDF5',
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #A7F3D0'
                  }}
                >
                  <SendIcon size={20} color="#10B981" />
                </div>
                <div>
                  <h2
                    id="send-notification-title"
                    style={{ margin: 0, fontSize: '1.18rem', fontWeight: 700, color: '#0F172A' }}
                  >
                    Send Notification
                  </h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                    Select enrolled students and dispatch reminders, alerts, or announcements.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setOpenSendModal(false)}
                title="Close modal"
              >
                <XIcon size={18} color="#64748B" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="educator-send-modal-body">
              {/* Quick Preset Templates */}
              <div>
                <label className="educator-field-label">Quick Template Presets</label>
                <div className="educator-preset-chips">
                  <button
                    type="button"
                    className="educator-preset-btn"
                    onClick={() => handleApplyPreset('quiz')}
                  >
                    📝 Quiz Reminder
                  </button>
                  <button
                    type="button"
                    className="educator-preset-btn"
                    onClick={() => handleApplyPreset('support')}
                  >
                    ⚠️ Study Support
                  </button>
                  <button
                    type="button"
                    className="educator-preset-btn"
                    onClick={() => handleApplyPreset('praise')}
                  >
                    🌟 Praise & Commendation
                  </button>
                  <button
                    type="button"
                    className="educator-preset-btn"
                    onClick={() => handleApplyPreset('announcement')}
                  >
                    📢 Cohort Announcement
                  </button>
                </div>
              </div>

              {/* SECTION: ALL STUDENTS CHECKBOX ONLY */}
              <div>
                <label className="educator-field-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Select Recipients
                </label>

                <label
                  htmlFor="select-all-students-modal-checkbox"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: sendToAllStudents ? '#ECFDF5' : '#F8FAFC',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: sendToAllStudents ? '1px solid #10B981' : '1px solid #CBD5E1',
                    width: '100%',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    id="select-all-students-modal-checkbox"
                    checked={sendToAllStudents}
                    onChange={(e) => setSendToAllStudents(e.target.checked)}
                    className="educator-custom-checkbox"
                  />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                    All Students
                  </span>
                </label>
              </div>

              {/* Notification Details Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label className="educator-field-label" htmlFor="notification-title-input">
                    Notification Title *
                  </label>
                  <input
                    id="notification-title-input"
                    type="text"
                    className="educator-text-input"
                    placeholder="e.g., Weekly Quiz Challenge: Advanced Python"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="educator-field-label" htmlFor="notification-category-select">
                    Category
                  </label>
                  <select
                    id="notification-category-select"
                    className="educator-text-input"
                    value={notificationCategory}
                    onChange={(e) => setNotificationCategory(e.target.value)}
                  >
                    <option value="announcement">📢 Announcement</option>
                    <option value="quiz">📝 Quiz Reminder</option>
                    <option value="alert">⚠️ Action Required</option>
                    <option value="feedback">🌟 Praise & Feedback</option>
                  </select>
                </div>
              </div>

              {/* Message Body */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="educator-field-label" htmlFor="notification-message-input">
                    Message Content *
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    {notificationMessage.length} characters
                  </span>
                </div>
                <textarea
                  id="notification-message-input"
                  className="educator-text-input"
                  rows={4}
                  placeholder="Compose your notification message for the selected student(s)..."
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              {/* Priority Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span className="educator-field-label" style={{ margin: 0 }}>Priority Level:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="priority"
                    checked={notificationPriority === 'normal'}
                    onChange={() => setNotificationPriority('normal')}
                    accentColor="#10B981"
                  />
                  <span>Normal</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#DC2626', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="priority"
                    checked={notificationPriority === 'high'}
                    onChange={() => setNotificationPriority('high')}
                    accentColor="#DC2626"
                  />
                  <span>High / Urgent</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="educator-send-modal-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {sendToAllStudents ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '0.84rem', fontWeight: 600 }}>
                    <CheckCircleIcon size={16} color="#10B981" />
                    <span>Ready to send to All Students</span>
                  </div>
                ) : (
                  <span style={{ color: '#DC2626', fontSize: '0.84rem', fontWeight: 600 }}>
                    ⚠️ Please select All Students
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="educator-secondary-btn"
                  onClick={() => setOpenSendModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="educator-primary-btn"
                  onClick={handleSendNotification}
                  disabled={
                    isSubmitting ||
                    !sendToAllStudents ||
                    !notificationTitle.trim() ||
                    !notificationMessage.trim()
                  }
                  style={{
                    opacity:
                      !sendToAllStudents ||
                      !notificationTitle.trim() ||
                      !notificationMessage.trim()
                        ? 0.55
                        : 1,
                    cursor:
                      !sendToAllStudents ||
                      !notificationTitle.trim() ||
                      !notificationMessage.trim()
                        ? 'not-allowed'
                        : 'pointer'
                  }}
                >
                  <SendIcon size={15} color="#FFFFFF" />
                  <span>
                    {isSubmitting ? 'Sending...' : 'Send to All Students'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducatorNotificationsView;
