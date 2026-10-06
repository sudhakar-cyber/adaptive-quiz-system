import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavbarLogo } from '../components/NavbarLogo';
import { FeatureList } from '../components/FeatureItem';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { OAuthVerification } from '../components/OAuthVerification';
import { authService } from '../services/authService';
import deskIllustration from '../assets/desk_illustration_feathered.png';

export const Login = ({ onLoginSuccess }) => {
  const [currentView, setCurrentView] = useState('login');
  const [registeredUser, setRegisteredUser] = useState(null);
  const navigate = useNavigate();

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

  const [loginNotice, setLoginNotice] = useState('');

  const handleRegisterSuccess = (userData, isGoogleAuth = false) => {
    setRegisteredUser(userData);
    setLoginNotice('');
    const role = userData?.role || 'student';
    handleLoginSuccess(userData?.name || 'Student', role, userData);
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
                onSwitchToLogin={() => setCurrentView('login')}
                onRegisterSuccess={handleRegisterSuccess}
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
