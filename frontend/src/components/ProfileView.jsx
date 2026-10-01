import React, { useState, useRef, useEffect } from 'react';
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  EditIcon,
  CheckCircleIcon,
  AwardIcon,
  TrophyIcon,
  FlameIcon,
  StarIcon,
  TargetIcon,
  ShieldIcon,
  LogoutIcon,
  XIcon,
  CameraIcon,
  UploadIcon,
  TrashIcon
} from './Icons';

export const ProfileView = ({
  displayName = 'Shaik Aathif',
  userInitials = 'SA',
  profileImage = null,
  onUpdateProfile,
  onLogout
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(profileImage);
  const [tempAvatar, setTempAvatar] = useState(profileImage);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setCurrentAvatar(profileImage);
    setTempAvatar(profileImage);
  }, [profileImage]);

  const [formData, setFormData] = useState({
    fullName: displayName,
    email: 'shaik.aathif@learnsmart.edu',
    phone: '+91 98765 43210',
    major: 'Computer Science & Engineering',
    studentId: 'LS-2024-8841',
    semester: 'Year 3 (Semester 6)',
    bio: 'Passionate computer science student specializing in data structures, algorithmic optimization, and full-stack web applications.',
    targetGoal: 'Aiming for Software Engineering Internships at top technology companies in 2027.'
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const avatarInitials = (() => {
    const name = formData.fullName || displayName;
    if (!name) return userInitials || 'SA';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1 && parts[0]) return parts[0].slice(0, 2).toUpperCase();
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return userInitials || 'SA';
  })();

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOpenEdit = () => {
    setTempAvatar(currentAvatar);
    setFileError('');
    setIsEditing(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    setFileError('');
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setTempAvatar(uploadEvent.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setTempAvatar(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setCurrentAvatar(tempAvatar);

    if (onUpdateProfile) {
      onUpdateProfile({
        fullName: formData.fullName,
        profileImage: tempAvatar
      });
    }

    setIsEditing(false);
    setSaveSuccessMsg('Profile and picture updated successfully!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const achievements = [
    {
      id: 1,
      title: '7-Day Streak Master',
      desc: 'Maintained consecutive daily quiz activity for a full week.',
      icon: <FlameIcon size={24} color="#FF6B00" />,
      earnedDate: 'Earned Sep 2026',
      colorBg: '#FFF2E6'
    },
    {
      id: 2,
      title: 'Discrete Math Prodigy',
      desc: 'Scored 90%+ in 3 consecutive mathematics assessments.',
      icon: <TrophyIcon size={24} color="#F59E0B" />,
      earnedDate: 'Earned Sep 2026',
      colorBg: '#FEF3C7'
    },
    {
      id: 3,
      title: 'Security Sentinel',
      desc: 'Completed Web Security Fundamentals with zero hints.',
      icon: <ShieldIcon size={24} color="#8B5CF6" />,
      earnedDate: 'Earned Aug 2026',
      colorBg: '#F3E8FF'
    },
    {
      id: 4,
      title: 'Rapid Solver',
      desc: 'Answered 5 questions correctly in under 90 seconds.',
      icon: <StarIcon size={24} color="#10B981" />,
      earnedDate: 'Earned Aug 2026',
      colorBg: '#E6FAF0'
    }
  ];

  return (
    <div className="tab-view-container profile-view">
      {saveSuccessMsg && (
        <div className="dashboard-toast" role="alert">
          <CheckCircleIcon size={16} color="#10B981" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      <div className="profile-hero-card">
        <div className="profile-hero-left">
          <div className="profile-avatar-wrapper">
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt={formData.fullName}
                className="profile-avatar-large-img"
              />
            ) : (
              <div className="profile-avatar-large">
                <span>{userInitials}</span>
              </div>
            )}
            <button
              type="button"
              className="avatar-edit-overlay-btn"
              onClick={handleOpenEdit}
              title="Change Profile Picture"
              aria-label="Change Profile Picture"
            >
              <CameraIcon size={14} color="#FFFFFF" />
            </button>
          </div>

          <div className="profile-title-col">
            <div className="profile-name-row">
              <h2 className="profile-display-name">{formData.fullName}</h2>
              <span className="profile-verified-badge">✓ Verified Student</span>
            </div>
            <p className="profile-meta-sub">
              {formData.major} • {formData.semester}
            </p>
            <div className="profile-id-pills">
              <span className="id-pill">ID: {formData.studentId}</span>
              <span className="id-pill">Academic Year: 2024-2027</span>
            </div>
          </div>
        </div>

        <div className="profile-hero-actions">
          <button
            type="button"
            className="profile-edit-button"
            onClick={handleOpenEdit}
          >
            <EditIcon size={15} />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      <div className="profile-grid-layout">
        <div className="profile-info-card">
          <div className="section-card-header">
            <h3 className="section-card-title">Academic & Contact Information</h3>
          </div>

          <div className="profile-details-list">
            <div className="profile-detail-item">
              <span className="detail-item-label">Full Name:</span>
              <span className="detail-item-value">{formData.fullName}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-item-label">Email Address:</span>
              <span className="detail-item-value">{formData.email}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-item-label">Phone Number:</span>
              <span className="detail-item-value">{formData.phone}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-item-label">Department:</span>
              <span className="detail-item-value">{formData.major}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-item-label">Student ID:</span>
              <span className="detail-item-value">{formData.studentId}</span>
            </div>

            <div className="profile-detail-item full-width">
              <span className="detail-item-label">About / Bio:</span>
              <p className="detail-bio-text">{formData.bio}</p>
            </div>

            <div className="profile-detail-item full-width">
              <span className="detail-item-label">Target Learning Goal:</span>
              <p className="detail-goal-text">{formData.targetGoal}</p>
            </div>
          </div>
        </div>

        <div className="profile-achievements-card">
          <div className="section-card-header">
            <h3 className="section-card-title">Badges & Achievements</h3>
            <span className="section-badge-info">4 Unlocked</span>
          </div>

          <div className="achievements-badges-grid">
            {achievements.map((item) => (
              <div key={item.id} className="badge-item-card">
                <div
                  className="badge-icon-box"
                  style={{ backgroundColor: item.colorBg }}
                >
                  {item.icon}
                </div>
                <div className="badge-text-col">
                  <h4 className="badge-item-title">{item.title}</h4>
                  <p className="badge-item-desc">{item.desc}</p>
                  <span className="badge-item-date">{item.earnedDate}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="account-quick-settings">
            <div className="security-notice">
              <ShieldIcon size={16} color="#10B981" />
              <span>Two-Factor Authentication Active</span>
            </div>
            <button
              type="button"
              className="profile-logout-action-btn"
              onClick={onLogout}
            >
              <LogoutIcon size={16} />
              <span>Sign Out of LearnSmart</span>
            </button>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="profile-modal-backdrop" role="dialog" aria-modal="true">
          <div className="profile-modal-card">
            <div className="profile-modal-header">
              <h3 className="profile-modal-title">Edit Student Profile</h3>
              <button
                type="button"
                className="profile-modal-close"
                onClick={() => setIsEditing(false)}
                aria-label="Close"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="profile-modal-form">
              <div className="avatar-upload-section">
                <div className="avatar-preview-box">
                  {tempAvatar ? (
                    <img
                      src={tempAvatar}
                      alt="Avatar Preview"
                      className="avatar-preview-img"
                    />
                  ) : (
                    <span>{avatarInitials}</span>
                  )}
                </div>

                <div className="avatar-upload-controls">
                  <div className="avatar-control-header">
                    <span className="field-label">Profile Picture</span>
                    <span className={`avatar-status-pill ${tempAvatar ? 'has-photo' : ''}`}>
                      {tempAvatar ? 'Custom Photo' : 'Initials Avatar'}
                    </span>
                  </div>

                  <div className="avatar-btn-row">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="btn-upload-photo"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                      <UploadIcon size={15} />
                      <span>{tempAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>

                    {tempAvatar && (
                      <button
                        type="button"
                        className="btn-remove-photo"
                        onClick={handleRemovePhoto}
                        title="Delete profile picture"
                      >
                        <TrashIcon size={14} />
                        <span>Delete Picture</span>
                      </button>
                    )}
                  </div>

                  <span className="avatar-hint-text">
                    PNG, JPG, WebP or GIF up to 5MB.
                  </span>

                  {fileError && <p className="avatar-error-msg">{fileError}</p>}
                </div>
              </div>

              <div className="form-group-field">
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  className="field-text-input"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group-field">
                  <label className="field-label">Email</label>
                  <input
                    type="email"
                    className="field-text-input"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-field">
                  <label className="field-label">Phone</label>
                  <input
                    type="text"
                    className="field-text-input"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group-field">
                  <label className="field-label">Department / Major</label>
                  <input
                    type="text"
                    className="field-text-input"
                    value={formData.major}
                    onChange={(e) => handleInputChange('major', e.target.value)}
                  />
                </div>
                <div className="form-group-field">
                  <label className="field-label">Academic Semester</label>
                  <input
                    type="text"
                    className="field-text-input"
                    value={formData.semester}
                    onChange={(e) => handleInputChange('semester', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group-field">
                <label className="field-label">Short Bio</label>
                <textarea
                  className="field-textarea"
                  rows={2}
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                />
              </div>

              <div className="form-group-field">
                <label className="field-label">Target Learning Goal</label>
                <textarea
                  className="field-textarea"
                  rows={2}
                  value={formData.targetGoal}
                  onChange={(e) => handleInputChange('targetGoal', e.target.value)}
                />
              </div>

              <div className="profile-modal-actions">
                <button
                  type="button"
                  className="profile-modal-cancel"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="profile-modal-save">
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const ProfileDropdownMenu = ({
  displayName = 'Shaik Aathif',
  userInitials = 'SA',
  profileImage = null,
  onClose,
  onNavigate,
  onLogout
}) => {
  return (
    <div className="profile-dropdown-menu" role="menu">
      <div className="profile-dropdown-header">
        {profileImage ? (
          <img
            src={profileImage}
            alt={displayName}
            className="dropdown-avatar-img"
          />
        ) : (
          <div className="dropdown-avatar-badge">{userInitials}</div>
        )}
        <div className="dropdown-user-details">
          <span className="dropdown-user-name">{displayName}</span>
          <span className="dropdown-user-role">Student • CS & Engg</span>
        </div>
      </div>

      <div className="dropdown-menu-list">
        <button
          type="button"
          className="dropdown-menu-link"
          onClick={() => {
            onNavigate('profile');
            onClose();
          }}
        >
          <UserIcon size={16} />
          <span>My Profile & Settings</span>
        </button>

        <button
          type="button"
          className="dropdown-menu-link"
          onClick={() => {
            onNavigate('progress');
            onClose();
          }}
        >
          <TargetIcon size={16} />
          <span>My Progress Analytics</span>
        </button>

        <button
          type="button"
          className="dropdown-menu-link"
          onClick={() => {
            onNavigate('learning-path');
            onClose();
          }}
        >
          <AwardIcon size={16} />
          <span>Personalized Learning Path</span>
        </button>
      </div>

      <div className="dropdown-menu-divider" />

      <div className="dropdown-menu-footer">
        <button
          type="button"
          className="dropdown-logout-btn"
          onClick={() => {
            onLogout();
            onClose();
          }}
        >
          <LogoutIcon size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
