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
  const [pendingRegistration, setPendingRegistration] = useState(() => {
    try {
      const saved = sessionStorage.getItem('learnsmart_pending_reg');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [loginNotice, setLoginNotice] = useState('');

  // Sync if initialView prop or route pathname changes
  useEffect(() => {
    if (location.pathname === '/register') {
      setCurrentView('register');
    } else if (location.pathname === '/otp') {
      setCurrentView('otp');
    } else if (location.pathname === '/login' || location.pathname === '/') {
      const params = new URLSearchParams(location.search);
      const urlView = params.get('view');
      if (urlView && ['login', 'register', 'otp', 'oauth'].includes(urlView)) {
        setCurrentView(urlView);
      } else if (!initialView || initialView === 'login') {
        setCurrentView('login');
      } else {
        setCurrentView(initialView);
      }
    } else if (initialView && ['login', 'register', 'otp', 'oauth'].includes(initialView)) {
      setCurrentView(initialView);
    }
  }, [initialView, location.pathname, location.search]);

  const handleLoginSuccess = (user, role = 'student', studentObj = null) => {
    if (role === 'admin') {
      authService.loginAdmin();
      if (onLoginSuccess) {
        onLoginSuccess('Admin', 'admin');
      }
      navigate('/admin-dashboard');
    } else if (role === 'educator') {
      const eduPayload = studentObj || user;
      authService.loginEducator(eduPayload);
      if (onLoginSuccess) {
        onLoginSuccess(eduPayload || 'Educator', 'educator');
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
    try {
      sessionStorage.removeItem('learnsmart_pending_reg');
    } catch {}
    const role = userData?.role || 'student';
    handleLoginSuccess(userData?.name || 'Student', role, userData);
  };

  const handleProceedToOtp = (formData, maskedPhone = '') => {
    const combined = {
      ...formData,
      maskedPhone
    };
    setPendingRegistration(combined);
    try {
      sessionStorage.setItem('learnsmart_pending_reg', JSON.stringify(combined));
    } catch {}
    setLoginNotice('');
    setCurrentView('otp');
    try {
      navigate('/otp');
    } catch {}
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
        try { sessionStorage.removeItem('learnsmart_pending_reg'); } catch {}
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
        try { sessionStorage.removeItem('learnsmart_pending_reg'); } catch {}
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
      try { sessionStorage.removeItem('learnsmart_pending_reg'); } catch {}
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
                  try {
                    navigate('/register');
                  } catch {}
                }}
                onLoginSuccess={handleLoginSuccess}
              />
            )}
            {currentView === 'register' && (
              <RegisterForm
                initialData={pendingRegistration}
                onSwitchToLogin={() => {
                  setCurrentView('login');
                  try {
                    navigate('/login');
                  } catch {}
                }}
                onRegisterSuccess={handleRegisterSuccess}
                onProceedToOtp={handleProceedToOtp}
              />
            )}
            {currentView === 'otp' && (
              <OtpVerification
                phone={pendingRegistration?.phone || ''}
                country={pendingRegistration?.country || 'India'}
                displayPhone={pendingRegistration?.maskedPhone || ''}
                registrationData={pendingRegistration}
                onVerifySuccess={handleRegisterSuccess}
                onBackToRegister={() => {
                  setCurrentView('register');
                  try {
                    navigate('/register');
                  } catch {}
                }}
                onSwitchToLogin={() => {
                  setCurrentView('login');
                  try {
                    navigate('/login');
                  } catch {}
                }}
              />
            )}
            {currentView === 'oauth' && (
              <OAuthVerification
                registeredUser={registeredUser}
                onOAuthSuccess={handleOAuthSuccess}
                onBackToRegister={() => {
                  setCurrentView('register');
                  try {
                    navigate('/register');
                  } catch {}
                }}
                onSwitchToLogin={() => {
                  setCurrentView('login');
                  try {
                    navigate('/login');
                  } catch {}
                }}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
