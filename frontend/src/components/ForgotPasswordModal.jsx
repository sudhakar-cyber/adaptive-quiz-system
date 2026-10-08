import React, { useState, useEffect, useRef } from 'react';
import { MailIcon, ShieldIcon, CheckIcon, LoginArrowIcon } from './Icons';
import { authService } from '../services/authService';

export const ForgotPasswordModal = ({
  isOpen,
  onClose,
  initialEmail = '',
  onSuccess
}) => {
  const [email, setEmail] = useState(initialEmail || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [availableResetLink, setAvailableResetLink] = useState('');

  const inputRef = useRef(null);

  // Sync initial email when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setErrorMessage('');
      setIsSuccess(false);
      setSentEmail('');
      setCopiedLink(false);
      setAvailableResetLink('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 150);
    }
  }, [isOpen, initialEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const clean = email.trim();
    if (!clean) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.sendPasswordReset(clean);
      setIsLoading(false);

      if (res && res.success) {
        setIsSuccess(true);
        setSentEmail(res.email || clean);
        setCooldown(60);
        if (res.resetLink) {
          setAvailableResetLink(res.resetLink);
        }
        if (onSuccess) {
          onSuccess(res.email || clean);
        }
      } else {
        const msg = res?.error?.message || res?.error || 'Failed to send password reset link. Please try again.';
        setErrorMessage(msg);
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isLoading) return;
    await handleSubmit();
  };

  const handleCopyLink = () => {
    if (!availableResetLink) return;
    navigator.clipboard.writeText(availableResetLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div
      className="otp-modal-backdrop forgot-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="otp-modal-container forgot-modal-container">
        <div className="otp-modal-card forgot-modal-card">
          {/* Close button */}
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close modal"
            title="Close"
          >
            &times;
          </button>

          {!isSuccess ? (
            /* ==========================================
               INPUT STATE: Enter Registered Email
               ========================================== */
            <>
              <div className="otp-modal-header">
                <div className="otp-icon-wrap forgot-icon-wrap" aria-hidden="true">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 2L15 8"
                      stroke="#1A6BFF"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M17 6L19 8"
                      stroke="#1A6BFF"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="9"
                      cy="15"
                      r="6"
                      stroke="#1A6BFF"
                      strokeWidth="2.4"
                    />
                    <circle cx="9" cy="15" r="2.2" fill="#1A6BFF" />
                  </svg>
                </div>
                <h2 id="forgot-password-title" className="otp-modal-title">
                  Reset Password
                </h2>
                <p className="otp-modal-subheading">
                  Enter your registered email address and we'll send you a secure password reset link.
                </p>
              </div>

              {errorMessage && (
                <div className="card-error modal-card-error" role="alert">
                  <span className="error-alert-icon">⚠️</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="forgot-password-form">
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label htmlFor="forgot-email-input" className="form-label">
                    Registered Email
                  </label>
                  <div
                    className={`input-wrapper ${
                      errorMessage ? 'input-error' : ''
                    }`}
                  >
                    <span className="input-icon-left" aria-hidden="true">
                      <MailIcon size={19} color="#8A99AD" />
                    </span>
                    <input
                      ref={inputRef}
                      id="forgot-email-input"
                      type="email"
                      className="form-input"
                      placeholder="name@example.com or username"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck="false"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={isLoading || !email.trim()}
                  id="send-reset-link-btn"
                  style={{ width: '100%', marginBottom: '14px' }}
                >
                  {isLoading ? (
                    <span className="btn-loading-content">
                      <span className="btn-spinner" />
                      <span>Sending Reset Link...</span>
                    </span>
                  ) : (
                    <span className="btn-normal-content">
                      <LoginArrowIcon size={19} color="#FFFFFF" />
                      <span>Send Reset Link</span>
                    </span>
                  )}
                </button>

                <div className="modal-footer-nav">
                  <button
                    type="button"
                    className="modal-cancel-link"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* ==========================================
               SUCCESS STATE: Reset Link Sent
               ========================================== */
            <div className="forgot-success-container">
              <div className="forgot-success-icon-wrap" aria-hidden="true">
                <CheckIcon size={28} color="#FFFFFF" />
              </div>

              <h2 className="otp-modal-title" style={{ marginTop: '12px' }}>
                Reset Link Sent!
              </h2>

              <p className="otp-modal-subheading" style={{ marginBottom: '14px' }}>
                We have sent a password reset link to your registered email address:
              </p>

              <div className="otp-target-email-pill" style={{ marginBottom: '20px' }}>
                <MailIcon size={16} color="#1A6BFF" />
                <span className="otp-email-text" title={sentEmail}>
                  {sentEmail}
                </span>
              </div>

              <div className="forgot-instructions-box">
                <p className="forgot-instructions-text">
                  Please check your inbox (and <strong>Spam/Junk</strong> folder). Click the link in the email to set a new password.
                </p>
                <div className="forgot-expiry-pill">
                  ⏱️ Link is valid for 30 minutes
                </div>
              </div>

              {availableResetLink && (
                <div className="direct-link-box" style={{ marginTop: '16px', marginBottom: '16px' }}>
                  <div className="direct-link-label">Direct Reset Link:</div>
                  <div className="direct-link-actions">
                    <a
                      href={availableResetLink}
                      className="direct-link-anchor"
                      onClick={() => onClose()}
                    >
                      Open Password Reset Page &rarr;
                    </a>
                    <button
                      type="button"
                      className="copy-link-btn"
                      onClick={handleCopyLink}
                    >
                      {copiedLink ? 'Copied! ✓' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              )}

              <div className="forgot-success-actions">
                <button
                  type="button"
                  className="submit-button"
                  onClick={onClose}
                  style={{ width: '100%', marginBottom: '12px' }}
                >
                  Return to Login
                </button>

                <div className="resend-row" style={{ textAlign: 'center' }}>
                  {cooldown > 0 ? (
                    <span className="otp-cooldown-text" style={{ fontSize: '0.84rem' }}>
                      Didn't receive email? Resend in <strong>{cooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="otp-resend-btn"
                      onClick={handleResend}
                      disabled={isLoading}
                    >
                      Resend Reset Link
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="security-badge-row" style={{ marginTop: '20px', justifyContent: 'center' }}>
            <ShieldIcon size={14} color="#607289" />
            <span className="security-text" style={{ fontSize: '0.78rem' }}>
              LearnSmart End-to-End Secure Password Recovery
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
