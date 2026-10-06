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
import { authService } from '../services/authService';

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

  const handleSubmit = async (e) => {
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

    setIsLoading(true);

    try {
      let resolvedRole = null;
      let resolvedProfile = null;
      let resolvedName = '';

      // 1. If username format looks like an email, attempt Firebase Authentication
      if (trimmedUser.includes('@')) {
        const fbRes = await authService.loginWithFirebase(trimmedUser, password);
        if (fbRes && fbRes.success && fbRes.user) {
          const authUser = fbRes.user;

          // Check if this Firebase authenticated user matches Admin
          const adminUser = typeof sharedDatabase.getAdminUser === 'function'
            ? sharedDatabase.getAdminUser(trimmedUser)
            : null;

          if (adminUser || lowerUser === 'admin@learnsmart.edu') {
            resolvedRole = 'admin';
            resolvedProfile = adminUser || { name: 'Admin', email: authUser.email, role: 'admin' };
            resolvedName = resolvedProfile.name || 'Admin';
          } else {
            // Check if user is a registered Educator
            const educator = typeof sharedDatabase.getEducatorByEmail === 'function'
              ? sharedDatabase.getEducatorByEmail(trimmedUser)
              : sharedDatabase.getAllEducators().find((edu) => edu.email && edu.email.toLowerCase() === lowerUser);

            if (educator) {
              if (educator.isActive === false) {
                await authService.logout();
                setIsLoading(false);
                setErrorMessage('This account has been deactivated. Please contact your administrator.');
                return;
              }
              resolvedRole = 'educator';
              resolvedProfile = educator;
              resolvedName = educator.name || 'Educator';
            } else {
              // Check if user is a registered Student
              const student = sharedDatabase.getStudentByEmail(trimmedUser) ||
                sharedDatabase.getStudentByUid(authUser.uid);

              if (student) {
                if (student.isActive === false) {
                  await authService.logout();
                  setIsLoading(false);
                  setErrorMessage('This account has been deactivated. Please contact your educator.');
                  return;
                }
                resolvedRole = student.role || 'student';
                resolvedProfile = student;
                resolvedName = student.name || 'Student';
              } else {
                // Verified via Firebase Auth, sync as student
                const studentName = (authUser.displayName && authUser.displayName.trim()) || authUser.email.split('@')[0];
                const newStudent = sharedDatabase.registerStudent({
                  name: studentName,
                  email: authUser.email,
                  uid: authUser.uid,
                  password,
                  authProvider: 'firebase'
                });
                resolvedRole = 'student';
                resolvedProfile = newStudent;
                resolvedName = newStudent.name;
              }
            }
          }
        } else if (fbRes?.error) {
          // Check for account status Firebase errors
          if (fbRes.error.code === 'auth/user-disabled') {
            setIsLoading(false);
            setErrorMessage('This account has been disabled. Please contact support.');
            return;
          }
          if (fbRes.error.code === 'auth/too-many-requests') {
            setIsLoading(false);
            setErrorMessage('Too many unsuccessful login attempts. Please try again later.');
            return;
          }
        }
      }

      // 2. If Firebase authentication did not resolve a profile (e.g. offline, username login, or local-only accounts)
      // verify strictly against the project's registered accounts database (sharedDatabase)
      if (!resolvedProfile) {
        // A. Check registered students
        const student = sharedDatabase.getStudentByUsername(trimmedUser);
        if (student) {
          if (!student.password || student.password !== password) {
            setIsLoading(false);
            setErrorMessage('Invalid email or password.');
            return;
          }
          if (student.isActive === false) {
            setIsLoading(false);
            setErrorMessage('This account has been deactivated. Please contact your educator.');
            return;
          }
          resolvedRole = student.role || 'student';
          resolvedProfile = student;
          resolvedName = student.name || 'Student';
        }

        // B. Check registered educators
        if (!resolvedProfile) {
          const educator = typeof sharedDatabase.getEducatorByUsername === 'function'
            ? sharedDatabase.getEducatorByUsername(trimmedUser)
            : sharedDatabase.getAllEducators().find(
                (edu) =>
                  (edu.email && edu.email.toLowerCase() === lowerUser) ||
                  (edu.name && edu.name.toLowerCase() === lowerUser)
              );

          if (educator) {
            if (!educator.password || educator.password !== password) {
              setIsLoading(false);
              setErrorMessage('Invalid email or password.');
              return;
            }
            if (educator.isActive === false) {
              setIsLoading(false);
              setErrorMessage('This account has been deactivated. Please contact your administrator.');
              return;
            }
            resolvedRole = 'educator';
            resolvedProfile = educator;
            resolvedName = educator.name || 'Educator';
          }
        }

        // C. Check registered admin
        if (!resolvedProfile && typeof sharedDatabase.getAdminUser === 'function') {
          const admin = sharedDatabase.getAdminUser(trimmedUser);
          if (admin) {
            if (!admin.password || admin.password !== password) {
              setIsLoading(false);
              setErrorMessage('Invalid email or password.');
              return;
            }
            if (admin.isActive === false) {
              setIsLoading(false);
              setErrorMessage('This account has been deactivated. Please contact your administrator.');
              return;
            }
            resolvedRole = 'admin';
            resolvedProfile = admin;
            resolvedName = admin.name || 'Admin';
          }
        }
      }

      // 3. If no registered user matched with valid credentials, reject login
      if (!resolvedProfile) {
        setIsLoading(false);
        setErrorMessage('Invalid email or password.');
        return;
      }

      // 4. Successful authentication -> Route based on resolved role
      setIsLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(resolvedName, resolvedRole, resolvedProfile);
      }
    } catch (err) {
      console.error('Login authentication error:', err);
      setIsLoading(false);
      setErrorMessage('Invalid email or password.');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await authService.loginWithGoogle();
      setIsLoading(false);
      if (res && res.success && res.student) {
        if (onLoginSuccess) {
          onLoginSuccess(res.student.name, 'student', res.student);
        }
        return;
      } else if (res && !res.success && res.error) {
        if (res.error.code !== 'auth/popup-closed-by-user' && res.error.code !== 'auth/cancelled-popup-request') {
          showToast(res.error.message || 'Google Sign-In failed.');
        }
      }
    } catch (e) {
      setIsLoading(false);
      console.warn('Firebase Google Login popup:', e);
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        showToast(e.message || 'Google Sign-In failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (username.trim() && username.includes('@')) {
      const res = await authService.sendPasswordReset(username.trim());
      if (res && res.success) {
        showToast(`Password reset link sent to ${username.trim()}`);
        return;
      }
    }
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
