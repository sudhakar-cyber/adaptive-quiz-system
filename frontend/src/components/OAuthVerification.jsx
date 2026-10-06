import React, { useState } from 'react';
import { NavbarLogo } from './NavbarLogo';
import {
  ShieldIcon,
  CheckIcon,
  GoogleIcon
} from './Icons';
import { authService } from '../services/authService';

export const OAuthVerification = ({
  registeredUser = null,
  onOAuthSuccess,
  onBackToRegister,
  onSwitchToLogin
}) => {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Fallback student details if loaded directly
  const student = registeredUser || {
    firstName: 'Alex',
    lastName: 'Morgan',
    name: 'Alex Morgan',
    email: 'alex.morgan@gmail.com',
    role: 'student'
  };

  const fullName = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Alex Morgan';
  const email = student.email || '';

  const userInitials = (() => {
    const parts = fullName.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (fullName.slice(0, 2) || 'ST').toUpperCase();
  })();

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast('');
    }, 4500);
  };

  // Perform real Google OAuth via Firebase
  const handleStartGoogleOAuth = async () => {
    setErrorMessage('');
    setIsVerifying(true);

    try {
      const res = await authService.loginWithGoogle({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        phone: student.phone || '',
        country: student.country || '',
        role: student.role || 'student'
      });

      setIsVerifying(false);

      if (res && res.success && res.student) {
        setIsSuccess(true);
        setShowConsentModal(false);
        showToast('Google account verified successfully!');
        setTimeout(() => {
          if (onOAuthSuccess) {
            onOAuthSuccess(res.student);
          }
        }, 800);
      } else if (res?.error) {
        if (
          res.error.code !== 'auth/popup-closed-by-user' &&
          res.error.code !== 'auth/cancelled-popup-request'
        ) {
          setErrorMessage(res.error.message || 'Google authentication failed.');
        }
      }
    } catch (e) {
      setIsVerifying(false);
      console.warn('Google OAuth verification error:', e);
      if (
        e.code !== 'auth/popup-closed-by-user' &&
        e.code !== 'auth/cancelled-popup-request'
      ) {
        setErrorMessage(e.message || 'Google authentication failed.');
      }
    }
  };

  const handleConfirmAuthorization = () => {
    handleStartGoogleOAuth();
  };

  return (
    <div className="login-card-container oauth-card-container">
      {successToast && (
        <div className="notification-toast" role="alert">
          <span className="toast-icon">✓</span>
          <span>{successToast}</span>
        </div>
      )}

      <div className="login-card oauth-card">
        <div className="card-brand-header">
          <NavbarLogo centered size="large" />
        </div>

        <div className="card-titles">
          <div className="oauth-badge-pill">
            <span className="oauth-dot-pulse" />
            <span>Google OAuth 2.0 • No OTP Required</span>
          </div>
          <h2 className="card-heading">Verify with Google</h2>
          <p className="card-subheading">
            Authenticate your new account securely with Google OAuth verification.
          </p>
        </div>

        {errorMessage && (
          <div className="card-error" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Registered Profile Identity Card */}
        <div className="oauth-profile-preview">
          <div className="oauth-avatar-circle">
            <span>{userInitials}</span>
          </div>
          <div className="oauth-profile-meta">
            <div className="oauth-profile-name">{fullName}</div>
            <div className="oauth-profile-email">{email}</div>
          </div>
          <span className="oauth-status-tag">
            {isSuccess ? 'Verified ✓' : 'Awaiting Google OAuth'}
          </span>
        </div>

        {isSuccess ? (
          <div className="oauth-success-panel">
            <div className="oauth-success-icon-wrap">
              <CheckIcon size={24} color="#FFFFFF" />
            </div>
            <h3 className="oauth-success-title">Identity Verified!</h3>
            <p className="oauth-success-desc">
              Your account has been successfully verified via Google OAuth 2.0. Redirecting to your dashboard...
            </p>
            <button
              type="button"
              className="submit-button oauth-continue-btn"
              onClick={() => onOAuthSuccess && onOAuthSuccess(student)}
            >
              <span>Continue to Dashboard →</span>
            </button>
          </div>
        ) : (
          <div className="oauth-actions-wrapper">
            {/* Direct Google OAuth Verification Button */}
            <button
              type="button"
              className="submit-button oauth-instant-verify-btn"
              id="instant-oauth-verify-btn"
              onClick={handleStartGoogleOAuth}
            >
              <span className="btn-normal-content">
                <GoogleIcon size={19} />
                <span>Verify with Google OAuth</span>
              </span>
            </button>

            <div className="signup-row oauth-back-row">
              <span className="signup-text">Change details? </span>
              <button
                type="button"
                className="link-button"
                onClick={onBackToRegister}
              >
                Back to Registration
              </button>
              <span className="oauth-separator">•</span>
              <button
                type="button"
                className="link-button"
                onClick={onSwitchToLogin}
              >
                Login
              </button>
            </div>
          </div>
        )}

        <div className="security-badge-row">
          <ShieldIcon size={15} color="#607289" />
          <span className="security-text">
            Official Google OAuth 2.0 • End-to-End Encrypted • Zero OTP
          </span>
        </div>
      </div>

      {/* High-Fidelity Google OAuth Consent Dialog Modal */}
      {showConsentModal && (
        <div className="oauth-modal-backdrop" role="dialog" aria-modal="true">
          <div className="oauth-modal-container">
            <div className="oauth-modal-card">
              <div className="oauth-modal-header">
                <GoogleIcon size={28} />
                <span className="oauth-modal-brand">Sign in with Google</span>
              </div>

              <div className="oauth-modal-subheading">
                Choose your Google account to complete verification for <strong>LearnSmart</strong>
              </div>

              {/* Account Selection Tile */}
              <div className="oauth-modal-account-card">
                <div className="oauth-modal-avatar">
                  {userInitials}
                </div>
                <div className="oauth-modal-account-info">
                  <div className="oauth-modal-account-name">{fullName}</div>
                  <div className="oauth-modal-account-email">{email}</div>
                </div>
                <span className="oauth-modal-signedin-tag">Google Account</span>
              </div>

              {/* Scopes & Permissions */}
              <div className="oauth-scopes-box">
                <div className="oauth-scopes-title">
                  LearnSmart will receive following permissions:
                </div>
                <ul className="oauth-scopes-list">
                  <li>
                    <span className="oauth-check-bullet">✓</span>
                    <span>Verify identity via Google OpenID Connect (OAuth 2.0)</span>
                  </li>
                  <li>
                    <span className="oauth-check-bullet">✓</span>
                    <span>Confirm email address (<strong>{email}</strong>)</span>
                  </li>
                  <li>
                    <span className="oauth-check-bullet">✓</span>
                    <span>Activate student account directly without requiring SMS or Email OTP</span>
                  </li>
                </ul>
              </div>

              {/* Handshake Progress Indicator */}
              {isVerifying && (
                <div className="oauth-handshake-box">
                  <div className="oauth-handshake-spinner" />
                  <div className="oauth-handshake-step-text">
                    Authenticating with Google OAuth 2.0...
                  </div>
                  <div className="oauth-progress-bar">
                    <div
                      className="oauth-progress-bar-fill"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              <p className="oauth-modal-disclaimer">
                By continuing, Google will securely share your verified name, email address, and profile with LearnSmart.
              </p>

              <div className="oauth-modal-actions">
                <button
                  type="button"
                  className="oauth-modal-cancel-btn"
                  onClick={() => !isVerifying && setShowConsentModal(false)}
                  disabled={isVerifying}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="submit-button oauth-modal-confirm-btn"
                  id="oauth-confirm-authorize-btn"
                  onClick={handleConfirmAuthorization}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <span className="btn-loading-content">
                      <span className="btn-spinner" />
                      <span>Verifying with Google...</span>
                    </span>
                  ) : (
                    <span>Authorize & Verify</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OAuthVerification;
