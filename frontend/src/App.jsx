import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { EducatorDashboard } from './pages/EducatorDashboard';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminRoute, EducatorRoute, StudentRoute, PublicAuthRoute } from './routes/ProtectedRoute';
import { authService } from './services/authService';
import { auth, onAuthStateChanged } from './config/firebase';

function AppRoutes() {
  const navigate = useNavigate();
  const [studentUser, setStudentUser] = useState(() => {
    try {
      const fbUser = auth.currentUser;
      if (fbUser?.displayName && fbUser.displayName.trim()) {
        return fbUser.displayName.trim();
      }
      return localStorage.getItem('learnsmart_user') || 'Student';
    } catch {
      return 'Student';
    }
  });

  // Keep student user synchronized with auth and storage events
  useEffect(() => {
    const handleStorageChange = () => {
      const activeUser = localStorage.getItem('learnsmart_user');
      if (activeUser) {
        setStudentUser(activeUser);
      }
    };
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user?.displayName && user.displayName.trim()) {
        setStudentUser(user.displayName.trim());
      }
    });
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubscribeAuth();
    };
  }, []);

  const handleLoginSuccess = (user, role) => {
    if (role === 'admin') {
      authService.loginAdmin();
      navigate('/admin-dashboard');
    } else if (role === 'educator') {
      authService.loginEducator();
      navigate('/educator-dashboard');
    } else {
      authService.loginStudent(user);
      setStudentUser(typeof user === 'string' ? user : user?.name || 'Student');
      navigate('/dashboard');
    }
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
        path="/reset-password"
        element={<ResetPassword />}
      />
      <Route
        path="/"
        element={
          <PublicAuthRoute>
            <Login onLoginSuccess={handleLoginSuccess} />
          </PublicAuthRoute>
        }
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
