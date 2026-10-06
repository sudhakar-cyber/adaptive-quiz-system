import { sharedDatabase } from './sharedDatabase.js';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
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
            return { name: raw || 'Educator', role: 'educator' };
          }
        }
        return { name: 'Educator', role: 'educator' };
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
          'Student';

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
              '',
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
  loginEducator: (educatorData = null) => {
    try {
      const data = JSON.stringify(educatorData || {
        name: 'Educator',
        email: 'educator@learnsmart.com',
        role: 'Educator'
      });
      localStorage.setItem('learnsmart_role', 'educator');
      localStorage.setItem('learnsmart_educator', data);
      localStorage.setItem('learnsmart_user', educatorData?.name || 'Educator');
      sessionStorage.setItem('learnsmart_role', 'educator');
      sessionStorage.setItem('learnsmart_educator', data);
      sessionStorage.setItem('learnsmart_user', educatorData?.name || 'Educator');
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
        name: studentName || 'Student',
        email: studentEmail || '',
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
          phone: activeStudent.phone || '',
          studentId: activeStudent.studentId || '',
          major: activeStudent.topSubject || 'General / Onboarding',
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
  /**
   * Safely execute a Firestore promise with timeout protection.
   * If Firestore API is disabled or the gRPC stream hangs, times out gracefully so auth never stalls.
   */
  safeFirestoreOp: async (promise, timeoutMs = 1500) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore operation timed out')), timeoutMs)
      );
      return await Promise.race([promise, timeoutPromise]);
    } catch (err) {
      console.warn('Firestore safe operation skipped/timed out:', err?.message || err);
      return null;
    }
  },

  loginWithFirebase: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user || !user.uid) {
        return { success: false, error: new Error('Firebase login returned no user.') };
      }

      // Read or update profile in Firestore with timeout protection
      let firestoreProfile = null;
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await authService.safeFirestoreOp(getDoc(userDocRef), 1500);
        if (docSnap && docSnap.exists && docSnap.exists()) {
          firestoreProfile = docSnap.data();
          authService.safeFirestoreOp(
            updateDoc(userDocRef, {
              lastLoginAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }),
            1500
          ).catch(() => {});
        } else {
          const profileData = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Student'),
            name: user.displayName || (user.email ? user.email.split('@')[0] : 'Student'),
            photoURL: user.photoURL || null,
            phoneNumber: user.phoneNumber || '',
            role: 'student',
            authProvider: 'firebase',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          };
          authService.safeFirestoreOp(setDoc(userDocRef, profileData), 1500).catch(() => {});
          firestoreProfile = profileData;
        }
      } catch (fsErr) {
        console.warn('Firestore login update warning:', fsErr);
      }

      const resolvedRole = firestoreProfile?.role || 'student';
      const studentName =
        (firestoreProfile?.displayName && firestoreProfile.displayName.trim()) ||
        (user.displayName && user.displayName.trim()) ||
        (user.email ? user.email.split('@')[0] : 'Student');

      let activeUserObj = null;
      if (resolvedRole === 'admin') {
        authService.loginAdmin({ name: studentName, email: user.email, uid: user.uid, role: 'admin' });
        activeUserObj = { name: studentName, email: user.email, role: 'admin', uid: user.uid };
      } else if (resolvedRole === 'educator') {
        authService.loginEducator({ name: studentName, email: user.email, uid: user.uid, role: 'educator' });
        activeUserObj = { name: studentName, email: user.email, role: 'educator', uid: user.uid };
      } else {
        activeUserObj = authService.loginStudent({
          name: studentName,
          email: user.email,
          avatarImage: user.photoURL || null,
          photoURL: user.photoURL || null,
          uid: user.uid,
          role: 'student',
          authProvider: 'firebase'
        });
      }

      return { success: true, user, student: activeUserObj, role: resolvedRole, profile: firestoreProfile };
    } catch (error) {
      console.warn('Firebase email login error:', error);
      return { success: false, error };
    }
  },

  signupWithFirebase: async (email, password, additionalData = {}) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user || !user.uid) {
        return { success: false, error: new Error('Firebase user creation returned no user.') };
      }

      const fullName =
        `${additionalData.firstName || ''} ${additionalData.lastName || ''}`.trim() ||
        (user.displayName && user.displayName.trim()) ||
        user.email.split('@')[0];

      const initialRole = additionalData.role || 'student';

      // Create profile in Firestore with timeout protection (do NOT store password in Firestore!)
      let firestoreProfile = null;
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const profileData = {
          uid: user.uid,
          email: user.email || '',
          displayName: fullName,
          name: fullName,
          firstName: additionalData.firstName || '',
          lastName: additionalData.lastName || '',
          photoURL: user.photoURL || null,
          phoneNumber: additionalData.phone || user.phoneNumber || '',
          country: additionalData.country || '',
          role: initialRole,
          authProvider: 'firebase',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        };
        await authService.safeFirestoreOp(setDoc(userDocRef, profileData), 1500);
        firestoreProfile = profileData;
      } catch (fsErr) {
        console.warn('Firestore user creation warning:', fsErr);
      }

      // Register student in local memory database (NEVER store password!)
      const studentPayload = { ...additionalData };
      delete studentPayload.password;
      delete studentPayload.confirmPassword;

      const newStudent = sharedDatabase.registerStudent({
        ...studentPayload,
        name: fullName,
        email: user.email,
        phone: additionalData.phone || user.phoneNumber || '',
        country: additionalData.country || '',
        avatarImage: user.photoURL || null,
        photoURL: user.photoURL || null,
        uid: user.uid,
        authProvider: 'firebase'
      });
      authService.loginStudent(newStudent);
      return { success: true, user, student: newStudent, profile: firestoreProfile, role: initialRole };
    } catch (error) {
      console.warn('Firebase signup error:', error);
      return { success: false, error };
    }
  },

  loginWithGoogle: async (additionalData = {}) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // 1. Get the authenticated Firebase user
      const user = result.user;
      if (!user || !user.uid) {
        return { success: false, error: new Error('Google authentication returned no user.') };
      }

      // 2. Read user details from Firebase User object
      const displayName = user.displayName || '';
      const email = user.email || '';
      const photoURL = user.photoURL || null;
      const uid = user.uid;

      // 3. Firestore profile sync: Create or update Firestore profile without duplicates
      let firestoreProfile = null;
      try {
        const userDocRef = doc(db, 'users', uid);
        const docSnap = await authService.safeFirestoreOp(getDoc(userDocRef), 1500);

        if (docSnap && docSnap.exists && docSnap.exists()) {
          // Existing user: preserve existing role and createdAt, update lastLoginAt and latest fields
          const existing = docSnap.data();
          const updates = {
            displayName: displayName || existing.displayName || '',
            photoURL: photoURL || existing.photoURL || null,
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          if (additionalData.phone && !existing.phoneNumber) {
            updates.phoneNumber = additionalData.phone;
          }
          if (additionalData.country && !existing.country) {
            updates.country = additionalData.country;
          }
          authService.safeFirestoreOp(updateDoc(userDocRef, updates), 1500).catch((e) => console.warn('Firestore updateDoc warning:', e));
          firestoreProfile = { ...existing, ...updates, uid };
        } else {
          // New user: create Firestore profile
          const resolvedDisplayName =
            displayName ||
            `${additionalData.firstName || ''} ${additionalData.lastName || ''}`.trim() ||
            (email ? email.split('@')[0] : 'Student');

          const initialRole = additionalData.role || 'student';
          const newProfile = {
            uid,
            email,
            displayName: resolvedDisplayName,
            name: resolvedDisplayName,
            photoURL,
            phoneNumber: additionalData.phone || user.phoneNumber || '',
            country: additionalData.country || '',
            role: initialRole,
            authProvider: 'google',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          };
          authService.safeFirestoreOp(setDoc(userDocRef, newProfile), 1500).catch((e) => console.warn('Firestore setDoc warning:', e));
          firestoreProfile = newProfile;
        }
      } catch (fsErr) {
        console.warn('Firestore sync warning:', fsErr);
      }

      // 4. Resolve role and profile details
      const resolvedRole = firestoreProfile?.role || additionalData.role || 'student';
      const resolvedName =
        (firestoreProfile?.displayName && firestoreProfile.displayName.trim()) ||
        (displayName && displayName.trim()) ||
        `${additionalData.firstName || ''} ${additionalData.lastName || ''}`.trim() ||
        (email && email.includes('@') ? email.split('@')[0] : 'Student');

      // 5. Store session based on role
      let activeUserObj = null;
      if (resolvedRole === 'admin') {
        authService.loginAdmin({
          name: resolvedName,
          email,
          uid,
          photoURL,
          role: 'admin'
        });
        activeUserObj = { name: resolvedName, email, role: 'admin', uid };
      } else if (resolvedRole === 'educator') {
        authService.loginEducator({
          name: resolvedName,
          email,
          uid,
          photoURL,
          role: 'educator'
        });
        activeUserObj = { name: resolvedName, email, role: 'educator', uid };
      } else {
        activeUserObj = authService.loginStudent({
          name: resolvedName,
          email,
          avatarImage: photoURL,
          photoURL,
          uid,
          phone: firestoreProfile?.phoneNumber || additionalData.phone || user.phoneNumber || '',
          country: firestoreProfile?.country || additionalData.country || '',
          role: 'student',
          authProvider: 'google'
        });
      }

      return {
        success: true,
        user,
        role: resolvedRole,
        student: activeUserObj,
        profile: firestoreProfile
      };
    } catch (error) {
      console.warn('Firebase Google login error:', error);
      return { success: false, error };
    }
  },

  getFirestoreProfile: async (uid) => {
    if (!uid) return null;
    try {
      const userDocRef = doc(db, 'users', uid);
      const docSnap = await authService.safeFirestoreOp(getDoc(userDocRef), 1500);
      if (docSnap && docSnap.exists && docSnap.exists()) {
        return docSnap.data();
      }
    } catch (e) {
      console.warn('Failed to fetch Firestore profile:', e);
    }
    return null;
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
