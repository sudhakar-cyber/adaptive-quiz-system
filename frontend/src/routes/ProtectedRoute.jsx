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
    const handlePortalChange = () => {
      setStatus({
        isLoading: false,
        user: auth.currentUser,
        role: authService.getRole()
      });
    };

    window.addEventListener('learnsmart_portal_switched', handlePortalChange);
    window.addEventListener('storage', handlePortalChange);

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setStatus({
        isLoading: false,
        user: fbUser,
        role: authService.getRole()
      });
    });

    return () => {
      unsubscribe();
      window.removeEventListener('learnsmart_portal_switched', handlePortalChange);
      window.removeEventListener('storage', handlePortalChange);
    };
  }, []);

  return status;
};

// Route Guard for Admin Dashboard:
// - Allowed: Admin only
// - Not admin / Unauthenticated: Redirect to /login
export const AdminRoute = ({ children }) => {
  const { isLoading, user, role } = useAuthStatus();

  if (isLoading && !role && !authService.getRole()) {
    return <RouteLoader />;
  }

  const effectiveRole = role || authService.getRole();
  if (effectiveRole === 'admin' || (user && effectiveRole === 'admin') || authService.isAdmin()) {
    return children;
  }

  return <Navigate to="/login" replace />;
};

// Route Guard for Educator Dashboard:
// - Allowed: Educator or Admin
// - Blocked / Unauthenticated: Redirect to /login
export const EducatorRoute = ({ children }) => {
  const { isLoading, user, role } = useAuthStatus();

  if (isLoading && !role && !authService.getRole()) {
    return <RouteLoader />;
  }

  const effectiveRole = role || authService.getRole();
  if (
    effectiveRole === 'educator' ||
    effectiveRole === 'admin' ||
    (user && (effectiveRole === 'educator' || effectiveRole === 'admin')) ||
    authService.isEducator() ||
    authService.isAdmin()
  ) {
    return children;
  }

  return <Navigate to="/login" replace />;
};

// Route Guard for Student Dashboard:
// - Allowed: Student with valid Firebase auth or active student session (also permits Educator and Admin cross-navigation)
// - Blocked / Unauthenticated: Redirect to /login
export const StudentRoute = ({ children }) => {
  const { isLoading, user, role } = useAuthStatus();

  if (isLoading && !role && !user && !authService.getRole()) {
    return <RouteLoader />;
  }

  const effectiveRole = role || authService.getRole() || (user ? 'student' : null);
  if (
    effectiveRole === 'student' ||
    effectiveRole === 'educator' ||
    effectiveRole === 'admin' ||
    user ||
    authService.isStudent() ||
    authService.isEducator() ||
    authService.isAdmin()
  ) {
    return children;
  }

  return <Navigate to="/login" replace />;
};

// Public Route Guard for auth pages:
// Renders public authentication screens (Login, Register, OTP)
export const PublicAuthRoute = ({ children }) => {
  return children;
};

// Backward-compatibility export for existing imports
export const ProtectedRoute = EducatorRoute;

export default ProtectedRoute;
