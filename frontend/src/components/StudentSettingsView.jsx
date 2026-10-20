import React, { useState } from 'react';
import {
  SettingsIcon,
  CheckCircleIcon,
  BellIcon,
  ShieldIcon,
  SparklesIcon,
  CheckIcon
} from './Icons';

export const StudentSettingsView = ({ showToast }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('learnsmart_student_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return {
      timerDisplay: true,
      instantExplanations: true,
      soundEffects: false,
      autoAdvance: false,
      quizReminders: true,
      newQuizAlerts: true,
      weeklyDigest: true,
      pacingMode: 'standard',
      leaderboardVisible: true,
      tabSwitchWarning: true
    };
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleSetting = (key) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('learnsmart_student_settings', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  const handlePacingChange = (val) => {
    setSettings((prev) => {
      const updated = { ...prev, pacingMode: val };
      try {
        localStorage.setItem('learnsmart_student_settings', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  const handleSave = () => {
    try {
      localStorage.setItem('learnsmart_student_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn(e);
    }
    setSavedSuccess(true);
    if (showToast) showToast('Account & learning settings saved successfully!');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="tab-view-container student-settings-view">
      {/* Header */}
      <div className="tab-view-header">
        <div>
          <h1 className="tab-page-title">Account & Learning Settings</h1>
          <p className="tab-page-subtitle">
            Configure your quiz experience, notification alerts, study pacing, and student preferences.
          </p>
        </div>

        <button
          type="button"
          className="settings-save-btn"
          onClick={handleSave}
        >
          <CheckIcon size={16} color="#FFFFFF" />
          <span>{savedSuccess ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {savedSuccess && (
        <div className="settings-success-alert">
          <CheckCircleIcon size={18} color="#10B981" />
          <span>Your settings preferences have been saved and applied!</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="settings-grid">
        {/* Card 1: Quiz & Testing Experience */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon-wrap blue">
              <SparklesIcon size={20} color="#2563EB" />
            </div>
            <div>
              <h3 className="settings-card-title">Quiz & Exam Experience</h3>
              <p className="settings-card-desc">Interface parameters during active quiz sessions</p>
            </div>
          </div>

          <div className="settings-items-stack">
            <div className="settings-item-row">
              <div className="settings-item-info">
                <strong className="settings-item-title">Live Countdown Timer</strong>
                <span className="settings-item-desc">Show elapsed clock and remaining question time</span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.timerDisplay}
                  onChange={() => toggleSetting('timerDisplay')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item-row">
              <div className="settings-item-info">
                <strong className="settings-item-title">Instant Solution Explanations</strong>
                <span className="settings-item-desc">Display step-by-step reasoning upon submitting each quiz</span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.instantExplanations}
                  onChange={() => toggleSetting('instantExplanations')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item-row">
              <div className="settings-item-info">
                <strong className="settings-item-title">Audio & Completion Chimes</strong>
                <span className="settings-item-desc">Play subtle sound effects on milestone achievements</span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.soundEffects}
                  onChange={() => toggleSetting('soundEffects')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item-row">
              <div className="settings-item-info">
                <strong className="settings-item-title">Auto-Advance Questions</strong>
                <span className="settings-item-desc">Proceed to the next question automatically after selection</span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.autoAdvance}
                  onChange={() => toggleSetting('autoAdvance')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Card 2: Notifications & Communication */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon-wrap emerald">
              <BellIcon size={20} color="#10B981" />
            </div>
            <div>
              <h3 className="settings-card-title">Notifications & Alerts</h3>
              <p className="settings-card-desc">Email reminders and in-app banner preferences</p>
            </div>
          </div>

          <div className="settings-items-stack">
            <div className="settings-item-row">
              <div className="settings-item-info">
                <strong className="settings-item-title">Quiz Deadline Reminders</strong>
                <span className="settings-item-desc">Notify 24 hours prior to scheduled attempt closing</span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.quizReminders}
                  onChange={() => toggleSetting('quizReminders')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item-row">
              <div className="settings-item-info">
                <strong className="settings-item-title">New Quiz Announcements</strong>
                <span className="settings-item-desc">Alert when educators publish new practice modules</span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.newQuizAlerts}
                  onChange={() => toggleSetting('newQuizAlerts')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item-row">
              <div className="settings-item-info">
                <strong className="settings-item-title">Weekly Mastery Digest</strong>
                <span className="settings-item-desc">Receive weekly summary of accuracy and badges</span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.weeklyDigest}
                  onChange={() => toggleSetting('weeklyDigest')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Card 3: Adaptive Engine & Study Pacing */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon-wrap amber">
              <SettingsIcon size={20} color="#F59E0B" />
            </div>
            <div>
              <h3 className="settings-card-title">Study Pacing & Engine</h3>
              <p className="settings-card-desc">Adaptive test difficulty adjustment pace</p>
            </div>
          </div>

          <div className="settings-items-stack">
            <div className="settings-pacing-select-box">
              <label className="settings-pacing-label">
                Adaptive Recommendation Calibration:
              </label>
              <select
                className="settings-select"
                value={settings.pacingMode}
                onChange={(e) => handlePacingChange(e.target.value)}
              >
                <option value="standard">Standard (Balanced calibration)</option>
                <option value="accelerated">Accelerated (Higher difficulty increment)</option>
                <option value="deliberate">Deliberate (Gradual difficulty ramp)</option>
              </select>
              <span className="settings-pacing-hint">
                Controls how quickly the machine learning recommendation engine scales question difficulty based on consecutive correct responses.
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Privacy & Assessment Integrity */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon-wrap purple">
              <ShieldIcon size={20} color="#8B5CF6" />
            </div>
            <div>
              <h3 className="settings-card-title">Privacy & Integrity</h3>
              <p className="settings-card-desc">Public visibility and assessment monitoring options</p>
            </div>
          </div>

          <div className="settings-items-stack">
            <div className="settings-item-row">
              <div className="settings-item-info">
                <strong className="settings-item-title">Leaderboard Visibility</strong>
                <span className="settings-item-desc">Display username and points on class ranking boards</span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.leaderboardVisible}
                  onChange={() => toggleSetting('leaderboardVisible')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item-row">
              <div className="settings-item-info">
                <strong className="settings-item-title">Tab-Switch Focus Alert</strong>
                <span className="settings-item-desc">Pause timer and prompt confirmation when leaving assessment window</span>
              </div>
              <label className="settings-toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.tabSwitchWarning}
                  onChange={() => toggleSetting('tabSwitchWarning')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSettingsView;
