import React, { useState, useEffect } from 'react';
import { MailIcon, ShieldIcon, CheckIcon } from './Icons';
import { authService } from '../services/authService';

export const GoogleEmailVerificationModal = ({
  isOpen,
  email,
  onVerified,
  onClose
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState(
    'Verification email sent. Please check your email and verify your account.'
  );
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setInfoMessage(
        'Verification email sent. Please check your email and verify your account.'
      );
      setCooldown(60);
    }
  }, [isOpen]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleCheckVerification = async () => {
    setIsChecking(true);
    setErrorMessage('');

    try {
      // Reloads real Firebase user state from server
      const res = await authService.checkGoogleEmailVerification();

      if (res && res.success && res.student) {
        if (onVerified) {
          onVerified(res.student, res.role || 'student');
        }
      } else {
        setErrorMessage(
          'Email is not verified yet. Please click the link in the verification email sent to your inbox, then click here to continue.'
        );
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to verify email status.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage('');

    try {
      const res = await authService.resendGoogleEmailVerification();
      if (res && res.success) {
        setInfoMessage('Verification email sent. Please check your email and verify your account.');
        setCooldown(60);
      } else {
        setErrorMessage(res.message || 'Failed to resend verification email.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="otp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="google-verify-title">
      <div className="otp-modal-container">
        <div className="otp-modal-card">
          <div className="otp-modal-header">
            <div className="otp-icon-wrap" aria-hidden="true">
              <MailIcon size={26} color="#1A6BFF" />
            </div>
            <h2 id="google-verify-title" className="otp-modal-title">Verify Your Email</h2>
            <p className="otp-modal-subheading">
              A verification link was sent to your Google email
            </p>
            <div className="otp-target-email-pill">
              <span className="otp-email-text">{email}</span>
            </div>
          </div>

          <div
            className="otp-success-alert"
            style={{
              backgroundColor: '#EFF6FF',
              borderColor: '#BFDBFE',
              color: '#1E40AF',
              marginBottom: '16px'
            }}
            role="status"
          >
            <CheckIcon size={16} color="#1D4ED8" />
            <span>{infoMessage}</span>
          </div>

          {errorMessage && (
            <div className="card-error otp-error-alert" role="alert" style={{ marginBottom: '16px' }}>
              {errorMessage}
            </div>
          )}

          <p style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', margin: '0 0 20px 0', lineHeight: 1.5 }}>
            Please open the verification email and click the confirmation link. Once verified, click below to access your account.
          </p>

          <div className="otp-actions-row" style={{ marginTop: '8px' }}>
            <button
              type="button"
              className="otp-cancel-btn"
              onClick={onClose}
              disabled={isChecking}
            >
              Cancel
            </button>
            <button
              type="button"
              className="submit-button otp-verify-submit-btn"
              onClick={handleCheckVerification}
              disabled={isChecking}
            >
              {isChecking ? (
                <span className="btn-loading-content">
                  <span className="btn-spinner" />
                  <span>Checking...</span>
                </span>
              ) : (
                <span className="btn-normal-content">
                  <CheckIcon size={18} color="#FFFFFF" />
                  <span>I've Verified My Email</span>
                </span>
              )}
            </button>
          </div>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            {cooldown > 0 ? (
              <span className="otp-cooldown-text" style={{ fontSize: '12px' }}>
                Resend email in <strong>{cooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                className="otp-resend-btn"
                onClick={handleResend}
                disabled={isResending}
                style={{ fontSize: '13px' }}
              >
                {isResending ? 'Resending...' : 'Resend Verification Email'}
              </button>
            )}
          </div>

          <div className="otp-security-footer">
            <ShieldIcon size={14} color="#64748B" />
            <span>Official Firebase Authentication Security</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleEmailVerificationModal;
