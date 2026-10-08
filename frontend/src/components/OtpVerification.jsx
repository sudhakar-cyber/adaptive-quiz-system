import React, { useState, useEffect, useRef } from 'react';
import { NavbarLogo } from './NavbarLogo';
import { MailIcon, ShieldIcon, CheckIcon } from './Icons';
import { otpService } from '../services/otpService';

export const OtpVerification = ({
  email = '',
  initialDemoCode = '',
  onVerifySuccess,
  onBackToRegister,
  onSwitchToLogin
}) => {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [expirySeconds, setExpirySeconds] = useState(10 * 60);
  const [demoCode, setDemoCode] = useState(initialDemoCode || '');
  const [isShaking, setIsShaking] = useState(false);

  const inputRefs = useRef([]);

  // Check sessionStorage for demo code fallback if available
  useEffect(() => {
    if (!demoCode && email) {
      try {
        const raw = sessionStorage.getItem(`learnsmart_otp_${email.trim().toLowerCase()}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.code) {
            setDemoCode(parsed.code);
          }
        }
      } catch {}
    }
  }, [email, demoCode]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Expiration countdown
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
    }, 4000);
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
        showToast('Verification successful! Creating your account...');
        if (onVerifySuccess) {
          onVerifySuccess(res.verificationToken);
        }
      } else {
        setErrorMessage(
          res?.error || 'Incorrect verification code. Please check your email and try again.'
        );
        // Automatically clear all OTP input fields when wrong
        setDigits(['', '', '', '']);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 10);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
      // Automatically clear all OTP input fields on error
      setDigits(['', '', '', '']);
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
      const res = await otpService.resendOtp(email);
      if (res && res.success) {
        setDigits(['', '', '', '']);
        setCooldown(res.cooldownSeconds || 60);
        setExpirySeconds(10 * 60);
        if (res.fallbackCode || res.demoOtp) {
          setDemoCode(res.fallbackCode || res.demoOtp);
        }
        showToast(`A new verification code has been sent to ${email}`);
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(res.error || 'Failed to resend code. Please wait a moment.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification code.');
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
            <MailIcon size={26} color="#1A6BFF" />
          </div>
          <h2 className="card-heading">Verify Your Email</h2>
          <p className="otp-modal-subheading">
            Enter the 4-digit verification code sent to
          </p>
          <div className="otp-target-email-pill">
            <span className="otp-email-text">{email}</span>
            {onBackToRegister && (
              <button
                type="button"
                className="otp-change-email-btn"
                onClick={onBackToRegister}
                title="Change or edit your email"
              >
                Change
              </button>
            )}
          </div>
        </div>

        {demoCode && (
          <div className="otp-demo-hint" role="status">
            <span>Verification code: <strong>{demoCode}</strong></span>
          </div>
        )}

        {errorMessage && (
          <div className="card-error otp-error-alert" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleVerify} className="otp-form" noValidate>
          <label className="otp-inputs-label">Enter 4-Digit Code</label>
          <div className={`otp-inputs-row ${isShaking ? 'error-shake' : ''}`} onPaste={handlePaste}>
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
                  Resend in <strong>{cooldown}s</strong>
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
            <span>Official 2-Step Verification • Never share your code</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OtpVerification;
