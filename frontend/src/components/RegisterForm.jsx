import React, { useState } from 'react';
import { NavbarLogo } from './NavbarLogo';
import {
  UserIcon,
  MailIcon,
  LockIcon,
  PhoneIcon,
  GlobeIcon,
  EyeIcon,
  EyeOffIcon,
  UserPlusIcon,
  GoogleIcon,
  ShieldIcon,
  CheckIcon,
  ChevronDownIcon
} from './Icons';

import { sharedDatabase } from '../services/sharedDatabase';
import { authService } from '../services/authService';

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'India',
  'Germany',
  'France',
  'Singapore',
  'Japan',
  'United Arab Emirates',
  'Brazil',
  'Other'
];

export const RegisterForm = ({ onSwitchToLogin, onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: 'United States',
    agreeTerms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast('');
    }, 4000);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.firstName.trim()) {
      setErrorMessage('Please enter your first name.');
      return;
    }
    if (!formData.lastName.trim()) {
      setErrorMessage('Please enter your last name.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!formData.password) {
      setErrorMessage('Please create a password.');
      return;
    }
    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage('Please enter your phone number.');
      return;
    }
    if (!formData.agreeTerms) {
      setErrorMessage('Please agree to the Terms and Conditions to proceed.');
      return;
    }

    setIsLoading(true);

    authService
      .signupWithFirebase(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        country: formData.country
      })
      .then((res) => {
        setIsLoading(false);
        if (res && res.success && res.student) {
          if (onRegisterSuccess) {
            onRegisterSuccess(res.student);
          }
        } else {
          if (res?.error?.message) {
            const cleanErr = res.error.message.replace(/Firebase:\s*/i, '').replace(/\(auth\/[^)]+\)\.?/i, '').trim();
            setErrorMessage(cleanErr || 'Registration error. Please check your details.');
            return;
          }
          const newStudent = sharedDatabase.registerStudent({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            country: formData.country,
            authProvider: 'local'
          });
          if (onRegisterSuccess) {
            onRegisterSuccess(newStudent);
          }
        }
      })
      .catch((err) => {
        setIsLoading(false);
        setErrorMessage(err.message || 'Registration failed.');
      });
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const res = await authService.loginWithGoogle();
      setIsLoading(false);
      if (res && res.success && res.student) {
        if (onRegisterSuccess) {
          onRegisterSuccess(res.student);
        }
        return;
      } else if (res && !res.success && res.error) {
        if (res.error.code !== 'auth/popup-closed-by-user' && res.error.code !== 'auth/cancelled-popup-request') {
          setErrorMessage(res.error.message || 'Google sign-up failed.');
        }
      }
    } catch (e) {
      setIsLoading(false);
      console.warn('Firebase Google signup:', e);
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        setErrorMessage(e.message || 'Google sign-up failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-card-container register-card-container">
      {successToast && (
        <div className="notification-toast" role="alert">
          <span className="toast-icon">✓</span>
          <span>{successToast}</span>
        </div>
      )}

      <div className="login-card register-card">
        <div className="card-brand-header">
          <NavbarLogo centered size="large" />
        </div>

        <div className="card-titles">
          <h2 className="card-heading">Create Account</h2>
          <p className="card-subheading">
            Join LearnSmart Adaptive Quiz System today
          </p>
        </div>

        {errorMessage && (
          <div className="card-error" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="login-form">
          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="reg-firstName" className="form-label">
                First Name
              </label>
              <div
                className={`input-wrapper ${
                  errorMessage && !formData.firstName.trim() ? 'input-error' : ''
                }`}
              >
                <span className="input-icon-left" aria-hidden="true">
                  <UserIcon size={18} color="#8A99AD" />
                </span>
                <input
                  id="reg-firstName"
                  name="firstName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Alex"
                  value={formData.firstName}
                  onChange={handleChange}
                  autoComplete="given-name"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-lastName" className="form-label">
                Last Name
              </label>
              <div
                className={`input-wrapper ${
                  errorMessage && !formData.lastName.trim() ? 'input-error' : ''
                }`}
              >
                <span className="input-icon-left" aria-hidden="true">
                  <UserIcon size={18} color="#8A99AD" />
                </span>
                <input
                  id="reg-lastName"
                  name="lastName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Morgan"
                  value={formData.lastName}
                  onChange={handleChange}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              Email Address
            </label>
            <div
              className={`input-wrapper ${
                errorMessage && !formData.email.trim() ? 'input-error' : ''
              }`}
            >
              <span className="input-icon-left" aria-hidden="true">
                <MailIcon size={18} color="#8A99AD" />
              </span>
              <input
                id="reg-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                spellCheck="false"
                required
              />
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="reg-password" className="form-label">
                Password
              </label>
              <div
                className={`input-wrapper ${
                  errorMessage && !formData.password ? 'input-error' : ''
                }`}
              >
                <span className="input-icon-left" aria-hidden="true">
                  <LockIcon size={18} color="#8A99AD" />
                </span>
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input form-input-password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOffIcon size={18} color="#8A99AD" />
                  ) : (
                    <EyeIcon size={18} color="#8A99AD" />
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirmPassword" className="form-label">
                Confirm Password
              </label>
              <div
                className={`input-wrapper ${
                  errorMessage &&
                  (!formData.confirmPassword ||
                    formData.password !== formData.confirmPassword)
                    ? 'input-error'
                    : ''
                }`}
              >
                <span className="input-icon-left" aria-hidden="true">
                  <LockIcon size={18} color="#8A99AD" />
                </span>
                <input
                  id="reg-confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input form-input-password"
                  placeholder="Confirm"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon size={18} color="#8A99AD" />
                  ) : (
                    <EyeIcon size={18} color="#8A99AD" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="reg-country" className="form-label">
                Select Country
              </label>
              <div className="input-wrapper select-wrapper">
                <span className="input-icon-left" aria-hidden="true">
                  <GlobeIcon size={18} color="#8A99AD" />
                </span>
                <select
                  id="reg-country"
                  name="country"
                  className="form-input form-select"
                  value={formData.country}
                  onChange={handleChange}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="select-arrow" aria-hidden="true">
                  <ChevronDownIcon size={15} color="#8A99AD" />
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone" className="form-label">
                Phone Number
              </label>
              <div
                className={`input-wrapper ${
                  errorMessage && !formData.phone.trim() ? 'input-error' : ''
                }`}
              >
                <span className="input-icon-left" aria-hidden="true">
                  <PhoneIcon size={18} color="#8A99AD" />
                </span>
                <input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  className="form-input"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  required
                />
              </div>
            </div>
          </div>

          <div className="terms-checkbox-row">
            <label className="checkbox-container">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                className="native-checkbox"
              />
              <span
                className={`custom-checkbox ${
                  formData.agreeTerms ? 'checked' : ''
                }`}
                aria-hidden="true"
              >
                {formData.agreeTerms && <CheckIcon size={11} color="#FFFFFF" />}
              </span>
              <span className="checkbox-label terms-label">
                I agree to the{' '}
                <a
                  href="#terms"
                  className="terms-link"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast('Opening Terms & Conditions...');
                  }}
                >
                  Terms and Conditions
                </a>{' '}
                and Privacy Policy
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isLoading}
            id="register-submit-btn"
          >
            {isLoading ? (
              <span className="btn-loading-content">
                <span className="btn-spinner" />
                <span>Creating account...</span>
              </span>
            ) : (
              <span className="btn-normal-content">
                <UserPlusIcon size={18} color="#FFFFFF" />
                <span>Create Account</span>
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
            onClick={handleGoogleSignup}
            id="google-signup-btn"
          >
            <GoogleIcon size={19} />
            <span>Continue with Google</span>
          </button>

          <div className="signup-row">
            <span className="signup-text">Already have an account? </span>
            <button
              type="button"
              className="link-button"
              onClick={onSwitchToLogin}
            >
              Login
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
