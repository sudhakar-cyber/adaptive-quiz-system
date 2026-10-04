import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { EducatorDashboard } from './pages/EducatorDashboard';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminRoute, EducatorRoute, StudentRoute, PublicAuthRoute } from './routes/ProtectedRoute';
import { authService } from './services/authService';

function AppRoutes() {
  const navigate = useNavigate();
  const [studentUser, setStudentUser] = useState(() => {
    try {
      return localStorage.getItem('learnsmart_user') || 'Shaik Aathif';
    } catch {
      return 'Shaik Aathif';
    }
  });

  // Keep student user synchronized with storage events
  useEffect(() => {
    const handleStorageChange = () => {
      const activeUser = localStorage.getItem('learnsmart_user');
      if (activeUser) {
        setStudentUser(activeUser);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
      setStudentUser(typeof user === 'string' ? user : user?.name || 'Shaik Aathif');
      navigate('/dashboard');
    }
  };

  const handleAdminLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleEducatorLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleStudentLogout = () => {
    authService.logout();
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
