import React, { useState, useEffect, useRef } from 'react';
import { NavbarLogo } from './NavbarLogo';
import { PhoneIcon, ShieldIcon, CheckIcon } from './Icons';
import { phoneAuthService } from '../services/phoneAuthService';

export const OtpVerification = ({
  phone = '',
  country = 'United States',
  displayPhone = '',
  email = '',
  registrationData = null,
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
  const [expirySeconds, setExpirySeconds] = useState(10 * 60);
  const [isShaking, setIsShaking] = useState(false);

  const inputRefs = useRef([]);

  // Resolve target formatted phone display
  const targetRawPhone = registrationData?.phone || phone || '';
  const targetCountry = registrationData?.country || country || 'United States';
  const targetDisplayPhone =
    displayPhone ||
    phoneAuthService.formatPhoneDisplay(
      phoneAuthService.formatToE164(targetRawPhone, targetCountry)
    ) ||
    targetRawPhone;

  // Auto-focus first input box on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
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

  // 10-minute code expiration countdown
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const timer = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [expirySeconds]);

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast('');
    }, 4500);
  };

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

    // Auto-advance focus to next digit box
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
        showToast('Phone number verified! Account created successfully.');
        if (onVerifySuccess) {
          onVerifySuccess(res.student || res.user);
        }
      } else {
        setErrorMessage(
          res?.error || 'Incorrect verification code. Please check your SMS and try again.'
        );
        // Automatically clear OTP input fields when verification fails
        setDigits(['', '', '', '', '', '']);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 10);
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'Verification failed. Please check your code and try again.'
      );
      setDigits(['', '', '', '', '', '']);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
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
        setCooldown(res.cooldownSeconds || 60);
        setExpirySeconds(10 * 60);
        showToast(res.message || `A new verification code has been sent to ${targetDisplayPhone}`);
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
            <PhoneIcon size={26} color="#1A6BFF" />
          </div>
          <h2 className="card-heading">Verify Mobile Number</h2>
          <p className="otp-modal-subheading">
            Enter the 6-digit SMS verification code sent to
          </p>
          <div className="otp-target-email-pill">
            <span className="otp-email-text">{targetDisplayPhone || 'Your mobile number'}</span>
            {onBackToRegister && (
              <button
                type="button"
                className="otp-change-email-btn"
                onClick={onBackToRegister}
                title="Change or edit your mobile number"
              >
                Change
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
            <span className="otp-expiry-indicator">
              {expirySeconds > 0 ? (
                <>
                  Expires in <strong>{formatTimer(expirySeconds)}</strong>
                </>
              ) : (
                <span className="otp-expired-warning">Code expired</span>
              )}
            </span>

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
                  {isResending ? 'Sending SMS...' : 'Resend OTP'}
                </button>
              )}
            </div>
          </div>

          <div className="otp-actions-row">
            <button
              type="submit"
              className="submit-button otp-verify-submit-btn"
              id="verify-otp-submit-btn"
              disabled={!isComplete || isVerifying}
            >
              {isVerifying ? (
                <span className="btn-loading-content">
                  <span className="btn-spinner" />
                  <span>Verifying OTP...</span>
                </span>
              ) : (
                <span className="btn-normal-content">
                  <CheckIcon size={18} color="#FFFFFF" />
                  <span>Verify OTP &amp; Create Account</span>
                </span>
              )}
            </button>
          </div>

          {onBackToRegister && (
            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <button
                type="button"
                className="link-button"
                onClick={onBackToRegister}
                style={{ fontSize: '0.84rem' }}
              >
                Change Mobile Number
              </button>
            </div>
          )}

          {onSwitchToLogin && (
            <div className="signup-row" style={{ marginTop: '12px' }}>
              <span className="signup-text">Already have an account? </span>
              <button
                type="button"
                className="link-button"
                onClick={onSwitchToLogin}
              >
                Login
              </button>
            </div>
          )}

          <div className="otp-security-footer">
            <ShieldIcon size={14} color="#64748B" />
            <span>Official Firebase SMS Verification • Never share your OTP</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OtpVerification;
