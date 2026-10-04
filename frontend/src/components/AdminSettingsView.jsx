import React, { useState } from 'react';
import { SettingsIcon, CheckCircleIcon, SparklesIcon, ShieldIcon } from './Icons';

export const AdminSettingsView = () => {
  const [settings, setSettings] = useState({
    registrationOpen: true,
    adaptiveDifficulty: true,
    emailAlerts: true,
    auditLogging: true,
    maintenanceMode: false
  });
  const [savedMsg, setSavedMsg] = useState(false);

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

        {/* Card 3: Maintenance & Notifications */}
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
      </div>
    </div>
  );
};

export default AdminSettingsView;
