import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, onAuthStateChanged } from '../config/firebase';
import { authService } from '../services/authService';

const RouteLoader = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0F172A',
      color: '#38BDF8'
    }}
  >
    <div
      style={{
        width: '36px',
        height: '36px',
        border: '3px solid rgba(56, 189, 248, 0.2)',
        borderTopColor: '#38BDF8',
        borderRadius: '50%',
        animation: 'routeSpin 0.8s linear infinite'
      }}
    />
    <style>{`@keyframes routeSpin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Hook to check real Firebase auth state + active role
const useAuthStatus = () => {
  const [status, setStatus] = useState({
    isLoading: true,
    user: auth.currentUser,
    role: authService.getRole()
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setStatus({
        isLoading: false,
        user: fbUser,
        role: authService.getRole()
      });
    });
    return () => unsubscribe();
  }, []);

  return status;
};

// Route Guard for Admin Dashboard:
// - Allowed: Admin only
// - Not admin / Unauthenticated: Redirect to /login
export const AdminRoute = ({ children }) => {
  const { isLoading, user, role } = useAuthStatus();

  if (isLoading) {
    return <RouteLoader />;
  }

  if (role === 'admin' || (user && role === 'admin')) {
    return children;
  }

  return <Navigate to="/login" replace />;
};

// Route Guard for Educator Dashboard:
// - Allowed: Educator
// - Blocked / Unauthenticated: Redirect to /login
export const EducatorRoute = ({ children }) => {
  const { isLoading, user, role } = useAuthStatus();

  if (isLoading) {
    return <RouteLoader />;
  }

  if (role === 'educator' || (user && role === 'educator')) {
    return children;
  }

  return <Navigate to="/login" replace />;
};

// Route Guard for Student Dashboard:
// - Allowed: Student with valid Firebase auth or active student session
// - Blocked / Unauthenticated: Redirect to /login
export const StudentRoute = ({ children }) => {
  const { isLoading, user, role } = useAuthStatus();

  if (isLoading) {
    return <RouteLoader />;
  }

  const effectiveRole = role || (user ? 'student' : null);
  if (effectiveRole === 'student' && (user || authService.isStudent())) {
    return children;
  }

  return <Navigate to="/login" replace />;
};

// Public Route Guard for root /:
// - If already logged in as Admin -> auto-redirect to /admin-dashboard
// - If already logged in as Educator -> auto-redirect to /educator-dashboard
// - If already logged in as Student -> auto-redirect to /dashboard
// - Otherwise -> allow Login page
export const PublicAuthRoute = ({ children }) => {
  const { isLoading, user, role } = useAuthStatus();

  if (isLoading) {
    return <RouteLoader />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin-dashboard" replace />;
  }

  if (role === 'educator') {
    return <Navigate to="/educator-dashboard" replace />;
  }

  const effectiveRole = role || (user ? 'student' : null);
  if (effectiveRole === 'student' && (user || authService.isStudent())) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Backward-compatibility export for existing imports
export const ProtectedRoute = EducatorRoute;

export default ProtectedRoute;
