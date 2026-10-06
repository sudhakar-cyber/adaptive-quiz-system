import React, { useState } from 'react';
import { CheckCircleIcon, LockIcon } from './Icons';

export const AdminProfileView = ({
  adminUser = { name: 'Admin', role: 'Administrator', email: 'admin@learnsmart.edu' }
}) => {
  const [saved, setSaved] = useState(false);

  return (
    <div className="admin-management-container">
      <div className="management-header">
        <div>
          <h1 className="management-title">Administrator Profile</h1>
          <p className="management-subtitle">
            Manage your administrative credentials, security parameters, and permission levels
          </p>
        </div>
      </div>

      <div className="profile-layout-grid">
        {/* Profile Card */}
        <div className="admin-profile-card">
          <div className="profile-avatar-large">
            {adminUser.avatarInitials || 'A'}
          </div>
          <h2 className="profile-card-name">{adminUser.name || 'System Admin'}</h2>
          <span className="role-pill role-admin">Administrator</span>
          <p className="profile-card-email">{adminUser.email}</p>

          <div className="profile-card-meta">
            <div className="meta-row">
              <span>Department</span>
              <strong>Platform Operations</strong>
            </div>
            <div className="meta-row">
              <span>Access Level</span>
              <strong>Super Administrator (Tier 1)</strong>
            </div>
            <div className="meta-row">
              <span>Two-Factor Auth</span>
              <strong style={{ color: '#10B981' }}>Enabled (TOTP)</strong>
            </div>
          </div>
        </div>

        {/* Security & Access Rights */}
        <div className="profile-details-column">
          <div className="admin-table-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
              Administrator Permissions & Privileges
            </h3>
            <div className="privilege-checklist">
              {[
                'Full Read/Write access across all Student records',
                'Curriculum approval and Quiz state modification',
                'Real-time student progress & telemetry analytics tracking',
                'Educator onboarding, departmental assignment, and deactivation',
                'Platform-wide audit log generation and CSV export capability',
                'Adaptive learning engine difficulty coefficient calibration'
              ].map((priv, idx) => (
                <div key={idx} className="privilege-item">
                  <CheckCircleIcon size={18} color="#10B981" />
                  <span>{priv}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
              Security & Credentials
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '20px' }}>
              Administrative credentials authenticate you against the LearnSmart Core Management System.
            </p>
            <div className="credentials-info-box">
              <div>
                <strong>Primary Admin Email</strong>
                <p style={{ margin: '4px 0 0', color: '#475569' }}>{adminUser.email}</p>
              </div>
              <button
                className="admin-secondary-btn"
                onClick={() => {
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2500);
                }}
              >
                <LockIcon size={16} color="#6366F1" />
                <span>{saved ? 'Updated!' : 'Reset Credentials'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfileView;
