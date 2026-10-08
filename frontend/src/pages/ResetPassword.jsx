import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { NavbarLogo } from '../components/NavbarLogo';
import {
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldIcon,
  CheckIcon,
  LoginArrowIcon,
  MailIcon
} from '../components/Icons';
import { authService } from '../services/authService';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = searchParams.get('oobCode') || '';
  const mode = searchParams.get('mode') || '';
  const token = searchParams.get('token') || '';
  const paramEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(paramEmail);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const resetToken = oobCode || token;

  // Verify the reset token on page load
  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      if (!resetToken && !paramEmail) {
        if (isMounted) {
          setIsVerifyingToken(false);
          setTokenError('No password reset token was provided. Please request a new reset link.');
        }
        return;
      }

      try {
        const res = await authService.verifyResetToken(paramEmail, resetToken, mode);
        if (isMounted) {
          setIsVerifyingToken(false);
          if (res && res.valid) {
            if (res.email) setEmail(res.email);
            setTokenError('');
          } else {
            setTokenError(res?.error || 'This password reset link is invalid or has expired.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setIsVerifyingToken(false);
          setTokenError(err.message || 'Unable to verify reset link. It may have expired.');
        }
      }
    };

    verifyToken();
    return () => {
      isMounted = false;
    };
  }, [resetToken, paramEmail, mode]);

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, text: '', color: '#CBD5E1' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, text: 'Weak', color: '#EF4444' };
      case 2:
        return { score: 50, text: 'Fair', color: '#F59E0B' };
      case 3:
        return { score: 75, text: 'Good', color: '#3B82F6' };
      case 4:
        return { score: 100, text: 'Strong', color: '#10B981' };
      default:
        return { score: 0, text: '', color: '#CBD5E1' };
    }
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password) {
      setErrorMessage('Please enter your new password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your entries.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.confirmResetPassword(email, resetToken, password, mode);
      setIsSubmitting(false);

      if (res && res.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(res?.error || 'Failed to reset password. The link may have expired.');
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'An unexpected error occurred while resetting password.');
    }
  };

  return (
    <main className="page-wrapper reset-password-wrapper">
      <div className="bg-ambient-layer" aria-hidden="true">
        <div className="ambient-blob blob-top-left" />
        <div className="ambient-blob blob-center" />
        <div className="ambient-blob blob-bottom-left" />
      </div>

      <div className="reset-password-container">
        <div className="login-card reset-card">
          <div className="card-brand-header">
            <NavbarLogo centered size="large" />
          </div>

          {/* Loading verification state */}
          {isVerifyingToken && (
            <div className="reset-loading-state" style={{ textAlign: 'center', padding: '36px 16px' }}>
              <span className="btn-spinner" style={{ width: '32px', height: '32px', borderColor: '#1A6BFF', borderTopColor: 'transparent', margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '1.15rem', color: '#0F172A', marginBottom: '8px' }}>
                Verifying Reset Link...
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748B' }}>
                Please wait while we validate your secure password recovery token.
              </p>
            </div>
          )}

          {/* Error / expired token state */}
          {!isVerifyingToken && tokenError && (
            <div className="reset-error-state" style={{ textAlign: 'center', padding: '24px 12px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  fontSize: '28px'
                }}
              >
                ⚠️
              </div>
              <h2 className="card-heading" style={{ marginBottom: '8px', color: '#991B1B' }}>
                Reset Link Expired
              </h2>
              <p className="card-subheading" style={{ marginBottom: '24px', color: '#475569' }}>
                {tokenError}
              </p>
              <Link to="/login" className="submit-button" style={{ textDecoration: 'none', display: 'inline-flex', width: '100%', justifyContent: 'center' }}>
                Return to Login Page
              </Link>
            </div>
          )}

          {/* Success state */}
          {!isVerifyingToken && !tokenError && isSuccess && (
            <div className="reset-success-state" style={{ textAlign: 'center', padding: '24px 12px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)'
                }}
              >
                <CheckIcon size={32} color="#FFFFFF" />
              </div>

              <h2 className="card-heading" style={{ marginBottom: '8px' }}>
                Password Updated!
              </h2>
              <p className="card-subheading" style={{ marginBottom: '24px' }}>
                Your password has been successfully reset. You can now log in with your new credentials.
              </p>

              <button
                type="button"
                className="submit-button"
                onClick={() => navigate('/login')}
                style={{ width: '100%' }}
              >
                <LoginArrowIcon size={19} color="#FFFFFF" />
                <span>Sign In with New Password</span>
              </button>
            </div>
          )}

          {/* Active password reset form */}
          {!isVerifyingToken && !tokenError && !isSuccess && (
            <>
              <div className="card-titles">
                <h2 className="card-heading">Set New Password</h2>
                <p className="card-subheading">
                  Create a new secure password for your registered account.
                </p>
              </div>

              {email && (
                <div className="otp-target-email-pill" style={{ marginBottom: '18px', width: '100%', justifyContent: 'center' }}>
                  <MailIcon size={15} color="#1A6BFF" />
                  <span className="otp-email-text">{email}</span>
                </div>
              )}

              {errorMessage && (
                <div className="card-error" role="alert" style={{ marginBottom: '16px' }}>
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="login-form">
                {/* New Password */}
                <div className="form-group">
                  <label htmlFor="reset-new-password" className="form-label">
                    New Password
                  </label>
                  <div
                    className={`input-wrapper ${
                      errorMessage && (!password || password.length < 6) ? 'input-error' : ''
                    }`}
                  >
                    <span className="input-icon-left" aria-hidden="true">
                      <LockIcon size={19} color="#8A99AD" />
                    </span>
                    <input
                      id="reset-new-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input form-input-password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      autoComplete="new-password"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      className="password-toggle-button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOffIcon size={20} color="#8A99AD" />
                      ) : (
                        <EyeIcon size={20} color="#8A99AD" />
                      )}
                    </button>
                  </div>

                  {/* Password strength meter */}
                  {password && (
                    <div className="password-strength-wrap" style={{ marginTop: '8px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.76rem',
                          marginBottom: '4px',
                          color: '#64748B'
                        }}
                      >
                        <span>Strength:</span>
                        <span style={{ fontWeight: 600, color: strength.color }}>{strength.text}</span>
                      </div>
                      <div
                        style={{
                          height: '4px',
                          width: '100%',
                          background: '#E2E8F0',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${strength.score}%`,
                            background: strength.color,
                            transition: 'width 0.3s ease, background-color 0.3s ease'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                  <label htmlFor="reset-confirm-password" className="form-label">
                    Confirm New Password
                  </label>
                  <div
                    className={`input-wrapper ${
                      errorMessage && password !== confirmPassword ? 'input-error' : ''
                    }`}
                  >
                    <span className="input-icon-left" aria-hidden="true">
                      <LockIcon size={19} color="#8A99AD" />
                    </span>
                    <input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input form-input-password"
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOffIcon size={20} color="#8A99AD" />
                      ) : (
                        <EyeIcon size={20} color="#8A99AD" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting || !password || !confirmPassword}
                  id="reset-submit-btn"
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  {isSubmitting ? (
                    <span className="btn-loading-content">
                      <span className="btn-spinner" />
                      <span>Updating Password...</span>
                    </span>
                  ) : (
                    <span className="btn-normal-content">
                      <CheckIcon size={19} color="#FFFFFF" />
                      <span>Reset Password</span>
                    </span>
                  )}
                </button>

                <div className="signup-row" style={{ marginTop: '16px' }}>
                  <Link to="/login" className="signup-link">
                    &larr; Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}

          <div className="security-badge-row" style={{ marginTop: '20px' }}>
            <ShieldIcon size={16} color="#607289" />
            <span className="security-text">256-Bit Encrypted Password Reset</span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ResetPassword;
