import { sharedDatabase } from './sharedDatabase.js';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
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
      const educatorsList = typeof sharedDatabase.getEducators === 'function'
        ? sharedDatabase.getEducators()
        : [];
      const matched = educatorsList.find((e) => {
        if (educatorData && typeof educatorData === 'object') {
          if (educatorData.email && e.email?.toLowerCase() === educatorData.email.toLowerCase()) return true;
          if (educatorData.name && educatorData.name !== 'Educator' && e.name?.toLowerCase() === educatorData.name.toLowerCase()) return true;
        }
        if (typeof educatorData === 'string' && educatorData !== 'Educator') {
          if (e.name?.toLowerCase() === educatorData.toLowerCase() || e.email?.toLowerCase() === educatorData.toLowerCase()) return true;
        }
        return false;
      }) || educatorsList[0] || null;

      const resolvedEducator = {
        id: educatorData?.id || matched?.id || 'edu-201',
        name:
          (educatorData && typeof educatorData === 'object' && educatorData.name && educatorData.name !== 'Educator'
            ? educatorData.name
            : typeof educatorData === 'string' && educatorData !== 'Educator'
              ? educatorData
              : null) ||
          matched?.name ||
          'Dr. Sarah Jenkins',
        email:
          (educatorData && typeof educatorData === 'object' ? educatorData.email : '') ||
          matched?.email ||
          'educator@learnsmart.com',
        educatorId:
          (educatorData && typeof educatorData === 'object' ? educatorData.educatorId || educatorData.facultyId : '') ||
          matched?.educatorId ||
          'FAC-CS-2025-101',
        department:
          (educatorData && typeof educatorData === 'object' ? educatorData.department : '') ||
          matched?.department ||
          'Computer Science',
        role: 'Educator'
      };

      const data = JSON.stringify(resolvedEducator);
      localStorage.setItem('learnsmart_role', 'educator');
      localStorage.setItem('learnsmart_educator', data);
      localStorage.setItem('learnsmart_user', resolvedEducator.name);
      sessionStorage.setItem('learnsmart_role', 'educator');
      sessionStorage.setItem('learnsmart_educator', data);
      sessionStorage.setItem('learnsmart_user', resolvedEducator.name);
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

  /**
   * Translates Firebase auth errors into friendly user messages
   */
  getGoogleAuthErrorMessage: (err) => {
    if (!err) return 'Google authentication failed.';
    const code = err.code || (typeof err === 'string' ? err : '');
    const message = err.message || (typeof err === 'string' ? err : '');

    if (code === 'auth/popup-closed-by-user') {
      return 'Google Sign-In was closed before completing.';
    }
    if (code === 'auth/popup-blocked') {
      return 'Google Sign-In popup was blocked by your browser. Please allow popups for this site and try again.';
    }
    if (code === 'auth/cancelled-popup-request') {
      return 'Google Sign-In request was cancelled.';
    }
    if (code === 'auth/account-exists-with-different-credential') {
      return 'An account already exists with this email address using a different sign-in method. Please sign in using your existing credentials.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network error. Please check your internet connection and try again.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'This domain is not authorized in Firebase Console for Google authentication.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Google Sign-In is not enabled in the Firebase Console.';
    }

    let clean = message.replace(/^Firebase:\s*/i, '').trim();
    clean = clean.replace(/^Error\s*\((auth\/[^)]+)\):?/i, '$1:').trim();
    return clean || 'Google authentication failed. Please try again.';
  },

  /**
   * Completes Firestore profile sync and local session for a verified Google user
   */
  completeGoogleLogin: async (user, additionalData = {}) => {
    if (!user || !user.uid) {
      return { success: false, error: new Error('Google user is required to complete login.') };
    }

    // Strictly use the authenticated Google account's attributes
    const uid = user.uid;
    const email = user.email || '';
    const displayName = user.displayName || (email ? email.split('@')[0] : 'Learner');
    const photoURL = user.photoURL || null;

    // 1. Firestore profile sync: Create or update Firestore profile without duplicates
    let firestoreProfile = null;
    let resolvedRole = additionalData.role || 'student';

    try {
      const userDocRef = doc(db, 'users', uid);
      const docSnap = await authService.safeFirestoreOp(getDoc(userDocRef), 800);

      const exists = docSnap && (typeof docSnap.exists === 'function' ? docSnap.exists() : Boolean(docSnap.exists));
      if (exists) {
        const existing = docSnap.data();
        resolvedRole = existing.role || resolvedRole;
        const updates = {
          displayName,
          name: displayName,
          photoURL,
          email,
          emailVerified: true,
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        if (additionalData.phone && !existing.phoneNumber) {
          updates.phoneNumber = additionalData.phone;
        }
        if (additionalData.country && !existing.country) {
          updates.country = additionalData.country;
        }
        authService.safeFirestoreOp(updateDoc(userDocRef, updates), 800).catch((e) =>
          console.warn('Firestore updateDoc warning:', e)
        );
        firestoreProfile = { ...existing, ...updates, uid };
      } else {
        const newProfile = {
          uid,
          email,
          displayName,
          name: displayName,
          photoURL,
          phoneNumber: additionalData.phone || user.phoneNumber || '',
          country: additionalData.country || '',
          role: resolvedRole,
          authProvider: 'google',
          emailVerified: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        };
        authService.safeFirestoreOp(setDoc(userDocRef, newProfile), 800).catch((e) =>
          console.warn('Firestore setDoc warning:', e)
        );
        firestoreProfile = newProfile;
      }
    } catch (fsErr) {
      console.warn('Firestore sync warning:', fsErr);
    }

    // 2. Set active session based on resolved role
    let activeUserObj = null;
    if (resolvedRole === 'admin') {
      authService.loginAdmin({
        name: displayName,
        email,
        uid,
        photoURL,
        role: 'admin'
      });
      activeUserObj = { name: displayName, email, role: 'admin', uid, photoURL };
    } else if (resolvedRole === 'educator') {
      authService.loginEducator({
        name: displayName,
        email,
        uid,
        photoURL,
        role: 'educator'
      });
      activeUserObj = { name: displayName, email, role: 'educator', uid, photoURL };
    } else {
      activeUserObj = authService.loginStudent({
        name: displayName,
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
  },

  /**
   * Reusable Google Authentication Flow:
   * 1. Opens Google account picker
   * 2. Authenticates with GoogleAuthProvider
   * 3. Uses selected Google account email (never form input)
   * 4. Checks emailVerified:
   *    - if true: syncs Firestore profile, sets role, redirects to dashboard
   *    - if false: sends verification email via Firebase sendEmailVerification, blocks access until verified
   */
  loginWithGoogle: async (additionalData = {}) => {
    try {
      // 1. Force real Google account picker
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);

      // 2. Authenticated Firebase user
      const user = result.user;
      if (!user || !user.uid) {
        return { success: false, error: new Error('Google authentication returned no user.') };
      }

      // 3. Check Firebase email verification status
      if (user.emailVerified) {
        // Google accounts are normally already verified by Google.
        // Do NOT send another verification email.
        return await authService.completeGoogleLogin(user, additionalData);
      }

      // 4. If emailVerified === false:
      // Send Firebase verification email and block access until complete
      try {
        await sendEmailVerification(user);
      } catch (evErr) {
        console.warn('sendEmailVerification notice:', evErr);
      }

      return {
        success: false,
        requiresVerification: true,
        user,
        email: user.email,
        message: 'Verification email sent. Please check your email and verify your account.'
      };
    } catch (error) {
      console.warn('Firebase Google login error:', error);
      const friendlyMessage = authService.getGoogleAuthErrorMessage(error);
      return {
        success: false,
        error,
        message: friendlyMessage
      };
    }
  },

  /**
   * Reloads Firebase user state to check if email was verified in inbox
   */
  checkGoogleEmailVerification: async (additionalData = {}) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        return {
          success: false,
          error: new Error('No user is currently signed in.'),
          message: 'No active Google session found. Please click Continue with Google again.'
        };
      }

      // Reload real Firebase auth state from server
      await user.reload();

      if (user.emailVerified) {
        // Verified! Complete Firestore sync and allow dashboard access
        return await authService.completeGoogleLogin(user, additionalData);
      }

      return {
        success: false,
        requiresVerification: true,
        user,
        email: user.email,
        message: 'Verification email sent. Please check your email and verify your account.'
      };
    } catch (error) {
      console.warn('checkGoogleEmailVerification error:', error);
      return {
        success: false,
        error,
        message: error?.message || 'Failed to check verification status.'
      };
    }
  },

  /**
   * Resend Firebase verification email for Google user
   */
  resendGoogleEmailVerification: async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        return {
          success: false,
          message: 'No active user found. Please click Continue with Google again.'
        };
      }
      await sendEmailVerification(user);
      return {
        success: true,
        message: 'Verification email sent. Please check your email and verify your account.'
      };
    } catch (error) {
      console.warn('resendGoogleEmailVerification error:', error);
      if (error?.code === 'auth/too-many-requests') {
        return {
          success: false,
          message: 'Too many requests. Please wait a moment before requesting another email.'
        };
      }
      return {
        success: false,
        message: error?.message || 'Failed to resend verification email.'
      };
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

  sendPasswordReset: async (emailOrIdentifier) => {
    try {
      if (!emailOrIdentifier || !emailOrIdentifier.trim()) {
        return {
          success: false,
          error: { code: 'auth/missing-email', message: 'Please enter your registered email address.' }
        };
      }

      // Resolve email if user entered username, name, or roll number
      let cleanEmail = emailOrIdentifier.trim().toLowerCase();
      if (!cleanEmail.includes('@')) {
        const resolved = sharedDatabase.resolveUserEmail(cleanEmail);
        if (resolved) {
          cleanEmail = resolved;
        } else {
          return {
            success: false,
            error: {
              code: 'auth/user-not-found',
              message: `No account found with username "${emailOrIdentifier}". Please enter your registered email address.`
            }
          };
        }
      }

      // Basic format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return {
          success: false,
          error: { code: 'auth/invalid-email', message: 'Please enter a valid email address.' }
        };
      }

      // Check if user is known in local database
      const localStudent = sharedDatabase.getStudentByEmail(cleanEmail);
      const localEducator = sharedDatabase.getEducatorByEmail(cleanEmail);
      const localAdmin = sharedDatabase.getAdminUser(cleanEmail);
      const isKnownLocalAccount = !!(localStudent || localEducator || localAdmin);

      let firebaseSuccess = false;
      let firebaseError = null;

      // 1. Attempt sending password reset email via Firebase Authentication
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        firebaseSuccess = true;
      } catch (err) {
        firebaseError = err;
        console.warn('Firebase sendPasswordResetEmail notice:', err);
      }

      // 2. Attempt sending password reset email via backend SMTP service
      let backendSuccess = false;
      let backendData = null;
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const res = await fetch('/api/auth/request-password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, appUrl: origin })
        });
        if (res.ok) {
          backendData = await res.json();
          if (backendData.success) {
            backendSuccess = true;
          }
        }
      } catch (backendErr) {
        // Backend might be offline or running standalone without backend
        console.warn('Backend reset password request skipped/offline:', backendErr?.message);
      }

      // 3. Fallback for accounts registered in sharedDatabase
      if (isKnownLocalAccount) {
        const localToken = 'ls_reset_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        try {
          localStorage.setItem(
            `learnsmart_reset_${cleanEmail}`,
            JSON.stringify({
              token: localToken,
              email: cleanEmail,
              expiresAt: Date.now() + 1800000 // 30 minutes
            })
          );
        } catch {}

        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const directLink = `${origin}/reset-password?email=${encodeURIComponent(cleanEmail)}&token=${localToken}`;

        return {
          success: true,
          email: cleanEmail,
          isLocalAccount: true,
          viaFirebase: firebaseSuccess,
          viaSmtp: backendSuccess && backendData?.smtpSent,
          resetLink: directLink,
          message: `Password reset link sent to your registered email (${cleanEmail}).`
        };
      }

      // If Firebase successfully dispatched the email
      if (firebaseSuccess) {
        return {
          success: true,
          email: cleanEmail,
          viaFirebase: true,
          viaSmtp: backendSuccess && backendData?.smtpSent,
          resetLink: backendData?.resetLink || null,
          message: `Password reset link sent to your registered email (${cleanEmail}).`
        };
      }

      // If user was not found anywhere
      if (firebaseError && (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/invalid-credential')) {
        return {
          success: false,
          error: {
            code: 'auth/user-not-found',
            message: 'No registered account found with this email address. Please make sure you entered the correct registered email.'
          }
        };
      }

      // If Firebase encountered rate limiting
      if (firebaseError && firebaseError.code === 'auth/too-many-requests') {
        return {
          success: false,
          error: {
            code: 'auth/too-many-requests',
            message: 'Too many password reset requests. Please wait a few minutes before trying again.'
          }
        };
      }

      // If backend succeeded with SMTP even if Firebase failed
      if (backendSuccess && backendData?.smtpSent) {
        return {
          success: true,
          email: cleanEmail,
          viaSmtp: true,
          message: `Password reset link sent to your registered email (${cleanEmail}).`
        };
      }

      return {
        success: false,
        error: firebaseError || { message: 'Failed to send password reset email. Please try again.' }
      };
    } catch (e) {
      console.error('sendPasswordReset exception:', e);
      return {
        success: false,
        error: { message: e.message || 'An unexpected error occurred while sending the reset link.' }
      };
    }
  },

  /**
   * Verify password reset token (Firebase oobCode, backend token, or local token)
   */
  verifyResetToken: async (email, tokenOrCode, mode = '') => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanToken = (tokenOrCode || '').trim();

    // 1. Firebase oobCode verification
    if (mode === 'resetPassword' || cleanToken.length > 40) {
      try {
        const resolvedEmail = await verifyPasswordResetCode(auth, cleanToken);
        return { valid: true, email: resolvedEmail || cleanEmail, isFirebase: true };
      } catch (fbErr) {
        console.warn('Firebase verifyPasswordResetCode error:', fbErr);
        if (!cleanEmail) {
          return { valid: false, error: 'Invalid or expired password reset link.' };
        }
      }
    }

    // 2. Backend token verification
    if (cleanEmail && cleanToken) {
      try {
        const res = await fetch('/api/auth/verify-reset-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, token: cleanToken })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.valid) {
            return { valid: true, email: cleanEmail, isBackend: true };
          }
        }
      } catch {}

      // 3. Local token verification fallback
      try {
        const raw = localStorage.getItem(`learnsmart_reset_${cleanEmail}`);
        if (raw) {
          const record = JSON.parse(raw);
          if (record && record.token === cleanToken && Date.now() < record.expiresAt) {
            return { valid: true, email: cleanEmail, isLocal: true };
          }
        }
      } catch {}
    }

    // If only email is provided and matches an active account, allow local password recovery
    if (cleanEmail) {
      const student = sharedDatabase.getStudentByEmail(cleanEmail);
      const educator = sharedDatabase.getEducatorByEmail(cleanEmail);
      const admin = sharedDatabase.getAdminUser(cleanEmail);
      if (student || educator || admin) {
        return { valid: true, email: cleanEmail, isLocal: true };
      }
    }

    return { valid: false, error: 'This password reset link is invalid or has expired. Please request a new one.' };
  },

  /**
   * Confirm and update the user's password
   */
  confirmResetPassword: async (email, tokenOrCode, newPassword, mode = '') => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanToken = (tokenOrCode || '').trim();

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    let updatedAny = false;

    // 1. Firebase password reset
    if (mode === 'resetPassword' || cleanToken.length > 40) {
      try {
        await confirmPasswordReset(auth, cleanToken, newPassword);
        updatedAny = true;
      } catch (fbErr) {
        console.warn('Firebase confirmPasswordReset notice:', fbErr);
      }
    }

    // 2. Backend password reset
    if (cleanEmail && cleanToken) {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, token: cleanToken, newPassword })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            updatedAny = true;
          }
        }
      } catch {}

      // Clean up local reset token
      try {
        localStorage.removeItem(`learnsmart_reset_${cleanEmail}`);
      } catch {}
    }

    // 3. Update in sharedDatabase (students, educators, admin)
    const localUpdated = sharedDatabase.updateUserPassword(cleanEmail, newPassword);
    if (localUpdated) {
      updatedAny = true;
    }

    if (updatedAny) {
      return {
        success: true,
        message: 'Your password has been successfully updated! You can now log in.'
      };
    }

    return {
      success: false,
      error: 'Unable to reset password. The link may have expired. Please request a new link.'
    };
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
