import React, { useState } from 'react';
import { NavbarLogo } from './components/NavbarLogo';
import { FeatureList } from './components/FeatureItem';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { OtpVerification } from './components/OtpVerification';
import { Dashboard } from './components/Dashboard';
import deskIllustration from './assets/desk_illustration_feathered.png';

const getStoredUser = () => {
  try {
    return localStorage.getItem('learnsmart_user');
  } catch {
    return null;
  }
};

export function App() {
  const [currentView, setCurrentView] = useState(() => {
    return getStoredUser() ? 'dashboard' : 'login';
  });
  const [loggedInUser, setLoggedInUser] = useState(() => {
    return getStoredUser() || '';
  });
  const [registeredUser, setRegisteredUser] = useState({
    email: '',
    firstName: ''
  });

  const handleLoginSuccess = (user) => {
    const username = user || 'Shaik Aathif';
    setLoggedInUser(username);
    try {
      localStorage.setItem('learnsmart_user', username);
    } catch (err) {
      console.error('Failed to save session:', err);
    }
    setCurrentView('dashboard');
  };

  const handleRegisterSuccess = (userData) => {
    setRegisteredUser(userData);
    setCurrentView('otp');
  };

  const handleOtpSuccess = () => {
    setLoggedInUser(registeredUser.firstName || 'Shaik Aathif');
    setCurrentView('login');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('learnsmart_user');
      localStorage.removeItem('learnsmart_avatar');
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
    setLoggedInUser('');
    setCurrentView('login');
  };

  if (currentView === 'dashboard') {
    return <Dashboard username={loggedInUser} onLogout={handleLogout} />;
  }

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
                onSwitchToRegister={() => setCurrentView('register')}
                onLoginSuccess={handleLoginSuccess}
              />
            )}
            {currentView === 'register' && (
              <RegisterForm
                onSwitchToLogin={() => setCurrentView('login')}
                onRegisterSuccess={handleRegisterSuccess}
              />
            )}
            {currentView === 'otp' && (
              <OtpVerification
                email={registeredUser.email}
                onConfirmSuccess={handleOtpSuccess}
                onBackToRegister={() => setCurrentView('register')}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
