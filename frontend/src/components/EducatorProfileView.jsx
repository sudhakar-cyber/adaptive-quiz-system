import React, { useState, useRef } from 'react';
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  EditIcon,
  LogoutIcon,
  CameraIcon,
  XIcon
} from './Icons';

export const EducatorProfileView = ({
  profileData,
  onUpdateProfile,
  onLogout,
  showToast
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [avatarImage, setAvatarImage] = useState(() => {
    try {
      const saved = localStorage.getItem('learnsmart_educator_avatar');
      if (saved && (saved.includes('priya_avatar') || saved.includes('assets/priya_avatar'))) {
        localStorage.removeItem('learnsmart_educator_avatar');
        return null;
      }
      return saved || null;
    } catch {
      return null;
    }
  });

  const fileInputRef = useRef(null);

  // Edit form state
  const [formData, setFormData] = useState({
    fullName: profileData.fullName || 'Dr. Priya S.',
    academicTitle: profileData.academicTitle || 'Associate Professor & Course Director',
    department: profileData.department || 'School of Computer Science & Engineering',
    email: profileData.email || 'priya.sharma@learnsmart.edu',
    phone: profileData.phone || '+91 98450 12345',
    facultyId: profileData.facultyId || 'FAC-CS-2021-042',
    officeLocation: profileData.officeLocation || 'Tech Block B, Suite 402',
    officeHours: profileData.officeHours || 'Mon & Thu: 2:00 PM – 4:00 PM (IST)',
    bio: profileData.bio || 'Dr. Priya S. holds a Ph.D. in Computer Science with over 12 years of experience in distributed systems, adaptive learning algorithms, and cybersecurity education.',
    teachingPhilosophy: profileData.teachingPhilosophy || 'Empowering students through iterative, adaptive problem-solving and hands-on algorithmic design.'
  });

  // Password state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');

  const educatorInitials = (() => {
    const name = formData.fullName || profileData.fullName || 'Dr. Priya S.';
    const cleanName = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length === 1 && parts[0]) return parts[0].slice(0, 2).toUpperCase();
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return 'PS';
  })();

  const handleAvatarUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      if (showToast) showToast('File exceeds 5MB size limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setAvatarImage(result);
      try {
        localStorage.setItem('learnsmart_educator_avatar', result);
      } catch (err) {
        console.warn(err);
      }
      if (onUpdateProfile) {
        onUpdateProfile({ ...profileData, avatarImage: result });
      }
      if (showToast) showToast('Educator avatar photo updated!');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarImage(null);
    try {
      localStorage.removeItem('learnsmart_educator_avatar');
    } catch (err) {
      console.warn(err);
    }
    if (onUpdateProfile) {
      onUpdateProfile({ ...profileData, avatarImage: null });
    }
    if (showToast) showToast('Avatar removed.');
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return;

    const updated = {
      ...profileData,
      ...formData
    };

    onUpdateProfile(updated);
    try {
      localStorage.setItem('learnsmart_educator_profile', JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }

    setIsEditing(false);
    if (showToast) showToast('Faculty profile updated successfully!');
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordError('');
    setShowPasswordModal(false);
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    if (showToast) showToast('Password changed successfully!');
  };

  return (
    <div className="educator-section-view">
      {/* Header */}
      <div className="educator-section-header-row">
        <div>
          <h1 className="educator-section-title">Faculty Profile & Settings</h1>
          <p className="educator-section-subtitle">
            Manage your faculty appointments, course assignments, office hours, and credentials.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="educator-primary-btn"
            onClick={() => setIsEditing(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <EditIcon size={16} color="#FFFFFF" />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            className="educator-secondary-btn"
            onClick={() => setShowPasswordModal(true)}
          >
            Security & Password
          </button>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="educator-content-card" style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
          {/* Avatar and photo actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              {avatarImage ? (
                <img
                  src={avatarImage}
                  alt={formData.fullName}
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #2563EB',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.2)'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 700
                  }}
                >
                  {educatorInitials}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                title="Change Photo"
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: '2px solid #FFFFFF',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <CameraIcon size={16} color="#FFFFFF" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleAvatarUpload}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                Upload Photo
              </button>
              {avatarImage && (
                <>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#DC2626',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    onClick={handleRemovePhoto}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Profile Basic Info */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {profileData.fullName || formData.fullName}
              </h2>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  background: '#ECFDF5',
                  color: '#059669',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}
              >
                Active Faculty
              </span>
            </div>

            <div style={{ color: '#2563EB', fontWeight: 600, fontSize: '0.92rem', marginBottom: '8px' }}>
              {profileData.academicTitle || formData.academicTitle}
            </div>

            <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.88rem', lineHeight: 1.5 }}>
              {profileData.bio || formData.bio}
            </p>

            {/* Quick Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '0.84rem' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B', fontSize: '0.74rem' }}>Department</span>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>
                  {profileData.department || formData.department}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B', fontSize: '0.74rem' }}>Faculty ID</span>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>
                  {profileData.facultyId || formData.facultyId}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B', fontSize: '0.74rem' }}>Office Location</span>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>
                  {profileData.officeLocation || formData.officeLocation}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B', fontSize: '0.74rem' }}>Email Address</span>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>
                  {profileData.email || formData.email}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B', fontSize: '0.74rem' }}>Office Phone</span>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>
                  {profileData.phone || formData.phone}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B', fontSize: '0.74rem' }}>Office Consultation Hours</span>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>
                  {profileData.officeHours || formData.officeHours}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Teaching Overview & Assigned Courses */}
      <div className="educator-middle-grid" style={{ marginBottom: '22px' }}>
        {/* Teaching KPIs */}
        <div className="educator-content-card">
          <h3 className="educator-card-title" style={{ marginBottom: '14px' }}>
            Faculty Teaching Statistics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            <div style={{ background: '#EFF6FF', padding: '14px', borderRadius: '12px', border: '1px solid #DBEAFE' }}>
              <span style={{ fontSize: '0.78rem', color: '#1E40AF', fontWeight: 600 }}>Courses Instructed</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1E3A8A', marginTop: '2px' }}>
                {profileData.stats ? profileData.stats.coursesInstructed : 4}
              </div>
            </div>

            <div style={{ background: '#ECFDF5', padding: '14px', borderRadius: '12px', border: '1px solid #D1FAE5' }}>
              <span style={{ fontSize: '0.78rem', color: '#065F46', fontWeight: 600 }}>Enrolled Students</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#064E3B', marginTop: '2px' }}>
                {profileData.stats ? profileData.stats.totalStudents : 156}
              </div>
            </div>

            <div style={{ background: '#FFFBEB', padding: '14px', borderRadius: '12px', border: '1px solid #FEF3C7' }}>
              <span style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: 600 }}>Quizzes Authored</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#78350F', marginTop: '2px' }}>
                {profileData.stats ? profileData.stats.quizzesAuthored : 24}
              </div>
            </div>

            <div style={{ background: '#F5F3FF', padding: '14px', borderRadius: '12px', border: '1px solid #EDE9FE' }}>
              <span style={{ fontSize: '0.78rem', color: '#6D28D9', fontWeight: 600 }}>Educator Rating</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4C1D95', marginTop: '2px' }}>
                {profileData.stats ? profileData.stats.educatorRating : '4.9 / 5.0'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0F172A', marginBottom: '4px' }}>
              Pedagogical Statement
            </div>
            <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B', lineHeight: 1.5 }}>
              {profileData.teachingPhilosophy || formData.teachingPhilosophy}
            </p>
          </div>
        </div>

        {/* Assigned Courses Roster */}
        <div className="educator-content-card">
          <h3 className="educator-card-title" style={{ marginBottom: '14px' }}>
            Active Course Assignments
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profileData.assignedCourses &&
              profileData.assignedCourses.map((course) => (
                <div
                  key={course.code}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>
                      {course.code}: {course.name}
                    </div>
                    <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                      {course.semester} • Lecture & Lab
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      background: '#EFF6FF',
                      color: '#2563EB',
                      fontWeight: 700,
                      fontSize: '0.76rem'
                    }}
                  >
                    {course.students} Students
                  </span>
                </div>
              ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button
              type="button"
              className="educator-logout-btn"
              onClick={onLogout}
              style={{
                width: '100%',
                justifyContent: 'center',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                borderRadius: '10px'
              }}
            >
              <LogoutIcon size={18} color="#DC2626" />
              <span>Log Out of Educator Portal</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Edit Profile */}
      {isEditing && (
        <div className="educator-modal-overlay" onClick={() => setIsEditing(false)}>
          <div
            className="educator-modal-box"
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <h3 className="educator-card-title">Edit Faculty Profile</h3>
              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setIsEditing(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="educator-field-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="educator-text-input"
                  />
                </div>
                <div>
                  <label className="educator-field-label">Academic Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.academicTitle}
                    onChange={(e) => setFormData({ ...formData, academicTitle: e.target.value })}
                    className="educator-text-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="educator-field-label">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="educator-text-input"
                  />
                </div>
                <div>
                  <label className="educator-field-label">Faculty ID</label>
                  <input
                    type="text"
                    value={formData.facultyId}
                    onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                    className="educator-text-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="educator-field-label">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="educator-text-input"
                  />
                </div>
                <div>
                  <label className="educator-field-label">Office Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="educator-text-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="educator-field-label">Office Location</label>
                  <input
                    type="text"
                    value={formData.officeLocation}
                    onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                    className="educator-text-input"
                  />
                </div>
                <div>
                  <label className="educator-field-label">Consultation Hours</label>
                  <input
                    type="text"
                    value={formData.officeHours}
                    onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
                    className="educator-text-input"
                  />
                </div>
              </div>

              <div>
                <label className="educator-field-label">Faculty Bio</label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="educator-text-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="educator-secondary-btn"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="educator-primary-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Change Password */}
      {showPasswordModal && (
        <div className="educator-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div
            className="educator-modal-box"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <h3 className="educator-card-title">Security & Password</h3>
              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setShowPasswordModal(false)}
              >
                ✕
              </button>
            </div>

            {passwordError && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#DC2626',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  marginBottom: '12px'
                }}
              >
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="educator-field-label">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  className="educator-text-input"
                />
              </div>

              <div>
                <label className="educator-field-label">New Password (min 6 characters)</label>
                <input
                  type="password"
                  required
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  className="educator-text-input"
                />
              </div>

              <div>
                <label className="educator-field-label">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  className="educator-text-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="educator-secondary-btn"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="educator-primary-btn">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducatorProfileView;
