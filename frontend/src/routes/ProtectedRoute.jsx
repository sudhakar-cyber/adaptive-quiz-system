import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

// Check if user has an active admin session
export const isAdminAuthenticated = () => {
  return authService.isAdmin();
};

// Check if user has an active educator session
export const isEducatorAuthenticated = () => {
  return authService.isEducator();
};

// Check if user has an active student session
export const isStudentAuthenticated = () => {
  return authService.isStudent();
};

// Route Guard for Admin Dashboard:
// - Allowed: Admin only
// - Not admin / Unauthenticated: Redirect to /login
export const AdminRoute = ({ children }) => {
  const role = authService.getRole();

  if (role === 'admin') {
    return children;
  }

  return <Navigate to="/login" replace />;
};

// Route Guard for Educator Dashboard:
// - Allowed: Educator
// - Blocked / Unauthenticated: Redirect to /login
export const EducatorRoute = ({ children }) => {
  const role = authService.getRole();

  if (role === 'educator') {
    return children;
  }

  return <Navigate to="/login" replace />;
};

// Route Guard for Student Dashboard:
// - Allowed: Student
// - Blocked / Unauthenticated: Redirect to /login
export const StudentRoute = ({ children }) => {
  const role = authService.getRole();

  if (role === 'student') {
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
  const role = authService.getRole();

  if (role === 'admin') {
    return <Navigate to="/admin-dashboard" replace />;
  }

  if (role === 'educator') {
    return <Navigate to="/educator-dashboard" replace />;
  }

  if (role === 'student') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Backward-compatibility export for existing imports
export const ProtectedRoute = EducatorRoute;

export default ProtectedRoute;
