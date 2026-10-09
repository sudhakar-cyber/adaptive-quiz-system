import React, { useState, useEffect, useRef } from 'react';
import { NavbarLogo } from './NavbarLogo';
import { ShieldIcon, CheckIcon } from './Icons';
import { phoneAuthService, maskPhoneNumber, formatToE164 } from '../services/phoneAuthService';

export const OtpVerification = ({
  phone = '',
  country = 'India',
  displayPhone = '',
  registrationData = {},
  onVerifySuccess,
  onBackToRegister,
  onSwitchToLogin
}) => {
  // 6-digit OTP state for Firebase Phone Authentication
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [isShaking, setIsShaking] = useState(false);

  const inputRefs = useRef([]);

  // Compute clean formatted and masked phone representation
  const targetPhone = phone || registrationData?.phone || '';
  const targetCountry = country || registrationData?.country || 'India';
  const formattedPhone = formatToE164(targetPhone, targetCountry);
  const maskedDisplay = displayPhone || maskPhoneNumber(formattedPhone) || targetPhone || 'your phone number';

  // Auto-focus first input box on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 120);
    }
  }, []);

  // 60-second resend cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast('');
    }, 4500);
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

    // Auto-advance focus to next digit box (0 -> 1 -> 2 -> 3 -> 4 -> 5)
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
      setErrorMessage('Please enter the complete 6-digit verification code received by SMS.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const res = await phoneAuthService.verifyPhoneOtp(fullCode, {
        ...registrationData,
        phone: targetPhone,
        country: targetCountry
      });

      if (res && res.success) {
        showToast('Phone verified successfully! Creating your profile...');
        if (onVerifySuccess) {
          onVerifySuccess(res.student || res.user);
        }
      } else {
        setErrorMessage(
          res?.error || 'Incorrect verification code. Please check your SMS and try again.'
        );
        // Automatically clear OTP input fields on verification failure
        setDigits(['', '', '', '', '', '']);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 20);
      }
    } catch (err) {
      setErrorMessage(
        phoneAuthService.getFriendlyPhoneAuthError(err) || 'Verification failed. Please try again.'
      );
      setDigits(['', '', '', '', '', '']);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 20);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage('');

    try {
      const res = await phoneAuthService.resendPhoneOtp(targetPhone, targetCountry);
      if (res && res.success) {
        setDigits(['', '', '', '', '', '']);
        setCooldown(res.cooldownSeconds || 60);
        showToast(`A new SMS verification code has been sent to ${maskedDisplay}`);
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(res?.error || 'Failed to resend code. Please wait a moment and try again.');
      }
    } catch (err) {
      setErrorMessage(phoneAuthService.getFriendlyPhoneAuthError(err));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="login-card-container otp-card-container">
      {successToast && (
        <div className="notification-toast" role="alert">
          <span className="toast-icon">✓</span>
          <span>{successToast}</span>
        </div>
      )}


      <div className="login-card otp-card">
        <div className="card-brand-header">
          <NavbarLogo centered size="large" />
        </div>

        <div className="otp-modal-header">
          <div className="otp-icon-wrap" aria-hidden="true">
            <ShieldIcon size={26} color="#1A6BFF" />
          </div>
          <h2 className="card-heading">Verify Your Phone</h2>
          <p className="otp-modal-subheading">
            Enter the 6-digit verification code sent via SMS to
          </p>
          <div className="otp-target-email-pill">
            <span className="otp-email-text">{maskedDisplay}</span>
            {onBackToRegister && (
              <button
                type="button"
                className="otp-change-email-btn"
                onClick={onBackToRegister}
                title="Change phone number"
              >
                Change Phone Number
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="card-error otp-error-alert" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleVerify} className="otp-form" noValidate>
          <label className="otp-inputs-label">Enter 6-Digit Code</label>
          <div
            className={`otp-inputs-row ${isShaking ? 'error-shake' : ''}`}
            onPaste={handlePaste}
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                id={`otp-digit-${i}`}
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
            <div className="otp-resend-wrap">
              {cooldown > 0 ? (
                <span className="otp-cooldown-text">
                  Resend in <strong>{cooldown}s</strong>
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
            {onBackToRegister && (
              <button
                type="button"
                className="otp-cancel-btn"
                onClick={onBackToRegister}
                disabled={isVerifying}
              >
                Back
              </button>
            )}

            <button
              type="submit"
              className="primary-login-button otp-verify-submit-btn"
              disabled={isVerifying || !isComplete}
            >
              {isVerifying ? (
                <span className="btn-loading-content">
                  <span className="btn-spinner" />
                  <span>Verifying code...</span>
                </span>
              ) : (
                <span>Verify &amp; Create Account</span>
              )}
            </button>
          </div>
        </form>

        <div className="signup-row" style={{ marginTop: '20px' }}>
          <span className="signup-text">Already verified? </span>
          <button
            type="button"
            className="link-button"
            onClick={onSwitchToLogin}
          >
            Sign in
          </button>
        </div>

        <div className="otp-security-footer">
          <ShieldIcon size={14} color="#607289" />
          <span>Protected by Firebase Phone Authentication</span>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
