import { sharedDatabase } from './sharedDatabase.js';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from '../config/firebase.js';

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
        const fbUser = auth.currentUser;
        let storedProfile = null;
        try {
          storedProfile = JSON.parse(localStorage.getItem('learnsmart_student_profile') || 'null');
        } catch {}

        const username =
          (fbUser?.displayName && fbUser.displayName.trim()) ||
          localStorage.getItem('learnsmart_user') ||
          storedProfile?.fullName ||
          'Shaik Aathif';

        const profile =
          (fbUser?.email ? sharedDatabase.getStudentByEmail(fbUser.email) : null) ||
          (fbUser?.uid ? sharedDatabase.getStudentByUid(fbUser.uid) : null) ||
          sharedDatabase.getStudentByUsername(username);

        return (
          profile || {
            name: username,
            email:
              fbUser?.email ||
              storedProfile?.email ||
              localStorage.getItem('learnsmart_email') ||
              `${username.toLowerCase().replace(/\s+/g, '.')}@learnsmart.edu`,
            avatarImage:
              fbUser?.photoURL ||
              storedProfile?.avatarImage ||
              localStorage.getItem('learnsmart_avatar') ||
              null,
            photoURL:
              fbUser?.photoURL ||
              storedProfile?.avatarImage ||
              localStorage.getItem('learnsmart_avatar') ||
              null,
            uid: fbUser?.uid || storedProfile?.uid || localStorage.getItem('learnsmart_uid') || '',
            role: 'student'
          }
        );
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  },

  // Get authenticated Firebase user if available
  getFirebaseUser: () => {
    return auth.currentUser || null;
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
      let student = null;
      let studentName = '';
      let studentEmail = '';
      let avatarImage = null;
      let uid = '';

      if (typeof studentDataOrName === 'string') {
        studentName = studentDataOrName;
        student = sharedDatabase.getStudentByUsername(studentName);
      } else if (typeof studentDataOrName === 'object' && studentDataOrName !== null) {
        studentName = studentDataOrName.name || studentDataOrName.displayName || '';
        studentEmail = studentDataOrName.email || '';
        avatarImage = studentDataOrName.avatarImage || studentDataOrName.photoURL || null;
        uid = studentDataOrName.uid || '';

        // Safe fallback to email username only when displayName / studentName is empty
        if (!studentName || !studentName.trim()) {
          studentName = (studentEmail && studentEmail.includes('@'))
            ? studentEmail.split('@')[0]
            : 'Student';
        }

        // Look up in shared database by email, uid, or name
        if (studentEmail) {
          student = sharedDatabase.getStudentByEmail(studentEmail);
        }
        if (!student && uid) {
          student = sharedDatabase.getStudentByUid(uid);
        }
        if (!student) {
          student = sharedDatabase.getStudentByUsername(studentName);
        }

        if (!student) {
          student = sharedDatabase.registerStudent({
            ...studentDataOrName,
            name: studentName,
            email: studentEmail,
            avatarImage,
            photoURL: avatarImage,
            uid,
            authProvider: studentDataOrName.authProvider || 'student'
          });
        } else {
          // Update existing student record with the latest authenticated profile details
          const updates = {};
          if (studentName && studentName !== student.name) {
            updates.name = studentName;
            updates.avatarInitials = (studentName.slice(0, 2) || 'ST').toUpperCase();
          }
          if (avatarImage && avatarImage !== student.avatarImage) {
            updates.avatarImage = avatarImage;
          }
          if (uid && uid !== student.uid) {
            updates.uid = uid;
          }
          if (studentEmail && studentEmail !== student.email) {
            updates.email = studentEmail;
          }
          if (Object.keys(updates).length > 0) {
            student = sharedDatabase.updateStudent(student.id, updates) || { ...student, ...updates };
          }
        }
      }

      const activeStudent = student || {
        name: studentName || 'Shaik Aathif',
        email:
          studentEmail ||
          `${(studentName || 'shaik.aathif').toLowerCase().replace(/\s+/g, '.')}@learnsmart.edu`,
        avatarImage: avatarImage || null,
        uid: uid || '',
        role: 'student'
      };

      localStorage.setItem('learnsmart_role', 'student');
      localStorage.setItem('learnsmart_user', activeStudent.name);
      if (activeStudent.email) {
        localStorage.setItem('learnsmart_email', activeStudent.email);
      }
      if (activeStudent.uid) {
        localStorage.setItem('learnsmart_uid', activeStudent.uid);
      }
      if (activeStudent.avatarImage) {
        localStorage.setItem('learnsmart_avatar', activeStudent.avatarImage);
      } else {
        localStorage.removeItem('learnsmart_avatar');
      }

      localStorage.setItem(
        'learnsmart_student_profile',
        JSON.stringify({
          fullName: activeStudent.name,
          email: activeStudent.email,
          avatarImage: activeStudent.avatarImage || null,
          photoURL: activeStudent.avatarImage || null,
          uid: activeStudent.uid || '',
          phone: activeStudent.phone || '+91 98765 43210',
          studentId: activeStudent.studentId || 'LS-2024-8841',
          major: activeStudent.topSubject || 'Computer Science & Engineering',
          role: 'student'
        })
      );

      sessionStorage.setItem('learnsmart_role', 'student');
      sessionStorage.setItem('learnsmart_user', activeStudent.name);
      if (activeStudent.email) {
        sessionStorage.setItem('learnsmart_email', activeStudent.email);
      }
      if (activeStudent.uid) {
        sessionStorage.setItem('learnsmart_uid', activeStudent.uid);
      }

      return activeStudent;
    } catch (err) {
      console.error('Failed to set student session:', err);
    }
  },

  // ==========================================
  // FIREBASE AUTHENTICATION INTEGRATION
  // ==========================================
  loginWithFirebase: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const studentName =
        (user.displayName && user.displayName.trim().length > 0)
          ? user.displayName.trim()
          : (user.email ? user.email.split('@')[0] : 'Student');

      const activeStudent = authService.loginStudent({
        name: studentName,
        email: user.email,
        avatarImage: user.photoURL || null,
        photoURL: user.photoURL || null,
        uid: user.uid,
        authProvider: 'firebase'
      });
      return { success: true, user, student: activeStudent };
    } catch (error) {
      console.warn('Firebase email login error:', error);
      return { success: false, error };
    }
  },

  signupWithFirebase: async (email, password, additionalData = {}) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const fullName =
        `${additionalData.firstName || ''} ${additionalData.lastName || ''}`.trim() ||
        (user.displayName && user.displayName.trim()) ||
        user.email.split('@')[0];
      const newStudent = sharedDatabase.registerStudent({
        ...additionalData,
        name: fullName,
        email: user.email,
        avatarImage: user.photoURL || null,
        photoURL: user.photoURL || null,
        uid: user.uid,
        authProvider: 'firebase'
      });
      authService.loginStudent(newStudent);
      return { success: true, user, student: newStudent };
    } catch (error) {
      console.warn('Firebase signup error:', error);
      return { success: false, error };
    }
  },

  loginWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // 1. Get the authenticated Firebase user
      const user = result.user;

      // 2. Read user.displayName, user.email, user.photoURL, user.uid
      const displayName = user.displayName;
      const email = user.email || '';
      const photoURL = user.photoURL || null;
      const uid = user.uid || '';

      // 3. Do not use email address as username when displayName is available.
      // 6. Safe fallback to email username only when displayName is null or empty.
      const resolvedName = (displayName && displayName.trim().length > 0)
        ? displayName.trim()
        : (email && email.includes('@') ? email.split('@')[0] : 'Student');

      // Save student profile with authentic Google data
      const activeStudent = authService.loginStudent({
        name: resolvedName,
        email: email,
        avatarImage: photoURL,
        photoURL: photoURL,
        uid: uid,
        authProvider: 'google'
      });

      return {
        success: true,
        user: {
          displayName,
          email,
          photoURL,
          uid
        },
        student: activeStudent
      };
    } catch (error) {
      console.warn('Firebase Google login error:', error);
      return { success: false, error };
    }
  },

  sendPasswordReset: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.warn('Firebase password reset error:', error);
      return { success: false, error };
    }
  },

  // Clear all authentication credentials
  logout: async () => {
    try {
      await firebaseSignOut(auth).catch(() => {});
      localStorage.removeItem('learnsmart_role');
      localStorage.removeItem('learnsmart_user');
      localStorage.removeItem('learnsmart_email');
      localStorage.removeItem('learnsmart_uid');
      localStorage.removeItem('learnsmart_admin');
      localStorage.removeItem('learnsmart_educator');
      localStorage.removeItem('learnsmart_student_profile');
      localStorage.removeItem('learnsmart_auth_token');
      localStorage.removeItem('learnsmart_avatar');
      sessionStorage.removeItem('learnsmart_role');
      sessionStorage.removeItem('learnsmart_user');
      sessionStorage.removeItem('learnsmart_email');
      sessionStorage.removeItem('learnsmart_uid');
      sessionStorage.removeItem('learnsmart_admin');
      sessionStorage.removeItem('learnsmart_educator');
      sessionStorage.removeItem('learnsmart_auth_token');
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  }
};

export default authService;
