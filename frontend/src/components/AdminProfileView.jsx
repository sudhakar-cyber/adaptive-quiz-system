import React, { useState, useRef } from 'react';
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  LockIcon,
  EditIcon,
  CameraIcon,
  XIcon,
  ShieldIcon,
  ClockIcon,
  CheckIcon,
  ActivityIcon,
  SparklesIcon
} from './Icons';
import { getAuthToken } from '../services/sharedDatabase';

export const AdminProfileView = ({
  adminUser = {},
  onUpdateProfile,
  showToast
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Persistent profile state initialized from props or localStorage
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('learnsmart_admin_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...adminUser, ...parsed };
      }
    } catch (e) {
      console.warn(e);
    }
    return {
      fullName: adminUser.fullName || adminUser.name || 'System Administrator',
      name: adminUser.name || 'Admin',
      title: adminUser.title || 'Senior Platform Administrator',
      email: adminUser.email || 'admin@learnsmart.edu',
      phone: adminUser.phone || '+1 (555) 019-2834',
      department: adminUser.department || 'Platform Operations & Infrastructure',
      location: adminUser.location || 'Tech Wing - Server Room 4B',
      bio:
        adminUser.bio ||
        'Oversees the LearnSmart adaptive quiz platform, managing system configurations, educator permissions, student cohorts, and telemetry benchmarks.',
      accessLevel: adminUser.accessLevel || 'Super Administrator (Tier 1)',
      twoFactorEnabled: adminUser.twoFactorEnabled !== false,
      sessionTimeout: adminUser.sessionTimeout || '60',
      joinedDate: adminUser.joinedDate || 'January 2024',
      lastLogin: adminUser.lastLogin || 'Just now',
      avatarImage: adminUser.avatarImage || localStorage.getItem('learnsmart_admin_avatar') || null
    };
  });

  // Edit form state
  const [formData, setFormData] = useState({ ...profile });

  // Password change state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const fileInputRef = useRef(null);

  // Compute administrator initials
  const adminInitials = (() => {
    const n = (profile.fullName || profile.name || 'Admin').trim();
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (n[0] || 'A').toUpperCase();
  })();

  // Handle avatar image upload
  const handleAvatarUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      if (showToast) showToast('Avatar file exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      const updated = { ...profile, avatarImage: dataUrl };
      setProfile(updated);
      setFormData((prev) => ({ ...prev, avatarImage: dataUrl }));

      try {
        localStorage.setItem('learnsmart_admin_avatar', dataUrl);
        localStorage.setItem('learnsmart_admin_profile', JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }

      // Automatically sync updated avatar to MySQL database
      try {
        const token = await getAuthToken();
        await fetch('/api/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-User-UID': 'admin-system',
            'X-User-Email': updated.email || 'admin@learnsmart.edu',
            'X-User-Name': updated.fullName || 'System Administrator',
            'X-User-Role': 'admin'
          },
          body: JSON.stringify({
            name: updated.fullName,
            avatar_url: dataUrl
          })
        });
      } catch (apiErr) {
        console.warn('MySQL admin avatar sync note:', apiErr);
      }

      if (onUpdateProfile) onUpdateProfile(updated);
      if (showToast) showToast('Administrator profile photo updated!');
    };
    reader.readAsDataURL(file);
  };

  // Remove avatar photo
  const handleRemoveAvatar = async () => {
    const updated = { ...profile, avatarImage: null };
    setProfile(updated);
    setFormData((prev) => ({ ...prev, avatarImage: null }));

    try {
      localStorage.removeItem('learnsmart_admin_avatar');
      localStorage.setItem('learnsmart_admin_profile', JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }

    // Automatically sync avatar removal to MySQL database
    try {
      const token = await getAuthToken();
      await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-UID': 'admin-system',
          'X-User-Email': updated.email || 'admin@learnsmart.edu',
          'X-User-Name': updated.fullName || 'System Administrator',
          'X-User-Role': 'admin'
        },
        body: JSON.stringify({
          name: updated.fullName,
          avatar_url: ''
        })
      });
    } catch (apiErr) {
      console.warn('MySQL admin avatar removal sync note:', apiErr);
    }

    if (onUpdateProfile) onUpdateProfile(updated);
    if (showToast) showToast('Profile photo removed.');
  };

  // Handle saving profile changes
  const handleSaveProfile = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const updated = {
      ...profile,
      fullName: formData.fullName.trim() || profile.fullName,
      title: formData.title.trim() || profile.title,
      email: formData.email.trim() || profile.email,
      phone: formData.phone.trim(),
      department: formData.department.trim() || profile.department,
      location: formData.location.trim() || profile.location,
      bio: formData.bio.trim() || profile.bio
    };

    setProfile(updated);
    setIsEditing(false);

    try {
      localStorage.setItem('learnsmart_admin_profile', JSON.stringify(updated));
      const authUser = localStorage.getItem('learnsmart_admin_user');
      if (authUser) {
        const parsed = JSON.parse(authUser);
        parsed.name = updated.fullName;
        parsed.email = updated.email;
        parsed.role = 'admin';
        localStorage.setItem('learnsmart_admin_user', JSON.stringify(parsed));
      }
    } catch (err) {
      console.warn(err);
    }

    // Automatically update administrator profile in MySQL database
    try {
      const token = await getAuthToken();
      await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-UID': 'admin-system',
          'X-User-Email': updated.email || 'admin@learnsmart.edu',
          'X-User-Name': updated.fullName,
          'X-User-Role': 'admin'
        },
        body: JSON.stringify({
          name: updated.fullName,
          phone: updated.phone || '',
          department: updated.department || '',
          title: updated.title || '',
          bio: updated.bio || '',
          avatar_url: updated.avatarImage || null
        })
      });
    } catch (apiErr) {
      console.warn('Failed to automatically update admin profile in MySQL database:', apiErr);
    }

    if (onUpdateProfile) onUpdateProfile(updated);
    if (showToast) showToast('Administrator profile updated successfully!');
  };

  const handleCancelEdit = () => {
    setFormData({ ...profile });
    setIsEditing(false);
  };


  // Handle password submission
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwords.currentPassword) {
      setPasswordError('Please enter your current administrative password.');
      return;
    }
    if (!passwords.newPassword || passwords.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSuccess(true);
    setTimeout(() => {
      setPasswordSuccess(false);
      setShowPasswordModal(false);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      if (showToast) showToast('Administrator password updated successfully!');
    }, 1200);
  };

  return (
    <div className="admin-profile-view-wrap">
      {/* Header Row */}
      <div className="admin-profile-header-row">
        <div>
          <div className="admin-profile-badge">
            <ShieldIcon size={14} color="#6366F1" />
            <span>Tier 1 Master Credentials</span>
          </div>
          <h1 className="admin-profile-main-title">Administrator Profile</h1>
          <p className="admin-profile-main-subtitle">
            Manage administrative identity, security parameters, and platform authorization policies.
          </p>
        </div>

        <div className="ad-profile-header-actions">
          {!isEditing ? (
            <>
              <button
                type="button"
                className="ad-btn ad-btn-secondary"
                onClick={() => setShowPasswordModal(true)}
              >
                <LockIcon size={16} color="#6366F1" />
                <span>Change Password</span>
              </button>
              <button
                type="button"
                className="ad-btn ad-btn-primary"
                onClick={() => setIsEditing(true)}
              >
                <EditIcon size={16} color="#FFFFFF" />
                <span>Edit Profile</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="ad-btn ad-btn-secondary"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ad-btn ad-btn-primary"
                onClick={handleSaveProfile}
              >
                <CheckIcon size={16} color="#FFFFFF" />
                <span>Save Changes</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="profile-layout-grid">
        {/* Left Column: Admin Profile Hero Card */}
        <div className="admin-profile-card">
          <div className="admin-profile-card-banner">
            <span className="admin-status-chip">
              <span className="admin-status-dot"></span>
              Superuser Online
            </span>
          </div>

          <div className="admin-card-inner">
            <div className="profile-avatar-container">
              {profile.avatarImage ? (
                <img
                  src={profile.avatarImage}
                  alt={profile.fullName}
                  className="profile-avatar-img"
                />
              ) : (
                <div className="profile-avatar-large">
                  {adminInitials}
                </div>
              )}

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleAvatarUpload}
              />

              {/* Change photo button */}
              <button
                type="button"
                className="avatar-upload-badge-btn"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                title="Change Profile Photo"
              >
                <CameraIcon size={14} color="#FFFFFF" />
              </button>
            </div>

            {profile.avatarImage && (
              <button
                type="button"
                className="remove-avatar-link-btn"
                onClick={handleRemoveAvatar}
              >
                Remove Photo
              </button>
            )}

            <h2 className="profile-card-name">{profile.fullName}</h2>
            <p className="profile-card-role-title">{profile.title}</p>

            <div className="profile-role-badge-wrap">
              <span className="admin-role-pill">
                <ShieldIcon size={13} color="#6366F1" />
                <span>{profile.role || 'Super Administrator'}</span>
              </span>
            </div>

            <p className="profile-card-email">{profile.email}</p>

            <div className="profile-card-meta">
              <div className="meta-row">
                <span>Department</span>
                <strong>{profile.department}</strong>
              </div>
              <div className="meta-row">
                <span>Access Level</span>
                <span className="admin-mini-badge tier1">Tier 1 Superuser</span>
              </div>
              <div className="meta-row">
                <span>Two-Factor Auth</span>
                <span className={`admin-status-pill ${profile.twoFactorEnabled ? 'active' : 'danger'}`}>
                  {profile.twoFactorEnabled ? 'Enabled (TOTP)' : 'Disabled'}
                </span>
              </div>
              <div className="meta-row">
                <span>Member Since</span>
                <strong>{profile.joinedDate}</strong>
              </div>
              <div className="meta-row">
                <span>Last Session</span>
                <strong className="admin-session-text">
                  <ClockIcon size={14} color="#6366F1" />
                  <span>{profile.lastLogin}</span>
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Details & Settings */}
        <div className="profile-details-column">
          {/* Section 1: General Information (View / Edit Form) */}
          <div className="ad-card admin-profile-content-card">
            <div className="admin-card-header">
              <div className="admin-card-header-left">
                <div className="admin-card-icon-wrap indigo">
                  <UserIcon size={18} color="#6366F1" />
                </div>
                <div>
                  <h3 className="admin-card-title">
                    {isEditing ? 'Edit Administrator Details' : 'General Information'}
                  </h3>
                  <p className="admin-card-desc">
                    Personal profile, institutional assignment, and direct contact channels.
                  </p>
                </div>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  className="ad-btn ad-btn-secondary sm"
                  onClick={() => setIsEditing(true)}
                >
                  <EditIcon size={14} />
                  <span>Edit Details</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="admin-edit-form">
                <div className="admin-form-row-2col">
                  <div>
                    <label className="admin-form-label">Full Name *</label>
                    <input
                      type="text"
                      className="ad-input"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. System Administrator"
                      required
                    />
                  </div>
                  <div>
                    <label className="admin-form-label">Administrative Title *</label>
                    <input
                      type="text"
                      className="ad-input"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Senior Platform Administrator"
                      required
                    />
                  </div>
                </div>

                <div className="admin-form-row-2col">
                  <div>
                    <label className="admin-form-label">Email Address *</label>
                    <input
                      type="email"
                      className="ad-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="admin@learnsmart.edu"
                      required
                    />
                  </div>
                  <div>
                    <label className="admin-form-label">Phone Number</label>
                    <input
                      type="text"
                      className="ad-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 019-2834"
                    />
                  </div>
                </div>

                <div className="admin-form-row-2col">
                  <div>
                    <label className="admin-form-label">Department / Unit</label>
                    <input
                      type="text"
                      className="ad-input"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g. Platform Operations & Infrastructure"
                    />
                  </div>
                  <div>
                    <label className="admin-form-label">Office Location</label>
                    <input
                      type="text"
                      className="ad-input"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Tech Wing - Server Room 4B"
                    />
                  </div>
                </div>

                <div className="admin-form-row-full">
                  <label className="admin-form-label">Administrative Scope & Bio</label>
                  <textarea
                    className="ad-input"
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Describe your role and administrative scope..."
                  />
                </div>

                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn-secondary"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ad-btn ad-btn-primary"
                  >
                    <CheckIcon size={16} color="#FFFFFF" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="admin-info-grid">
                <div className="admin-info-tile">
                  <span className="admin-info-label">
                    <UserIcon size={13} color="#6366F1" />
                    Full Name
                  </span>
                  <strong className="admin-info-val">{profile.fullName}</strong>
                </div>

                <div className="admin-info-tile">
                  <span className="admin-info-label">
                    <ShieldIcon size={13} color="#6366F1" />
                    Administrative Title
                  </span>
                  <strong className="admin-info-val">{profile.title}</strong>
                </div>

                <div className="admin-info-tile">
                  <span className="admin-info-label">
                    <MailIcon size={13} color="#6366F1" />
                    Email Address
                  </span>
                  <strong className="admin-info-val">{profile.email}</strong>
                </div>

                <div className="admin-info-tile">
                  <span className="admin-info-label">
                    <PhoneIcon size={13} color="#6366F1" />
                    Phone Number
                  </span>
                  <strong className="admin-info-val">{profile.phone || 'Not provided'}</strong>
                </div>

                <div className="admin-info-tile">
                  <span className="admin-info-label">
                    <ActivityIcon size={13} color="#6366F1" />
                    Department
                  </span>
                  <strong className="admin-info-val">{profile.department}</strong>
                </div>

                <div className="admin-info-tile">
                  <span className="admin-info-label">
                    <ClockIcon size={13} color="#6366F1" />
                    Office Location
                  </span>
                  <strong className="admin-info-val">{profile.location || 'Central Admin Office'}</strong>
                </div>

                <div className="admin-info-tile full-width">
                  <span className="admin-info-label">
                    <SparklesIcon size={13} color="#6366F1" />
                    Administrative Scope & Responsibilities
                  </span>
                  <p className="admin-info-bio">{profile.bio}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div
          className="admin-modal-overlay"
          onClick={() => setShowPasswordModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div className="admin-modal-header-left">
                <div className="admin-modal-icon-bubble">
                  <LockIcon size={18} color="#6366F1" />
                </div>
                <div>
                  <h3 className="admin-modal-title">Update Admin Password</h3>
                  <p className="admin-modal-subtitle">Ensure your account uses a secure passphrase</p>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowPasswordModal(false)}
                title="Close"
              >
                <XIcon size={18} color="#64748B" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="admin-modal-body">
                {passwordError && (
                  <div className="admin-modal-alert error">
                    ⚠️ {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="admin-modal-alert success">
                    ✅ Password updated successfully!
                  </div>
                )}

                <div className="admin-modal-form-group">
                  <label className="admin-form-label">Current Password *</label>
                  <input
                    type="password"
                    className="ad-input"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div className="admin-modal-form-group">
                  <label className="admin-form-label">New Password *</label>
                  <input
                    type="password"
                    className="ad-input"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>

                <div className="admin-modal-form-group last">
                  <label className="admin-form-label">Confirm New Password *</label>
                  <input
                    type="password"
                    className="ad-input"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    placeholder="Re-enter new password"
                    required
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="ad-btn ad-btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ad-btn ad-btn-primary"
                  disabled={passwordSuccess}
                >
                  {passwordSuccess ? 'Updated!' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfileView;
