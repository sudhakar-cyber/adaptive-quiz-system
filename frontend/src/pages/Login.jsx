import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavbarLogo } from '../components/NavbarLogo';
import { FeatureList } from '../components/FeatureItem';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { OtpVerification } from '../components/OtpVerification';
import { OAuthVerification } from '../components/OAuthVerification';
import { authService } from '../services/authService';
import { sharedDatabase } from '../services/sharedDatabase';
import deskIllustration from '../assets/desk_illustration_feathered.png';

export const Login = ({ onLoginSuccess, initialView = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentView, setCurrentView] = useState(() => {
    if (initialView && initialView !== 'login') return initialView;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      if (urlView && ['login', 'register', 'otp', 'oauth'].includes(urlView)) {
        return urlView;
      }
      if (window.location.pathname === '/otp') return 'otp';
      if (window.location.pathname === '/register') return 'register';
    } catch {}
    return 'login';
  });

  const [registeredUser, setRegisteredUser] = useState(null);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [demoOtpCode, setDemoOtpCode] = useState('');
  const [loginNotice, setLoginNotice] = useState('');

  // Sync if initialView prop changes
  useEffect(() => {
    if (initialView && ['login', 'register', 'otp', 'oauth'].includes(initialView)) {
      setCurrentView(initialView);
    }
  }, [initialView]);

  const handleLoginSuccess = (user, role = 'student', studentObj = null) => {
    if (role === 'admin') {
      authService.loginAdmin();
      if (onLoginSuccess) {
        onLoginSuccess('Admin', 'admin');
      }
      navigate('/admin-dashboard');
    } else if (role === 'educator') {
      authService.loginEducator();
      if (onLoginSuccess) {
        onLoginSuccess('Educator', 'educator');
      }
      navigate('/educator-dashboard');
    } else {
      const activeStudent = authService.loginStudent(studentObj || user);
      const studentName = activeStudent?.name || (typeof user === 'string' ? user : 'Student');
      if (onLoginSuccess) {
        onLoginSuccess(studentName, 'student');
      }
      navigate('/dashboard');
    }
  };

  const handleRegisterSuccess = (userData) => {
    setRegisteredUser(userData);
    setLoginNotice('');
    const role = userData?.role || 'student';
    handleLoginSuccess(userData?.name || 'Student', role, userData);
  };

  const handleProceedToOtp = (formData, fallbackCode = '') => {
    setPendingRegistration(formData);
    setDemoOtpCode(fallbackCode || '');
    setLoginNotice('');
    setCurrentView('otp');
  };

  const handleOtpVerifiedAndCreateAccount = async (verificationToken) => {
    if (!pendingRegistration) {
      handleLoginSuccess('Student', 'student');
      return;
    }

    try {
      const res = await authService.signupWithFirebase(
        pendingRegistration.email.trim(),
        pendingRegistration.password,
        {
          firstName: pendingRegistration.firstName.trim(),
          lastName: pendingRegistration.lastName.trim(),
          phone: pendingRegistration.phone.trim(),
          country: pendingRegistration.country,
          role: 'student',
          verificationToken
        }
      );

      if (res && res.success && res.student) {
        setRegisteredUser(res.student);
        handleLoginSuccess(res.student.name || 'Student', 'student', res.student);
      } else {
        // Fallback to local sharedDatabase
        const studentName = `${pendingRegistration.firstName.trim()} ${pendingRegistration.lastName.trim()}`.trim() || 'Student';
        const fallbackStudent = sharedDatabase.registerStudent({
          name: studentName,
          email: pendingRegistration.email.trim(),
          phone: pendingRegistration.phone.trim(),
          country: pendingRegistration.country,
          role: 'student'
        });
        authService.loginStudent(fallbackStudent);
        setRegisteredUser(fallbackStudent);
        handleLoginSuccess(fallbackStudent.name, 'student', fallbackStudent);
      }
    } catch (err) {
      console.warn('Signup error, using local registration fallback:', err);
      const studentName = `${pendingRegistration.firstName.trim()} ${pendingRegistration.lastName.trim()}`.trim() || 'Student';
      const fallbackStudent = sharedDatabase.registerStudent({
        name: studentName,
        email: pendingRegistration.email.trim(),
        phone: pendingRegistration.phone.trim(),
        country: pendingRegistration.country,
        role: 'student'
      });
      authService.loginStudent(fallbackStudent);
      setRegisteredUser(fallbackStudent);
      handleLoginSuccess(fallbackStudent.name, 'student', fallbackStudent);
    }
  };

  const handleOAuthSuccess = (verifiedUser) => {
    const student = verifiedUser || registeredUser;
    const role = student?.role || 'student';
    handleLoginSuccess(student?.name || 'Student', role, student);
  };

  return (
    <main className="page-wrapper">
      <div className="bg-ambient-layer" aria-hidden="true">
        <div className="ambient-blob blob-top-left" />
        <div className="ambient-blob blob-center" />
        <div className="ambient-blob blob-bottom-left" />
      </div>

      <div className="page-container">
        <section className="left-hero-section">
          <header className="left-header">
            <NavbarLogo />
          </header>

          <div className="hero-content">
            <h1 className="hero-title">
              Better Learning,
              <br />
              Smarter Path!
            </h1>
            <p className="hero-description">
              Personalized quizzes, real-time feedback,
              <br />
              and smart recommendations for
              <br />
              a brighter future.
            </p>

            <FeatureList />
          </div>

          <div className="illustration-container">
            <img
              src={deskIllustration}
              alt="Interactive Quiz Dashboard illustration with laptop, analytics and books"
              className="desk-illustration-image"
              loading="eager"
            />
          </div>
        </section>

        <section className="right-auth-section">
          <div className="auth-transition-container" key={currentView}>
            {currentView === 'login' && (
              <LoginForm
                initialUsername={registeredUser?.email || ''}
                successNotice={loginNotice}
                onSwitchToRegister={() => {
                  setLoginNotice('');
                  setCurrentView('register');
                }}
                onLoginSuccess={handleLoginSuccess}
              />
            )}
            {currentView === 'register' && (
              <RegisterForm
                initialData={pendingRegistration}
                onSwitchToLogin={() => setCurrentView('login')}
                onRegisterSuccess={handleRegisterSuccess}
                onProceedToOtp={handleProceedToOtp}
              />
            )}
            {currentView === 'otp' && (
              <OtpVerification
                email={pendingRegistration?.email || registeredUser?.email || 'student@learnsmart.edu'}
                initialDemoCode={demoOtpCode}
                onVerifySuccess={handleOtpVerifiedAndCreateAccount}
                onBackToRegister={() => setCurrentView('register')}
                onSwitchToLogin={() => setCurrentView('login')}
              />
            )}
            {currentView === 'oauth' && (
              <OAuthVerification
                registeredUser={registeredUser}
                onOAuthSuccess={handleOAuthSuccess}
                onBackToRegister={() => setCurrentView('register')}
                onSwitchToLogin={() => setCurrentView('login')}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
