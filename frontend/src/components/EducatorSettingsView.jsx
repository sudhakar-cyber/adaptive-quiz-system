import React, { useState } from 'react';
import {
  SettingsIcon,
  CheckCircleIcon,
  BellIcon,
  ShieldIcon,
  SparklesIcon,
  CheckIcon,
  StarIcon,
  SunIcon,
  MoonIcon
} from './Icons';
import { useTheme } from './ThemeToggle';

export const EducatorSettingsView = ({ showToast }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('learnsmart_educator_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return {
      defaultTimeLimit: '20',
      passingScore: '75',
      shuffleQuestions: true,
      allowRetakes: true,
      lowScoreAlerts: true,
      submissionAlerts: true,
      weeklyCohortReport: true
    };
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleSetting = (key) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('learnsmart_educator_settings', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  const handleSelectChange = (key, val) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('learnsmart_educator_settings', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  const handleSave = () => {
    try {
      localStorage.setItem('learnsmart_educator_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn(e);
    }
    setSavedSuccess(true);
    if (showToast) showToast('Educator settings updated and saved!');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="educator-section-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 className="educator-section-title">Educator & Course Settings</h1>
          <p className="educator-section-subtitle">
            Configure default quiz publishing rules, student mastery thresholds, notification delivery, and dashboard appearance.
          </p>
        </div>

        <button
          type="button"
          className="educator-primary-btn"
          onClick={handleSave}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <CheckIcon size={16} color="#FFFFFF" />
          <span>{savedSuccess ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
            color: isDark ? '#6EE7B7' : '#065F46',
            border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #A7F3D0',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          <CheckCircleIcon size={18} color="#10B981" />
          <span>Course parameters and educator settings committed successfully.</span>
        </div>
      )}

      {/* Grid of Settings Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Card 1: Default Quiz Authoring Defaults */}
        <div className="educator-content-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF', color: isDark ? '#60A5FA' : '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SparklesIcon size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Quiz Publishing Defaults</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>Preset values when generating new quizzes</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block' }}>Default Time Limit</strong>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Standard duration allocated per quiz</span>
              </div>
              <select
                className="educator-select"
                value={settings.defaultTimeLimit}
                onChange={(e) => handleSelectChange('defaultTimeLimit', e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', width: '120px' }}
              >
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block' }}>Pass Score Threshold</strong>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Minimum mastery score for passing badge</span>
              </div>
              <select
                className="educator-select"
                value={settings.passingScore}
                onChange={(e) => handleSelectChange('passingScore', e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', width: '120px' }}
              >
                <option value="60">60%</option>
                <option value="70">70%</option>
                <option value="75">75% (Recommended)</option>
                <option value="80">80%</option>
                <option value="85">85%</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block' }}>Randomize Questions by Default</strong>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Shuffle question order for each attempt</span>
              </div>
              <input
                type="checkbox"
                checked={settings.shuffleQuestions}
                onChange={() => toggleSetting('shuffleQuestions')}
                className="educator-custom-checkbox"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block' }}>Permit Retakes by Default</strong>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Allow enrolled students multiple practice attempts</span>
              </div>
              <input
                type="checkbox"
                checked={settings.allowRetakes}
                onChange={() => toggleSetting('allowRetakes')}
                className="educator-custom-checkbox"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Student Performance & Interventions */}
        <div className="educator-content-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7', color: isDark ? '#FBBF24' : '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <StarIcon size={20} color={isDark ? '#FBBF24' : '#D97706'} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Performance Monitoring</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>Student mastery tracking and alert triggers</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block' }}>Low-Mastery Alerts</strong>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Notify educator when a student falls below 50%</span>
              </div>
              <input
                type="checkbox"
                checked={settings.lowScoreAlerts}
                onChange={() => toggleSetting('lowScoreAlerts')}
                className="educator-custom-checkbox"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block' }}>Real-time Submission Feed</strong>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Log instant notifications on completed student attempts</span>
              </div>
              <input
                type="checkbox"
                checked={settings.submissionAlerts}
                onChange={() => toggleSetting('submissionAlerts')}
                className="educator-custom-checkbox"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block' }}>Weekly Cohort Progress Digest</strong>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Generate weekly aggregate student report summary</span>
              </div>
              <input
                type="checkbox"
                checked={settings.weeklyCohortReport}
                onChange={() => toggleSetting('weeklyCohortReport')}
                className="educator-custom-checkbox"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Assessment Security & Integrity */}
        <div className="educator-content-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: isDark ? 'rgba(126, 34, 206, 0.2)' : '#F3E8FF', color: isDark ? '#C084FC' : '#7E22CE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldIcon size={20} color={isDark ? '#C084FC' : '#7E22CE'} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Assessment Security & Integrity</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>Anti-cheat parameters and quiz monitoring controls</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block' }}>Tab-Switch Monitoring</strong>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Flag attempts when students leave quiz window</span>
              </div>
              <input
                type="checkbox"
                defaultChecked={true}
                className="educator-custom-checkbox"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block' }}>Automated Difficulty Recalibration</strong>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Enable AI engine to dynamically adapt question difficulty</span>
              </div>
              <input
                type="checkbox"
                defaultChecked={true}
                className="educator-custom-checkbox"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Appearance & Display Theme */}
        <div className="educator-content-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isDark ? <MoonIcon size={20} color="#818CF8" /> : <SunIcon size={20} color="#F59E0B" />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Appearance & Display Theme</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                Select between Light and Dark interface modes for the educator portal
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block' }}>
                  Dark Mode Theme ({isDark ? 'Active' : 'Disabled'})
                </strong>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                  Toggle between high-contrast Dark theme and clean Light theme
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
      </div>
    </div>
  );
};

export default EducatorSettingsView;
