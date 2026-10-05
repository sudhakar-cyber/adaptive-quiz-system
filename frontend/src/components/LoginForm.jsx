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
import { sharedDatabase } from '../services/sharedDatabase';

export const LoginForm = ({ initialUsername = '', successNotice = '', onSwitchToRegister, onLoginSuccess }) => {
  const [username, setUsername] = useState(initialUsername || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState(successNotice || '');

  React.useEffect(() => {
    if (initialUsername) {
      setUsername(initialUsername);
    }
  }, [initialUsername]);

  React.useEffect(() => {
    if (successNotice) {
      setSuccessToast(successNotice);
      const timer = setTimeout(() => {
        setSuccessToast('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successNotice]);

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

    const trimmedUser = username.trim();
    const lowerUser = trimmedUser.toLowerCase();

    // Check admin credentials:
    // Email: admin@learnsmart.edu, admin@learnsmart.com, or admin
    // Password: Admin@123 or admin123
    const isAdminTargetEmail =
      lowerUser === 'admin@learnsmart.edu' ||
      lowerUser === 'admin@learnsmart.com' ||
      lowerUser === 'admin';

    const isAdminAttempt =
      isAdminTargetEmail ||
      lowerUser.includes('admin') ||
      password === 'Admin@123' ||
      password === 'admin123';

    if (isAdminAttempt) {
      if (isAdminTargetEmail && (password === 'Admin@123' || password === 'admin123')) {
        setIsLoading(true);
        setTimeout(() => {
          setIsLoading(false);
          if (onLoginSuccess) {
            onLoginSuccess('Admin', 'admin');
          }
        }, 500);
      } else {
        setErrorMessage('Invalid administrator email or password.');
      }
      return;
    }

    // Check educator credentials:
    // Email: Educator@leaensmart.com (also supporting educator@learnsmart.com)
    // Password: Educator@123
    const isEducatorTargetEmail =
      lowerUser === 'educator@leaensmart.com' ||
      lowerUser === 'educator@learnsmart.com';

    const isEducatorAttempt =
      isEducatorTargetEmail ||
      lowerUser === 'educator' ||
      lowerUser.includes('educator') ||
      lowerUser.endsWith('@leaensmart.com') ||
      lowerUser.endsWith('@learnsmart.com') ||
      password === 'Educator@123';

    if (isEducatorAttempt) {
      if (isEducatorTargetEmail && password === 'Educator@123') {
        setIsLoading(true);
        setTimeout(() => {
          setIsLoading(false);
          if (onLoginSuccess) {
            onLoginSuccess('Dr. Priya S.', 'educator');
          }
        }, 500);
      } else {
        setErrorMessage('Invalid educator email or password.');
      }
      return;
    }

    // Authenticate student against shared database
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const student = sharedDatabase.getStudentByUsername(trimmedUser);

      // Check if student was deactivated by educator
      if (student && student.isActive === false) {
        setErrorMessage('This account has been deactivated. Please contact your educator.');
        return;
      }

      if (student) {
        if (student.password && student.password !== password) {
          setErrorMessage('Incorrect password.');
          return;
        }
        if (onLoginSuccess) {
          onLoginSuccess(student.name, 'student', student);
        }
      } else {
        // Register newly logging in student to shared database
        const cleanName = trimmedUser.includes('@')
          ? trimmedUser.split('@')[0].replace(/[._-]/g, ' ')
          : trimmedUser;
        const formattedName = cleanName
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        const newStudent = sharedDatabase.registerStudent({
          name: formattedName || 'Shaik Aathif',
          email: trimmedUser.includes('@')
            ? trimmedUser
            : `${trimmedUser.toLowerCase().replace(/\s+/g, '.')}@learnsmart.edu`,
          password
        });

        if (onLoginSuccess) {
          onLoginSuccess(newStudent.name, 'student', newStudent);
        }
      }
    }, 600);
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Retrieve or register Google student account in shared database
      const googleStudent = sharedDatabase.registerStudent({
        name: 'Alex Morgan',
        firstName: 'Alex',
        lastName: 'Morgan',
        email: 'alex.morgan@gmail.com',
        authProvider: 'google'
      });
      if (onLoginSuccess) {
        onLoginSuccess(googleStudent.name, 'student', googleStudent);
      }
    }, 400);
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
