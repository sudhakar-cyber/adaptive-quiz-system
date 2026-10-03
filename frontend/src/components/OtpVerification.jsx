import React, { useState, useRef, useEffect } from 'react';
import { NavbarLogo } from './NavbarLogo';
import { ShieldIcon, CheckIcon } from './Icons';

export const OtpVerification = ({
  email = 'alex.morgan@example.com',
  onConfirmSuccess,
  onBackToRegister
}) => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast('');
    }, 4000);
  };

  const handleInputChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    if (errorMessage) setErrorMessage('');

    if (!cleaned) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    const digit = cleaned.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (index < 3 && digit) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs[index - 1].current?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const newOtp = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pasted.length, 3);
    inputRefs[nextIndex].current?.focus();
  };

  const handleResend = () => {
    if (!canResend) return;
    setOtp(['', '', '', '']);
    setTimer(45);
    setCanResend(false);
    setErrorMessage('');
    showToast('A new 4-digit code has been sent to your email.');
    inputRefs[0].current?.focus();
  };

  const handleConfirmOtp = (e) => {
    e.preventDefault();
    const enteredCode = otp.join('');

    if (enteredCode.length < 4) {
      setErrorMessage('Please enter the full 4-digit code.');
      const firstEmpty = otp.findIndex((d) => !d);
      if (firstEmpty !== -1) {
        inputRefs[firstEmpty].current?.focus();
      }
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      setIsLoading(false);
      if (onConfirmSuccess) {
        onConfirmSuccess();
      }
    }, 400);
  };

  const maskedEmail = (() => {
    if (!email || !email.includes('@')) return email || 'your email';
    const [user, domain] = email.split('@');
    if (user.length <= 2) return `${user}***@${domain}`;
    return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
  })();

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

        <div className="card-titles">
          <h2 className="card-heading">Verification Code</h2>
          <p className="card-subheading">
            We've sent a 4-digit verification code to
            <br />
            <strong className="otp-email-highlight">{maskedEmail}</strong>
          </p>
        </div>

        {errorMessage && (
          <div className="card-error" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleConfirmOtp} className="login-form otp-form">
          <div className="otp-boxes-wrapper" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`otp-digit-input ${digit ? 'filled' : ''} ${
                  errorMessage ? 'error' : ''
                }`}
                aria-label={`Digit ${idx + 1}`}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <div className="otp-resend-row">
            <span className="otp-resend-text">Didn't receive code? </span>
            {canResend ? (
              <button
                type="button"
                className="link-button otp-resend-btn"
                onClick={handleResend}
              >
                Resend Code
              </button>
            ) : (
              <span className="otp-timer-text">
                Resend in <strong>0:{timer < 10 ? `0${timer}` : timer}</strong>
              </span>
            )}
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isLoading}
            id="confirm-otp-btn"
          >
            {isLoading ? (
              <span className="btn-loading-content">
                <span className="btn-spinner" />
                <span>Verifying code...</span>
              </span>
            ) : (
              <span className="btn-normal-content">
                <CheckIcon size={14} color="#FFFFFF" />
                <span>Confirm OTP</span>
              </span>
            )}
          </button>

          <div className="signup-row">
            <span className="signup-text">Wrong details? </span>
            <button
              type="button"
              className="link-button"
              onClick={onBackToRegister}
            >
              Back to Registration
            </button>
          </div>

          <div className="security-badge-row">
            <ShieldIcon size={15} color="#607289" />
            <span className="security-text">Secure • Fast • Reliable</span>
          </div>
        </form>
      </div>
    </div>
  );
};
