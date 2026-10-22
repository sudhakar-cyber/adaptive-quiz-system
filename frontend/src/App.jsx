import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { EducatorDashboard } from './pages/EducatorDashboard';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminRoute, EducatorRoute, StudentRoute } from './routes/ProtectedRoute';
import { authService } from './services/authService';
import { homeRouteForRole } from './services/apiClient';
import { auth, onAuthStateChanged } from './config/firebase';
import { useTheme } from './components/ThemeToggle';

function AppRoutes() {
  useTheme();
  const navigate = useNavigate();
  const [studentUser, setStudentUser] = useState(() => {
    try {
      const savedProfile = JSON.parse(localStorage.getItem('learnsmart_student_profile') || 'null');
      if (savedProfile?.fullName && savedProfile.fullName.trim() && !savedProfile.fullName.includes('@') && savedProfile.fullName !== 'Student') {
        return savedProfile.fullName.trim();
      }
      const storedUser = localStorage.getItem('learnsmart_user');
      if (storedUser && storedUser.trim() && storedUser !== 'Student' && !storedUser.includes('@')) {
        return storedUser.trim();
      }
      const fbUser = auth.currentUser;
      if (fbUser?.displayName && fbUser.displayName.trim()) {
        return fbUser.displayName.trim();
      }
      return 'Student';
    } catch {
      return 'Student';
    }
  });

  // Keep student user synchronized with auth, profile updates, and storage events
  useEffect(() => {
    const syncCurrentName = () => {
      try {
        const savedProfile = JSON.parse(localStorage.getItem('learnsmart_student_profile') || 'null');
        if (savedProfile?.fullName && savedProfile.fullName.trim() && !savedProfile.fullName.includes('@') && savedProfile.fullName !== 'Student') {
          setStudentUser(savedProfile.fullName.trim());
          return;
        }
      } catch {}
      const activeUser = localStorage.getItem('learnsmart_user');
      if (activeUser && activeUser.trim() && activeUser !== 'Student' && !activeUser.includes('@')) {
        setStudentUser(activeUser.trim());
      }
    };

    const handleProfileUpdate = (e) => {
      const name = e.detail?.fullName || (typeof e.detail === 'string' ? e.detail : null);
      if (name && name.trim()) {
        setStudentUser(name.trim());
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      const storedRole = localStorage.getItem('learnsmart_role');
      if (storedRole === 'educator' || storedRole === 'admin') {
        return;
      }
      try {
        const savedProfile = JSON.parse(localStorage.getItem('learnsmart_student_profile') || 'null');
        if (savedProfile?.fullName && savedProfile.fullName.trim() && !savedProfile.fullName.includes('@') && savedProfile.fullName !== 'Student') {
          setStudentUser(savedProfile.fullName.trim());
          return;
        }
      } catch {}
      if (user?.displayName && user.displayName.trim()) {
        setStudentUser(user.displayName.trim());
      } else if (!user) {
        if (!storedRole) {
          setStudentUser(null);
        }
      }
    });

    window.addEventListener('storage', syncCurrentName);
    window.addEventListener('learnsmart_user_profile_updated', handleProfileUpdate);
    window.addEventListener('learnsmart_user_updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('storage', syncCurrentName);
      window.removeEventListener('learnsmart_user_profile_updated', handleProfileUpdate);
      window.removeEventListener('learnsmart_user_updated', handleProfileUpdate);
      unsubscribeAuth();
    };
  }, []);

  const handleLoginSuccess = (user, role, profile = null) => {
    const resolvedRole = role || 'student';

    if (resolvedRole === 'admin') {
      authService.loginAdmin(profile || user);
    } else if (resolvedRole === 'educator') {
      authService.loginEducator(profile || user);
    } else {
      authService.loginStudent(profile || user);
      setStudentUser(typeof user === 'string' ? user : user?.name || 'Student');
    }

    navigate(homeRouteForRole(resolvedRole));
  };

  const handleAdminLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const handleEducatorLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const handleStudentLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <Routes>
      {/* Login & Landing Routes */}
      <Route
        path="/login"
        element={<Login onLoginSuccess={handleLoginSuccess} />}
      />
      <Route
        path="/register"
        element={<Login onLoginSuccess={handleLoginSuccess} initialView="register" />}
      />
      <Route
        path="/otp"
        element={<Login onLoginSuccess={handleLoginSuccess} initialView="otp" />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* Role-Protected Admin Dashboard */}
      <Route
        path="/admin-dashboard"
        element={
          <AdminRoute>
            <AdminDashboard onLogout={handleAdminLogout} />
          </AdminRoute>
        }
      />

      {/* Role-Protected Educator Dashboard */}
      <Route
        path="/educator-dashboard"
        element={
          <EducatorRoute>
            <EducatorDashboard onLogout={handleEducatorLogout} />
          </EducatorRoute>
        }
      />

      {/* Role-Protected Student Dashboard */}
      <Route
        path="/dashboard"
        element={
          <StudentRoute>
            <Dashboard
              username={studentUser}
              onLogout={handleStudentLogout}
            />
          </StudentRoute>
        }
      />

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
