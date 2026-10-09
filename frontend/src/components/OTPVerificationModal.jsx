import React, { useState, useEffect, useRef } from 'react';
import { PhoneIcon, ShieldIcon, CheckIcon } from './Icons';
import { phoneAuthService } from '../services/phoneAuthService';

export const OTPVerificationModal = ({
  isOpen,
  phone = '',
  country = 'United States',
  displayPhone = '',
  email = '',
  registrationData = null,
  onVerifySuccess,
  onClose,
  initialCooldown = 60,
  initialExpiryMinutes = 10
}) => {
  // 6-digit OTP state for Firebase Phone Authentication
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [expirySeconds, setExpirySeconds] = useState(initialExpiryMinutes * 60);

  const inputRefs = useRef([]);

  const targetRawPhone = registrationData?.phone || phone || '';
  const targetCountry = registrationData?.country || country || 'United States';
  const targetDisplayPhone =
    displayPhone ||
    phoneAuthService.formatPhoneDisplay(
      phoneAuthService.formatToE164(targetRawPhone, targetCountry)
    ) ||
    targetRawPhone;

  // Auto-focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
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
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || '';
    }
    setDigits(next);
    if (errorMessage) setErrorMessage('');

    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const fullCode = digits.join('');
  const isComplete = fullCode.length === 6 && digits.every((d) => d !== '');

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (isVerifying) return;

    if (!isComplete) {
      setErrorMessage('Please enter all 6 digits of your SMS verification code.');
      return;
    }

    if (expirySeconds <= 0) {
      setErrorMessage('This verification code has expired. Please click "Resend OTP".');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const profileToSave = registrationData || {
        phone: targetRawPhone,
        country: targetCountry,
        email
      };

      const res = await phoneAuthService.verifyOtp(fullCode, profileToSave);

      if (res && res.success) {
        setSuccessToast('Phone number verified! Account created successfully.');
        if (onVerifySuccess) {
          onVerifySuccess(res.student || res.user);
        }
      } else {
        setErrorMessage(
          res?.error || 'Incorrect verification code. Please check your SMS and try again.'
        );
        // Automatically clear OTP input fields when wrong
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 10);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
      setDigits(['', '', '', '', '', '']);
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
      const res = await phoneAuthService.resendOtp(targetRawPhone, targetCountry);
      if (res && res.success) {
        setDigits(['', '', '', '', '', '']);
        setCooldown(60);
        setExpirySeconds(10 * 60);
        setSuccessToast(res.message || `A new verification code has been sent to ${targetDisplayPhone}`);
        setTimeout(() => setSuccessToast(''), 4500);
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(res?.error || 'Failed to resend SMS code. Please wait a moment and try again.');
      }
    } catch (err) {
      setErrorMessage(
        phoneAuthService.getFriendlyPhoneAuthError(err) || 'Failed to resend verification code.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className="otp-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-title"
    >
      <div className="otp-modal-container">
        <div className="otp-modal-card">
          <div className="otp-modal-header">
            <div className="otp-icon-wrap" aria-hidden="true">
              <PhoneIcon size={26} color="#1A6BFF" />
            </div>
            <h2 id="otp-title" className="otp-modal-title">Verify Mobile Number</h2>
            <p className="otp-modal-subheading">
              We have sent a 6-digit SMS verification code to
            </p>
            <div className="otp-target-email-pill">
              <span className="otp-email-text">{targetDisplayPhone}</span>
              <button
                type="button"
                className="otp-change-email-btn"
                onClick={onClose}
                title="Change or edit your mobile number"
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
            <label className="otp-inputs-label">Enter 6-Digit Code</label>
            <div className="otp-inputs-row" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  id={`otp-modal-digit-${i}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
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
                    {isResending ? 'Sending...' : 'Resend OTP'}
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
                Change Number
              </button>
              <button
                type="submit"
                className="submit-button otp-verify-submit-btn"
                id="modal-verify-otp-submit-btn"
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
                    <span>Verify OTP &amp; Create Account</span>
                  </span>
                )}
              </button>
            </div>

            <div className="otp-security-footer">
              <ShieldIcon size={14} color="#64748B" />
              <span>Official Firebase SMS Verification • Never share your OTP</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationModal;
