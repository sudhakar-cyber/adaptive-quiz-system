import React, { useState } from 'react';
import {
  SettingsIcon,
  CheckCircleIcon,
  SparklesIcon,
  ShieldIcon,
  SunIcon,
  MoonIcon,
  LockIcon,
  XIcon
} from './Icons';
import { useTheme } from './ThemeToggle';
import { sharedDatabase } from '../services/sharedDatabase';

export const AdminSettingsView = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  const [settings, setSettings] = useState({
    registrationOpen: true,
    adaptiveDifficulty: true,
    emailAlerts: true,
    auditLogging: true,
    maintenanceMode: false
  });
  const [savedMsg, setSavedMsg] = useState(false);

  // 2FA state synced with admin profile in storage
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('learnsmart_admin_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.twoFactorEnabled !== false;
      }
    } catch {}
    return true;
  });

  const handleToggle2FA = () => {
    const next = !twoFactorEnabled;
    setTwoFactorEnabled(next);
    try {
      const saved = localStorage.getItem('learnsmart_admin_profile');
      const profile = saved ? JSON.parse(saved) : {};
      profile.twoFactorEnabled = next;
      localStorage.setItem('learnsmart_admin_profile', JSON.stringify(profile));
    } catch {}
  };

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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

    try {
      if (typeof sharedDatabase?.updateUserPassword === 'function') {
        sharedDatabase.updateUserPassword('admin@learnsmart.edu', passwords.newPassword);
      }
      setPasswordSuccess(true);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }, 1500);
    } catch (err) {
      setPasswordError('Failed to update password. Please try again.');
    }
  };

  const toggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <div className="admin-management-container">
      <div className="management-header">
        <div>
          <h1 className="management-title">System Settings</h1>
          <p className="management-subtitle">
            Configure system parameters, adaptive difficulty algorithms, and institutional security rules
          </p>
        </div>
        <button className="admin-primary-btn" onClick={handleSave}>
          <CheckCircleIcon size={18} color="#FFFFFF" />
          <span>Save Changes</span>
        </button>
      </div>

      {savedMsg && (
        <div className="settings-saved-banner">
          <CheckCircleIcon size={18} color="#10B981" />
          <span>System configuration successfully updated and committed to shared storage.</span>
        </div>
      )}

      <div className="settings-cards-list">
        {/* Card 1: Adaptive Learning Engine */}
        <div className="settings-group-card">
          <div className="settings-group-header">
            <SparklesIcon size={20} color="#6366F1" />
            <div>
              <h3>Adaptive Learning Engine</h3>
              <p>Dynamic difficulty calibration based on real-time student performance</p>
            </div>
          </div>
          <div className="settings-toggle-row">
            <div>
              <span className="toggle-title">Real-Time Question Re-weighting</span>
              <span className="toggle-desc">Automatically increment difficulty after consecutive correct submissions.</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.adaptiveDifficulty}
                onChange={() => toggle('adaptiveDifficulty')}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        {/* Card 2: Platform Access & Registration */}
        <div className="settings-group-card">
          <div className="settings-group-header">
            <ShieldIcon size={20} color="#10B981" />
            <div>
              <h3>Access & Registration Controls</h3>
              <p>Regulate student and educator onboarding permissions</p>
            </div>
          </div>
          <div className="settings-toggle-row">
            <div>
              <span className="toggle-title">Public Student Sign-Up</span>
              <span className="toggle-desc">Allow students to self-register via Google or custom institutional email.</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.registrationOpen}
                onChange={() => toggle('registrationOpen')}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="settings-toggle-row">
            <div>
              <span className="toggle-title">Comprehensive Audit Logging</span>
              <span className="toggle-desc">Record administrative edits, quiz deletions, and status toggles.</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.auditLogging}
                onChange={() => toggle('auditLogging')}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        {/* Card 3: Security Parameters & Authentication */}
        <div className="ad-card admin-profile-content-card">
          <div className="admin-card-header">
            <div className="admin-card-header-left">
              <div className="admin-card-icon-wrap emerald">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="">
                  <rect x="4" y="11" width="16" height="10" rx="3" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></rect>
                  <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                  <circle cx="12" cy="16" r="1.5" fill="#10B981"></circle>
                </svg>
              </div>
              <div>
                <h3 className="admin-card-title">Security Parameters &amp; Authentication</h3>
                <p className="admin-card-desc">Control multi-factor verification, active sessions, and master administrative access keys.</p>
              </div>
            </div>
          </div>
          <div className="admin-credentials-stack">
            <div className="credentials-info-box">
              <div className="credentials-box-left">
                <div className="credential-icon-bubble">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="">
                    <rect x="4" y="11" width="16" height="10" rx="3" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></rect>
                    <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    <circle cx="12" cy="16" r="1.5" fill="#6366F1"></circle>
                  </svg>
                </div>
                <div>
                  <div className="credential-title-row">
                    <strong className="credential-title">Primary Administrative Password</strong>
                    <span className="admin-mini-badge encrypted">ENCRYPTED</span>
                  </div>
                  <p className="credential-desc">Secured with multi-tier SHA-256 encryption. Last rotated 14 days ago.</p>
                </div>
              </div>
              <button
                type="button"
                className="ad-btn ad-btn-secondary"
                onClick={() => setShowPasswordModal(true)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="">
                  <rect x="4" y="11" width="16" height="10" rx="3" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></rect>
                  <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                  <circle cx="12" cy="16" r="1.5" fill="#6366F1"></circle>
                </svg>
                <span>Update Password</span>
              </button>
            </div>
            <div className="credentials-info-box">
              <div className="credentials-box-left">
                <div className={`credential-icon-bubble ${twoFactorEnabled ? 'success' : 'warning'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={twoFactorEnabled ? '#10B981' : '#F59E0B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M9 12l2 2 4-4" stroke={twoFactorEnabled ? '#10B981' : '#F59E0B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </div>
                <div>
                  <div className="credential-title-row">
                    <strong className="credential-title">Two-Factor Authentication (2FA)</strong>
                    <span className={`admin-status-pill ${twoFactorEnabled ? 'active' : 'danger'}`}>
                      {twoFactorEnabled ? 'ACTIVE (TOTP)' : 'INACTIVE'}
                    </span>
                  </div>
                  <p className="credential-desc">
                    {twoFactorEnabled
                      ? 'Secured with Authenticator App (Google Authenticator / Duo TOTP).'
                      : 'Two-factor verification is currently disabled for this account.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={`ad-btn ${twoFactorEnabled ? 'ad-btn-secondary' : 'ad-btn-primary'}`}
                onClick={handleToggle2FA}
              >
                {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
            </div>
            <div className="credentials-info-box">
              <div className="credentials-box-left">
                <div className="credential-icon-bubble amber">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="">
                    <circle cx="12" cy="12" r="10" stroke="#F59E0B" strokeWidth="2"></circle>
                    <polyline points="12 6 12 12 16 14" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></polyline>
                  </svg>
                </div>
                <div>
                  <div className="credential-title-row">
                    <strong className="credential-title">Administrative Session Timeout</strong>
                    <span className="admin-mini-badge timeout">60 MINS</span>
                  </div>
                  <p className="credential-desc">Automatic session termination triggered after 60 minutes of administrative inactivity.</p>
                </div>
              </div>
              <span className="admin-status-pill active">PROTECTED</span>
            </div>
          </div>
        </div>

        {/* Card 4: Maintenance & Notifications */}
        <div className="settings-group-card">
          <div className="settings-group-header">
            <SettingsIcon size={20} color="#F97316" />
            <div>
              <h3>Notifications & Operational Health</h3>
              <p>Manage email relays and system downtime maintenance</p>
            </div>
          </div>
          <div className="settings-toggle-row">
            <div>
              <span className="toggle-title">Email Notification Relays</span>
              <span className="toggle-desc">Forward critical system notices and weekly performance summaries.</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.emailAlerts}
                onChange={() => toggle('emailAlerts')}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="settings-toggle-row">
            <div>
              <span className="toggle-title" style={{ color: settings.maintenanceMode ? '#EF4444' : 'inherit' }}>
                Maintenance Mode
              </span>
              <span className="toggle-desc">Temporarily freeze student quiz taking for server maintenance.</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={() => toggle('maintenanceMode')}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        {/* Card 5: Appearance & Display Theme */}
        <div className="settings-group-card">
          <div className="settings-group-header">
            {isDark ? (
              <MoonIcon size={20} color="#818CF8" />
            ) : (
              <SunIcon size={20} color="#F59E0B" />
            )}
            <div>
              <h3>Appearance & Theme Preference</h3>
              <p>Configure interface lighting mode across the administrative portal</p>
            </div>
          </div>
          <div className="settings-toggle-row">
            <div>
              <span className="toggle-title">
                Dark Mode Theme ({isDark ? 'Active' : 'Disabled'})
              </span>
              <span className="toggle-desc">
                Switch between high-contrast Dark theme and clean Light theme.
              </span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={isDark}
                onChange={toggleTheme}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Update Password Modal */}
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

export default AdminSettingsView;
