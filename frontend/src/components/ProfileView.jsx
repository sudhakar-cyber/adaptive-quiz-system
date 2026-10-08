import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  TrashIcon,
  LockIcon
} from './Icons';
import { sharedDatabase } from '../services/sharedDatabase';

export const ProfileView = ({
  displayName = 'Student',
  userEmail = '',
  userInitials = 'ST',
  profileImage = null,
  uid = '',
  startInEditMode = false,
  onEditClosed,
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

  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('learnsmart_student_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            fullName: displayName || parsed.fullName || 'Student',
            email: userEmail || parsed.email || '',
            phone: parsed.phone || '',
            major: parsed.major || 'Computer Science & Engineering',
            studentId: parsed.studentId || '',
            uid: uid || parsed.uid || '',
            semester: parsed.semester || 'Year 1',
            bio: parsed.bio || '',
            targetGoal: parsed.targetGoal || ''
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved student profile', e);
    }
    return {
      fullName: displayName || 'Student',
      email: userEmail || '',
      phone: '',
      major: 'Computer Science & Engineering',
      studentId: '',
      uid: uid || '',
      semester: 'Year 1',
      bio: '',
      targetGoal: 'Aiming for Software Engineering Internships at top technology companies in 2027.'
    };
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Sync with prop if display name, email, or uid changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      fullName: displayName || prev.fullName,
      email: userEmail || prev.email,
      uid: uid || prev.uid || ''
    }));
  }, [displayName, userEmail, uid]);

  // Handle external trigger to open edit modal (e.g. from dropdown)
  useEffect(() => {
    if (startInEditMode) {
      setTempAvatar(currentAvatar);
      setFileError('');
      setIsEditing(true);
      if (onEditClosed) {
        onEditClosed();
      }
    }
  }, [startInEditMode, currentAvatar, onEditClosed]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (!isEditing) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing]);

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

    try {
      localStorage.setItem('learnsmart_student_profile', JSON.stringify(formData));
      const student =
        sharedDatabase.getStudentByUsername(formData.fullName) ||
        sharedDatabase.getStudentByEmail(formData.email);
      if (student) {
        sharedDatabase.updateStudent(student.id, {
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          studentId: formData.studentId,
          topSubject: formData.major
        });
      }
    } catch (err) {
      console.warn('Failed to save student profile', err);
    }

    if (onUpdateProfile) {
      onUpdateProfile({
        fullName: formData.fullName,
        profileImage: tempAvatar,
        profileData: formData
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
                referrerPolicy="no-referrer"
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
              {formData.uid && <span className="id-pill">UID: {formData.uid.slice(0, 10)}...</span>}
              <span className="id-pill">Academic Year: 2024-2027</span>
            </div>
          </div>
        </div>

        <div className="profile-hero-actions">
          <button
            type="button"
            className="profile-edit-button"
            onClick={handleOpenEdit}
            title="Edit Student Profile"
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
            <button
              type="button"
              className="section-card-action-btn"
              onClick={handleOpenEdit}
              title="Edit Academic & Contact Information"
            >
              <EditIcon size={13} />
              <span>Edit Details</span>
            </button>
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

            {formData.uid && (
              <div className="profile-detail-item">
                <span className="detail-item-label">Firebase UID:</span>
                <span className="detail-item-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{formData.uid}</span>
              </div>
            )}

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
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' && isEditing
        ? createPortal(
            <div
              className="profile-modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-modal-title"
              onClick={() => setIsEditing(false)}
            >
              <div
                className="profile-modal-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="profile-modal-header">
                  <div className="profile-modal-title-wrap">
                    <h3 id="profile-modal-title" className="profile-modal-title">
                      Edit Student Profile
                    </h3>
                    <p className="profile-modal-subtitle">
                      Update your personal details, academic status, and profile photo
                    </p>
                  </div>
                  <button
                    type="button"
                    className="profile-modal-close"
                    onClick={() => setIsEditing(false)}
                    aria-label="Close edit profile dialog"
                    title="Close"
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
                    <label className="field-label">Full Name *</label>
                    <input
                      type="text"
                      className="field-text-input"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      required
                    />
                  </div>

                  <div className="form-row-2col">
                    <div className="form-group-field">
                      <div className="field-label-row">
                        <label className="field-label">Email Address</label>
                        <span className="field-locked-pill" title="Email Address cannot be modified by student">
                          <LockIcon size={11} color="#64748B" />
                          <span>Non-editable</span>
                        </span>
                      </div>
                      <input
                        type="email"
                        className="field-text-input input-field-readonly"
                        value={formData.email}
                        readOnly
                        disabled
                        tabIndex={-1}
                        title="Email Address cannot be modified by student."
                        placeholder="student@learnsmart.edu"
                      />
                      <span className="field-hint-text">Institutional account email cannot be modified.</span>
                    </div>
                    <div className="form-group-field">
                      <label className="field-label">Phone Number</label>
                      <input
                        type="tel"
                        className="field-text-input"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="form-row-2col">
                    <div className="form-group-field">
                      <div className="field-label-row">
                        <label className="field-label">Department / Major</label>
                        <span className="field-locked-pill" title="Department / Major cannot be modified by student">
                          <LockIcon size={11} color="#64748B" />
                          <span>Non-editable</span>
                        </span>
                      </div>
                      <input
                        type="text"
                        className="field-text-input input-field-readonly"
                        value={formData.major}
                        readOnly
                        disabled
                        tabIndex={-1}
                        title="Department / Major cannot be modified by student."
                        placeholder="Computer Science & Engineering"
                      />
                      <span className="field-hint-text">Department is assigned by your institution or educator.</span>
                    </div>
                    <div className="form-group-field">
                      <label className="field-label">Academic Semester</label>
                      <input
                        type="text"
                        className="field-text-input"
                        value={formData.semester}
                        onChange={(e) => handleInputChange('semester', e.target.value)}
                        placeholder="Year 3 (Semester 6)"
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
                      placeholder="Tell us about yourself and your academic focus..."
                    />
                  </div>

                  <div className="form-group-field">
                    <label className="field-label">Target Learning Goal</label>
                    <textarea
                      className="field-textarea"
                      rows={2}
                      value={formData.targetGoal}
                      onChange={(e) => handleInputChange('targetGoal', e.target.value)}
                      placeholder="What are your goals this semester?"
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
                      <CheckCircleIcon size={15} color="#FFFFFF" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export const ProfileDropdownMenu = ({
  displayName = 'Student',
  userEmail = '',
  userInitials = 'ST',
  profileImage = null,
  uid = '',
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
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="dropdown-avatar-badge">{userInitials}</div>
        )}
        <div className="dropdown-user-details">
          <span className="dropdown-user-name">{displayName}</span>
          {userEmail && <span className="dropdown-user-email">{userEmail}</span>}
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
            onNavigate('edit-profile');
            onClose();
          }}
        >
          <EditIcon size={16} />
          <span>Edit Student Profile</span>
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
