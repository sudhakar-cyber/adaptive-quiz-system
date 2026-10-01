import React, { useState } from 'react';
import { NavbarLogo } from './NavbarLogo';
import {
  UserIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  LoginArrowIcon,
  GoogleIcon,
  ShieldIcon,
  CheckIcon
} from './Icons';

export const LoginForm = ({ onSwitchToRegister, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast('');
    }, 4000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Please enter your username or email.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(username.trim());
      }
    }, 600);
  };

  const handleGoogleLogin = () => {
    if (onLoginSuccess) {
      onLoginSuccess('Shaik Aathif');
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    showToast('Password reset link sent to your registered email.');
  };

  const handleCreateAccount = (e) => {
    e.preventDefault();
    if (onSwitchToRegister) {
      onSwitchToRegister();
    }
  };

  return (
    <div className="login-card-container">
      {successToast && (
        <div className="notification-toast" role="alert">
          <span className="toast-icon">✓</span>
          <span>{successToast}</span>
        </div>
      )}

      <div className="login-card">
        <div className="card-brand-header">
          <NavbarLogo centered size="large" />
        </div>

        <div className="card-titles">
          <h2 className="card-heading">Welcome Back!</h2>
          <p className="card-subheading">Sign in to continue to your account</p>
        </div>

        {errorMessage && (
          <div className="card-error" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="login-form">
          <div className="form-group">
            <label htmlFor="login-username" className="form-label">
              Username / Email
            </label>
            <div
              className={`input-wrapper ${
                errorMessage && !username.trim() ? 'input-error' : ''
              }`}
            >
              <span className="input-icon-left" aria-hidden="true">
                <UserIcon size={19} color="#8A99AD" />
              </span>
              <input
                id="login-username"
                name="username"
                type="text"
                className="form-input"
                placeholder="Enter your username or email"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                required
                enterKeyHint="next"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <div
              className={`input-wrapper ${
                errorMessage && !password ? 'input-error' : ''
              }`}
            >
              <span className="input-icon-left" aria-hidden="true">
                <LockIcon size={19} color="#8A99AD" />
              </span>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input form-input-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                autoComplete="current-password"
                required
                enterKeyHint="done"
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
          </div>

          <div className="form-options-row">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="native-checkbox"
              />
              <span
                className={`custom-checkbox ${rememberMe ? 'checked' : ''}`}
                aria-hidden="true"
              >
                {rememberMe && <CheckIcon size={12} color="#FFFFFF" />}
              </span>
              <span className="checkbox-label">Remember me</span>
            </label>

            <a
              href="#forgot-password"
              className="forgot-password-link"
              onClick={handleForgotPassword}
            >
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isLoading}
            id="login-submit-btn"
          >
            {isLoading ? (
              <span className="btn-loading-content">
                <span className="btn-spinner" />
                <span>Logging in...</span>
              </span>
            ) : (
              <span className="btn-normal-content">
                <LoginArrowIcon size={19} color="#FFFFFF" />
                <span>Login</span>
              </span>
            )}
          </button>

          <div className="form-divider" aria-hidden="true">
            <span className="divider-line" />
            <span className="divider-label">OR</span>
            <span className="divider-line" />
          </div>

          <button
            type="button"
            className="google-signin-button"
            onClick={handleGoogleLogin}
            id="google-signin-btn"
          >
            <GoogleIcon size={20} />
            <span>Continue with Google</span>
          </button>

          <div className="signup-row">
            <span className="signup-text">New to LearnSmart? </span>
            <a
              href="#create-account"
              className="signup-link"
              onClick={handleCreateAccount}
            >
              Create an account
            </a>
          </div>

          <div className="security-badge-row">
            <ShieldIcon size={16} color="#607289" />
            <span className="security-text">Secure • Fast • Reliable</span>
          </div>
        </form>
      </div>
    </div>
  );
};
