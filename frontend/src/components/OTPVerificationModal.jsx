import React, { useState, useEffect, useRef } from 'react';
import { MailIcon, ShieldIcon, CheckIcon } from './Icons';
import { otpService } from '../services/otpService';

export const OTPVerificationModal = ({
  isOpen,
  email,
  onVerifySuccess,
  onClose,
  initialCooldown = 60,
  initialExpiryMinutes = 10
}) => {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [expirySeconds, setExpirySeconds] = useState(initialExpiryMinutes * 60);

  const inputRefs = useRef([]);

  // Auto-focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '']);
      setErrorMessage('');
      setCooldown(initialCooldown);
      setExpirySeconds(initialExpiryMinutes * 60);
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 150);
    }
  }, [isOpen, initialCooldown, initialExpiryMinutes]);

  // Resend cooldown timer
  useEffect(() => {
    if (!isOpen || cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, cooldown]);

  // OTP expiration timer
  useEffect(() => {
    if (!isOpen || expirySeconds <= 0) return;
    const interval = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, expirySeconds]);

  if (!isOpen) return null;

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDigitChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    const next = [...digits];
    const singleDigit = cleaned.slice(-1);
    next[index] = singleDigit;
    setDigits(next);
    if (errorMessage) setErrorMessage('');

    // Auto-advance focus
    if (index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const next = [...digits];
    for (let i = 0; i < 4; i++) {
      next[i] = pasted[i] || '';
    }
    setDigits(next);
    if (errorMessage) setErrorMessage('');

    const focusIndex = Math.min(pasted.length, 3);
    inputRefs.current[focusIndex]?.focus();
  };

  const fullCode = digits.join('');
  const isComplete = fullCode.length === 4 && digits.every((d) => d !== '');

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!isComplete) {
      setErrorMessage('Please enter all 4 digits of your verification code.');
      return;
    }

    if (expirySeconds <= 0) {
      setErrorMessage('This verification code has expired. Please click "Resend Code".');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const res = await otpService.verifyOtp(email, fullCode);
      if (res && res.success) {
        setSuccessToast('Code verified successfully!');
        if (onVerifySuccess) {
          onVerifySuccess(res.verificationToken);
        }
      } else {
        setErrorMessage(
          res.error || 'Incorrect verification code. Please check your email and try again.'
        );
        // Automatically clear OTP input fields when wrong
        setDigits(['', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 10);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
      // Automatically clear OTP input fields on error
      setDigits(['', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 10);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage('');

    try {
      const res = await otpService.resendOtp(email);
      if (res && res.success) {
        setDigits(['', '', '', '']);
        setCooldown(60);
        setExpirySeconds(10 * 60);
        setSuccessToast(`A new verification code has been sent to ${email}`);
        setTimeout(() => setSuccessToast(''), 4500);
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(res.error || 'Failed to resend code. Please wait a moment and try again.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="otp-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="otp-title">
      <div className="otp-modal-container">
        <div className="otp-modal-card">
          <div className="otp-modal-header">
            <div className="otp-icon-wrap" aria-hidden="true">
              <MailIcon size={26} color="#1A6BFF" />
            </div>
            <h2 id="otp-title" className="otp-modal-title">Verify Your Email</h2>
            <p className="otp-modal-subheading">
              We have sent a 4-digit verification code to
            </p>
            <div className="otp-target-email-pill">
              <span className="otp-email-text">{email}</span>
              <button
                type="button"
                className="otp-change-email-btn"
                onClick={onClose}
                title="Change or edit your email"
              >
                Change
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="card-error otp-error-alert" role="alert">
              {errorMessage}
            </div>
          )}

          {successToast && (
            <div className="otp-success-alert" role="status">
              <CheckIcon size={16} color="#059669" />
              <span>{successToast}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="otp-form" noValidate>
            <label className="otp-inputs-label">Enter 4-Digit Code</label>
            <div className="otp-inputs-row" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  id={`otp-digit-${i}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`otp-digit-box ${digit ? 'filled' : ''} ${
                    errorMessage ? 'error' : ''
                  }`}
                  aria-label={`Digit ${i + 1}`}
                  disabled={isVerifying}
                />
              ))}
            </div>

            <div className="otp-timer-row">
              <span className="otp-expiry-indicator">
                {expirySeconds > 0 ? (
                  <>Expires in <strong>{formatTimer(expirySeconds)}</strong></>
                ) : (
                  <span className="otp-expired-warning">Code expired</span>
                )}
              </span>

              <div className="otp-resend-wrap">
                {cooldown > 0 ? (
                  <span className="otp-cooldown-text">
                    Resend code in <strong>{cooldown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="otp-resend-btn"
                    onClick={handleResend}
                    disabled={isResending}
                  >
                    {isResending ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </div>
            </div>

            <div className="otp-actions-row">
              <button
                type="button"
                className="otp-cancel-btn"
                onClick={onClose}
                disabled={isVerifying}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button otp-verify-submit-btn"
                id="verify-otp-submit-btn"
                disabled={!isComplete || isVerifying}
              >
                {isVerifying ? (
                  <span className="btn-loading-content">
                    <span className="btn-spinner" />
                    <span>Verifying...</span>
                  </span>
                ) : (
                  <span className="btn-normal-content">
                    <CheckIcon size={18} color="#FFFFFF" />
                    <span>Verify &amp; Create Account</span>
                  </span>
                )}
              </button>
            </div>

            <div className="otp-security-footer">
              <ShieldIcon size={14} color="#64748B" />
              <span>Official 2-Step Verification • Never share your code</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationModal;
