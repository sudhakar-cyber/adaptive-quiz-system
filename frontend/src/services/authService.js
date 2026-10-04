import { sharedDatabase } from './sharedDatabase.js';

export const authService = {
  // Get active role: 'admin' | 'educator' | 'student' | null
  getRole: () => {
    try {
      const localRole = localStorage.getItem('learnsmart_role');
      const sessionRole = sessionStorage.getItem('learnsmart_role');
      if (localRole === 'admin' || sessionRole === 'admin') return 'admin';
      if (localRole === 'educator' || sessionRole === 'educator') return 'educator';
      if (localRole === 'student' || sessionRole === 'student') return 'student';

      // Fallback: check legacy keys
      if (localStorage.getItem('learnsmart_admin') || sessionStorage.getItem('learnsmart_admin')) {
        return 'admin';
      }
      if (localStorage.getItem('learnsmart_educator') || sessionStorage.getItem('learnsmart_educator')) {
        return 'educator';
      }
      if (localStorage.getItem('learnsmart_user')) {
        return 'student';
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  },

  isAdmin: () => {
    return authService.getRole() === 'admin';
  },

  isEducator: () => {
    return authService.getRole() === 'educator';
  },

  isStudent: () => {
    return authService.getRole() === 'student';
  },

  // Get current authenticated user details
  getCurrentUser: () => {
    try {
      const role = authService.getRole();
      if (role === 'admin') {
        const raw = localStorage.getItem('learnsmart_admin') || sessionStorage.getItem('learnsmart_admin');
        if (raw) {
          try {
            return JSON.parse(raw);
          } catch {
            return { name: 'Admin', role: 'admin', title: 'Administrator', email: 'admin@learnsmart.edu' };
          }
        }
        return { name: 'Admin', role: 'admin', title: 'Administrator', email: 'admin@learnsmart.edu' };
      }

      if (role === 'educator') {
        const raw = localStorage.getItem('learnsmart_educator') || sessionStorage.getItem('learnsmart_educator');
        if (raw) {
          try {
            return JSON.parse(raw);
          } catch {
            return { name: raw || 'Dr. Priya S.', role: 'educator' };
          }
        }
        return { name: 'Dr. Priya S.', role: 'educator' };
      }

      if (role === 'student') {
        const username = localStorage.getItem('learnsmart_user') || 'Shaik Aathif';
        const profile = sharedDatabase.getStudentByUsername(username);
        return (
          profile || {
            name: username,
            email: `${username.toLowerCase().replace(/\s+/g, '.')}@learnsmart.edu`,
            role: 'student'
          }
        );
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  },

  // Log in as Admin
  loginAdmin: (adminData = null) => {
    try {
      const data = JSON.stringify(adminData || {
        name: 'Admin',
        fullName: 'System Administrator',
        email: 'admin@learnsmart.edu',
        role: 'admin',
        title: 'Administrator'
      });
      localStorage.setItem('learnsmart_role', 'admin');
      localStorage.setItem('learnsmart_admin', data);
      localStorage.setItem('learnsmart_user', 'Admin');
      sessionStorage.setItem('learnsmart_role', 'admin');
      sessionStorage.setItem('learnsmart_admin', data);
      sessionStorage.setItem('learnsmart_user', 'Admin');
    } catch (err) {
      console.error('Failed to set admin session:', err);
    }
  },

  // Log in as Educator
  loginEducator: () => {
    try {
      const educatorData = JSON.stringify({
        name: 'Dr. Priya S.',
        email: 'Educator@leaensmart.com',
        role: 'Educator'
      });
      localStorage.setItem('learnsmart_role', 'educator');
      localStorage.setItem('learnsmart_educator', educatorData);
      localStorage.setItem('learnsmart_user', 'Dr. Priya S.');
      sessionStorage.setItem('learnsmart_role', 'educator');
      sessionStorage.setItem('learnsmart_educator', educatorData);
      sessionStorage.setItem('learnsmart_user', 'Dr. Priya S.');
    } catch (err) {
      console.error('Failed to set educator session:', err);
    }
  },

  // Log in as Student
  loginStudent: (studentDataOrName) => {
    try {
      const studentName =
        typeof studentDataOrName === 'string'
          ? studentDataOrName
          : studentDataOrName?.name || 'Shaik Aathif';

      // Look up in shared database
      let student = sharedDatabase.getStudentByUsername(studentName);
      if (!student && typeof studentDataOrName === 'object') {
        student = sharedDatabase.registerStudent(studentDataOrName);
      }

      const activeStudent = student || {
        name: studentName,
        email: `${studentName.toLowerCase().replace(/\s+/g, '.')}@learnsmart.edu`,
        role: 'student'
      };

      localStorage.setItem('learnsmart_role', 'student');
      localStorage.setItem('learnsmart_user', activeStudent.name);
      localStorage.setItem(
        'learnsmart_student_profile',
        JSON.stringify({
          fullName: activeStudent.name,
          email: activeStudent.email,
          phone: activeStudent.phone || '+91 98765 43210',
          studentId: activeStudent.studentId || 'LS-2024-8841',
          major: activeStudent.topSubject || 'Computer Science & Engineering',
          role: 'student'
        })
      );

      sessionStorage.setItem('learnsmart_role', 'student');
      sessionStorage.setItem('learnsmart_user', activeStudent.name);
      return activeStudent;
    } catch (err) {
      console.error('Failed to set student session:', err);
    }
  },

  // Clear all authentication credentials
  logout: () => {
    try {
      localStorage.removeItem('learnsmart_role');
      localStorage.removeItem('learnsmart_user');
      localStorage.removeItem('learnsmart_admin');
      localStorage.removeItem('learnsmart_educator');
      localStorage.removeItem('learnsmart_student_profile');
      localStorage.removeItem('learnsmart_auth_token');
      localStorage.removeItem('learnsmart_avatar');
      sessionStorage.removeItem('learnsmart_role');
      sessionStorage.removeItem('learnsmart_user');
      sessionStorage.removeItem('learnsmart_admin');
      sessionStorage.removeItem('learnsmart_educator');
      sessionStorage.removeItem('learnsmart_auth_token');
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  }
};

export default authService;
