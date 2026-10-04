import React, { useState } from 'react';
import {
  SearchIcon,
  FilterIcon,
  TrashIcon,
  UserPlusIcon,
  XIcon,
  CheckCircleIcon,
  TrophyIcon,
  BookOpenIcon,
  ClockIcon,
  EditIcon
} from './Icons';
import sharedDatabase from '../services/sharedDatabase';

export const AdminUserManagementView = ({
  users = [],
  onToggleStatus,
  onDeleteUser,
  onOpenAddUser,
  onUserUpdated
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('joined');
  const [selectedUser, setSelectedUser] = useState(null); // For details modal

  const rawUsers = Array.isArray(users) && users.length > 0 ? users : (typeof sharedDatabase?.getUsers === 'function' ? sharedDatabase.getUsers() : []);

  // Filtering & Sorting
  const filteredUsers = rawUsers.filter((u) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      (u.studentId && u.studentId.toLowerCase().includes(q)) ||
      (u.educatorId && u.educatorId.toLowerCase().includes(q));

    const matchRole =
      roleFilter === 'all' || u.role?.toLowerCase() === roleFilter.toLowerCase();

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.isActive !== false) ||
      (statusFilter === 'inactive' && u.isActive === false);

    return matchSearch && matchRole && matchStatus;
  });

  // Sort
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'role') return a.role.localeCompare(b.role);
    if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
    return 0; // Default joined order
  });

  return (
    <div className="admin-management-container">
      {/* Top Banner */}
      <div className="management-header">
        <div>
          <h1 className="management-title">User Management</h1>
          <p className="management-subtitle">
            Manage and track all students, educators, and system administrators
          </p>
        </div>
        <button className="admin-primary-btn" onClick={onOpenAddUser}>
          <UserPlusIcon size={18} color="#FFFFFF" />
          <span>Add User</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        {/* Search */}
        <div className="filter-search-box">
          <SearchIcon size={17} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Role Filter */}
        <div className="filter-select-group">
          <label>Role:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="educator">Educators</option>
            <option value="admin">Administrators</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="filter-select-group">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Sort Filter */}
        <div className="filter-select-group">
          <label>Sort By:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="joined">Recently Joined</option>
            <option value="name">Name (A-Z)</option>
            <option value="role">Role</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* User Statistics Ribbon */}
      <div className="user-stats-ribbon">
        <div className="stat-pill">
          <span className="stat-pill-label">Total Registered</span>
          <span className="stat-pill-val">{rawUsers.length}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Active Students</span>
          <span className="stat-pill-val">
            {rawUsers.filter((u) => u.role?.toLowerCase() === 'student' && u.isActive !== false).length}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Educator Faculty</span>
          <span className="stat-pill-val">
            {rawUsers.filter((u) => u.role?.toLowerCase() === 'educator').length}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Inactive</span>
          <span className="stat-pill-val">
            {rawUsers.filter((u) => u.isActive === false).length}
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th>Last Active</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty-cell">
                    No users match your current search and filter criteria.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((u) => {
                  const isActive = u.isActive !== false;
                  return (
                    <tr key={u.id} className="admin-table-row">
                      {/* Name & Avatar */}
                      <td>
                        <div
                          className="user-cell clickable"
                          onClick={() => setSelectedUser(u)}
                          title="Click to view detailed profile"
                        >
                          <div className={`user-avatar-sm role-${u.role?.toLowerCase()}`}>
                            {u.avatarInitials || u.name?.slice(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="user-name-link">{u.name}</div>
                            <div className="user-sub-email">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td>
                        <span className={`role-pill role-${u.role?.toLowerCase()}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td>
                        <span className="user-joined-text">{u.joinedDate || '2025'}</span>
                      </td>

                      {/* Last Active */}
                      <td>
                        <span className="user-last-active">{u.lastActive || 'Today'}</span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-action-btns">
                          {/* View details */}
                          <button
                            className="btn-icon-subtle"
                            title="View Profile & Analytics"
                            onClick={() => setSelectedUser(u)}
                          >
                            <EditIcon size={16} color="#6366F1" />
                          </button>

                          {/* Toggle Active / Deactivate */}
                          {u.role?.toLowerCase() !== 'admin' && (
                            <button
                              className={`btn-status-toggle ${isActive ? 'deactivate' : 'activate'}`}
                              title={isActive ? 'Deactivate account' : 'Reactivate account'}
                              onClick={() => onToggleStatus(u.id, u.role)}
                            >
                              {isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}

                          {/* Delete */}
                          {u.role?.toLowerCase() !== 'admin' && (
                            <button
                              className="btn-icon-danger"
                              title="Delete user"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to remove ${u.name}?`)) {
                                  onDeleteUser(u.id, u.role);
                                }
                              }}
                            >
                              <TrashIcon size={16} color="#EF4444" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal (Student or Educator) */}
      {selectedUser && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-group">
                <div className={`modal-user-avatar role-${selectedUser.role?.toLowerCase()}`}>
                  {selectedUser.avatarInitials || 'U'}
                </div>
                <div>
                  <h3 className="modal-user-name">{selectedUser.name}</h3>
                  <span className={`role-pill role-${selectedUser.role?.toLowerCase()}`}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedUser(null)}>
                <XIcon size={20} color="#64748B" />
              </button>
            </div>

            <div className="admin-modal-body">
              {/* Common User Info */}
              <div className="profile-detail-grid">
                <div className="profile-field">
                  <label>Email Address</label>
                  <span>{selectedUser.email}</span>
                </div>
                <div className="profile-field">
                  <label>{selectedUser.role === 'Educator' ? 'Educator ID' : 'Student ID'}</label>
                  <span>{selectedUser.educatorId || selectedUser.studentId || 'LS-2025-ADMIN'}</span>
                </div>
                <div className="profile-field">
                  <label>Account Status</label>
                  <span className={`status-badge ${selectedUser.isActive !== false ? 'active' : 'inactive'}`}>
                    {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="profile-field">
                  <label>Registration Date</label>
                  <span>{selectedUser.joinedDate || '15 Aug 2025'}</span>
                </div>
                <div className="profile-field">
                  <label>Last Active</label>
                  <span>{selectedUser.lastActive || 'Today'}</span>
                </div>
              </div>

              {/* Student Specific Analytics */}
              {selectedUser.role === 'Student' && (
                <div className="profile-analytics-section">
                  <h4 className="analytics-section-heading">Student Performance & Tracking</h4>
                  <div className="metrics-strip">
                    <div className="metric-box">
                      <span className="metric-val">{selectedUser.quizzesCompleted || 18}</span>
                      <span className="metric-lbl">Quizzes Attempted</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-val">{selectedUser.quizzesCompleted || 18}</span>
                      <span className="metric-lbl">Completed</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-val">{selectedUser.avgScore ? `${selectedUser.avgScore}%` : '85.4%'}</span>
                      <span className="metric-lbl">Average Score</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-val">{selectedUser.highestScore ? `${selectedUser.highestScore}%` : '96%'}</span>
                      <span className="metric-lbl">Highest Score</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-val">92%</span>
                      <span className="metric-lbl">Completion Rate</span>
                    </div>
                  </div>

                  <h5 className="sub-heading">Recent Quiz Activity</h5>
                  <div className="recent-activity-list">
                    {(selectedUser.raw?.recentSubmissions || [
                      { title: 'Python Basics & Logic', score: '92%', status: 'Completed', date: '28 Sep 2025' },
                      { title: 'Data Structures Mastery', score: '88%', status: 'Completed', date: '25 Sep 2025' },
                      { title: 'Cyber Security Essentials', score: '76%', status: 'Completed', date: '20 Sep 2025' }
                    ]).map((act, i) => (
                      <div key={i} className="activity-item-row">
                        <div className="activity-title-cell">
                          <BookOpenIcon size={16} color="#6366F1" />
                          <span>{act.title}</span>
                        </div>
                        <span className="activity-score">{act.score}</span>
                        <span className="status-badge active">{act.status}</span>
                        <span className="activity-date">{act.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Educator Specific Analytics */}
              {selectedUser.role === 'Educator' && (
                <div className="profile-analytics-section">
                  <h4 className="analytics-section-heading">Educator Activity & Track Record</h4>
                  <div className="metrics-strip">
                    <div className="metric-box">
                      <span className="metric-val">{selectedUser.quizzesCreated || 14}</span>
                      <span className="metric-lbl">Quizzes Created</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-val">11</span>
                      <span className="metric-lbl">Active Quizzes</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-val">{selectedUser.totalStudents || 240}</span>
                      <span className="metric-lbl">Students Reached</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-val">84.2%</span>
                      <span className="metric-lbl">Avg Student Score</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-val">4.9 / 5.0</span>
                      <span className="metric-lbl">Rating</span>
                    </div>
                  </div>

                  <div className="educator-institution-info">
                    <p><strong>Department:</strong> {selectedUser.department || 'Computer Science'}</p>
                    <p><strong>Institution:</strong> LearnSmart Adaptive Quiz Academy</p>
                  </div>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button className="admin-secondary-btn" onClick={() => setSelectedUser(null)}>
                Close
              </button>
              {selectedUser.role !== 'Admin' && (
                <button
                  className={`admin-status-action-btn ${selectedUser.isActive !== false ? 'btn-warn' : 'btn-success'}`}
                  onClick={() => {
                    onToggleStatus(selectedUser.id, selectedUser.role);
                    setSelectedUser({
                      ...selectedUser,
                      isActive: selectedUser.isActive === false
                    });
                  }}
                >
                  {selectedUser.isActive !== false ? 'Deactivate Account' : 'Reactivate Account'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagementView;
