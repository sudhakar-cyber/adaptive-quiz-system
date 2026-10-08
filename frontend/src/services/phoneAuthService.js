import {
  auth,
  db,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  linkWithCredential,
  EmailAuthProvider,
  updateProfile,
  doc,
  setDoc,
  serverTimestamp
} from '../config/firebase.js';
import { sharedDatabase } from './sharedDatabase.js';
import { authService } from './authService.js';

export const COUNTRY_DIAL_CODES = {
  'United States': '+1',
  'Canada': '+1',
  'United Kingdom': '+44',
  'Australia': '+61',
  'India': '+91',
  'Germany': '+49',
  'France': '+33',
  'Singapore': '+65',
  'Japan': '+81',
  'United Arab Emirates': '+971',
  'Brazil': '+55',
  'Other': '+1'
};

// Module-level storage for current verification session
let currentConfirmationResult = null;
let currentFormattedPhone = '';

/**
 * Format and normalize input phone number into E.164 international standard (+[country][national]).
 * Example: '9876543210' + 'India' -> '+919876543210'
 * Example: '+91 98765 43210' -> '+919876543210'
 */
export function formatToE164(rawPhone, country = 'United States') {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  const trimmed = rawPhone.trim();

  // If already starts with '+', keep '+' and strip non-digit characters
  if (trimmed.startsWith('+')) {
    const cleaned = '+' + trimmed.slice(1).replace(/\D/g, '');
    return cleaned;
  }

  // User didn't type '+', look up dial code for selected country
  const dialCode = COUNTRY_DIAL_CODES[country] || '+1';
  // Strip leading zero often used in domestic trunk dialling (e.g. 09876543210 -> 9876543210)
  let digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.startsWith('0')) {
    digitsOnly = digitsOnly.slice(1);
  }

  return `${dialCode}${digitsOnly}`;
}

/**
 * Validate whether a phone number matches E.164 format.
 */
export function isValidE164(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // E.164 format: '+' followed by 7 to 15 digits
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  return e164Regex.test(phone);
}

/**
 * Formats an E.164 phone number nicely for human display.
 * Example: '+919876543210' -> '+91 98765 43210'
 */
export function formatPhoneDisplay(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();

  // India: +91 XXXXX XXXXX
  if (clean.startsWith('+91') && clean.length === 13) {
    return `+91 ${clean.slice(3, 8)} ${clean.slice(8)}`;
  }

  // US/Canada: +1 (XXX) XXX-XXXX
  if (clean.startsWith('+1') && clean.length === 12) {
    return `+1 (${clean.slice(2, 5)}) ${clean.slice(5, 8)}-${clean.slice(8)}`;
  }

  // UK: +44 XXXX XXXXXX
  if (clean.startsWith('+44') && clean.length >= 12) {
    return `+44 ${clean.slice(3, 7)} ${clean.slice(7)}`;
  }

  // Generic fallback: group in chunks
  if (clean.startsWith('+')) {
    const codeMatch = clean.match(/^\+(\d{1,3})(\d+)$/);
    if (codeMatch) {
      const [, code, rest] = codeMatch;
      const mid = Math.floor(rest.length / 2);
      return `+${code} ${rest.slice(0, mid)} ${rest.slice(mid)}`;
    }
  }

  return clean;
}

/**
 * Translates Firebase Auth error codes into clear, user-friendly messages.
 */
export function getFriendlyPhoneAuthError(err) {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const code = err.code || (typeof err === 'string' ? err : '');
  const message = err.message || (typeof err === 'string' ? err : '');

  if (code === 'auth/invalid-phone-number' || message.includes('invalid-phone-number')) {
    return 'Invalid phone number format. Please ensure the country code and digits are correct.';
  }
  if (code === 'auth/missing-phone-number' || message.includes('missing-phone-number')) {
    return 'Please enter your phone number.';
  }
  if (code === 'auth/quota-exceeded' || message.includes('quota-exceeded')) {
    return 'SMS quota exceeded for today. Please wait a while or try again later.';
  }
  if (
    code === 'auth/captcha-check-failed' ||
    code === 'auth/missing-recaptcha-token' ||
    message.includes('captcha-check-failed') ||
    message.includes('recaptcha')
  ) {
    return 'Security verification (reCAPTCHA) failed. Please try again.';
  }
  if (code === 'auth/too-many-requests' || message.includes('too-many-requests')) {
    return 'Too many requests. Please wait a few moments before trying again.';
  }
  if (
    code === 'auth/invalid-verification-code' ||
    code === 'auth/invalid-verification-id' ||
    message.includes('invalid-verification-code')
  ) {
    return 'Incorrect verification code. Please check your SMS and try again.';
  }
  if (code === 'auth/code-expired' || message.includes('code-expired')) {
    return 'This verification code has expired. Please click "Resend OTP".';
  }
  if (code === 'auth/session-expired' || message.includes('session-expired')) {
    return 'Verification session expired. Please request a new verification code.';
  }
  if (
    code === 'auth/credential-already-in-use' ||
    code === 'auth/phone-number-already-exists' ||
    message.includes('credential-already-in-use')
  ) {
    return 'This phone number is already registered or associated with another account.';
  }
  if (code === 'auth/provider-already-linked' || message.includes('provider-already-linked')) {
    return 'This account is already linked to a phone number.';
  }
  if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
    return 'Network connection error. Please check your internet connection.';
  }
  if (code === 'auth/invalid-app-credential' || message.includes('invalid-app-credential')) {
    return 'Firebase app verification failed. Please refresh the page and try again.';
  }

  let clean = message.replace(/^Firebase:\s*/i, '').trim();
  clean = clean.replace(/^Error\s*\((auth\/[^)]+)\):?/i, '$1:').trim();
  return clean || 'Phone authentication failed. Please try again.';
}

/**
 * Clean up existing reCAPTCHA instance to allow fresh verification.
 */
export function clearRecaptcha() {
  if (typeof window !== 'undefined' && window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      console.warn('Notice clearing recaptcha:', e);
    }
    window.recaptchaVerifier = null;
  }
}

/**
 * Initializes and returns an invisible RecaptchaVerifier attached to the DOM.
 */
export function getRecaptchaVerifier(containerId = 'recaptcha-container') {
  if (typeof window === 'undefined') return null;

  // Make sure the target DOM element exists
  let el = document.getElementById(containerId);
  if (!el) {
    el = document.createElement('div');
    el.id = containerId;
    document.body.appendChild(el);
  }

  // Clear any existing verifier instance
  clearRecaptcha();

  window.recaptchaVerifier = new RecaptchaVerifier(auth, el, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved automatically
    },
    'expired-callback': () => {
      clearRecaptcha();
    }
  });

  return window.recaptchaVerifier;
}

export const phoneAuthService = {
  /**
   * Send a real SMS OTP via Firebase Phone Authentication.
   * Handles account linking if an existing user is already signed in (e.g. Google user).
   */
  sendOtp: async (rawPhone, country = 'United States') => {
    try {
      if (!rawPhone || !rawPhone.trim()) {
        return { success: false, error: 'Please enter your phone number.' };
      }

      const formatted = formatToE164(rawPhone, country);
      if (!isValidE164(formatted)) {
        return {
          success: false,
          error: 'Please enter a valid phone number with country code (e.g. +91 98765 43210 or select your country).'
        };
      }

      const verifier = getRecaptchaVerifier('recaptcha-container');
      if (!verifier) {
        return { success: false, error: 'Failed to initialize security verification (reCAPTCHA).' };
      }

      // If user already authenticated with Google or another provider, link phone instead of creating duplicate account
      let confirmationResult = null;
      if (auth.currentUser) {
        try {
          confirmationResult = await linkWithPhoneNumber(auth.currentUser, formatted, verifier);
        } catch (linkErr) {
          // If already linked with this phone, signInWithPhoneNumber fallback
          if (linkErr.code === 'auth/provider-already-linked') {
            confirmationResult = await signInWithPhoneNumber(auth, formatted, verifier);
          } else {
            throw linkErr;
          }
        }
      } else {
        confirmationResult = await signInWithPhoneNumber(auth, formatted, verifier);
      }

      currentConfirmationResult = confirmationResult;
      currentFormattedPhone = formatted;
      const display = formatPhoneDisplay(formatted);

      return {
        success: true,
        formattedPhone: formatted,
        displayPhone: display,
        cooldownSeconds: 60,
        message: `Verification code sent to ${display}`
      };
    } catch (err) {
      console.warn('Firebase send phone OTP error:', err);
      clearRecaptcha();
      return {
        success: false,
        error: getFriendlyPhoneAuthError(err)
      };
    }
  },

  /**
   * Resend phone OTP using Firebase's supported flow.
   */
  resendOtp: async (rawPhone, country = 'United States') => {
    // Re-triggering sendOtp clears the previous reCAPTCHA token and requests a fresh SMS from Firebase
    return await phoneAuthService.sendOtp(rawPhone, country);
  },

  /**
   * Verify the 6-digit OTP code entered by the user.
   * Only after successful OTP verification:
   *  - Creates/links the Firebase user
   *  - Updates/creates Firestore profile (stores UID, names, email, phone, country, role = 'student')
   *  - Never stores passwords in Firestore
   *  - Establishes local active session
   */
  verifyOtp: async (otpCode, profileDetails = {}) => {
    try {
      const cleanOtp = (otpCode || '').replace(/\D/g, '').trim();
      if (!cleanOtp || cleanOtp.length !== 6) {
        return {
          success: false,
          error: 'Please enter the complete 6-digit verification code.'
        };
      }

      if (!currentConfirmationResult) {
        return {
          success: false,
          error: 'No active verification session found. Please request a new verification code.'
        };
      }

      // 1. Verify SMS OTP using Firebase
      const userCredential = await currentConfirmationResult.confirm(cleanOtp);
      const user = userCredential.user;

      if (!user || !user.uid) {
        return {
          success: false,
          error: 'Firebase verification failed. No user record returned.'
        };
      }

      const verifiedPhone = user.phoneNumber || currentFormattedPhone || profileDetails.phone || '';
      const firstName = (profileDetails.firstName || '').trim();
      const lastName = (profileDetails.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim() || user.displayName || 'Student';
      const email = (profileDetails.email || user.email || '').trim().toLowerCase();
      const country = profileDetails.country || 'United States';

      // 2. Account Linking: Link Email & Password if provided and user not already linked
      if (email && profileDetails.password) {
        try {
          const emailCred = EmailAuthProvider.credential(email, profileDetails.password);
          await linkWithCredential(user, emailCred);
        } catch (linkErr) {
          // If already linked or email in use, keep moving smoothly
          console.warn('Email credential linking notice:', linkErr?.code || linkErr?.message);
        }
      }

      // 3. Update Firebase Auth displayName
      try {
        await updateProfile(user, { displayName: fullName });
      } catch (e) {
        console.warn('updateProfile notice:', e);
      }

      // 4. Create/update Firestore user profile (NEVER store password!)
      const userDocRef = doc(db, 'users', user.uid);
      const profileData = {
        uid: user.uid,
        firstName,
        lastName,
        displayName: fullName,
        name: fullName,
        email,
        phoneNumber: verifiedPhone,
        phone: verifiedPhone,
        country,
        role: 'student',
        authProvider: 'phone',
        phoneVerified: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      };

      try {
        await authService.safeFirestoreOp(setDoc(userDocRef, profileData, { merge: true }), 2500);
      } catch (fsErr) {
        console.warn('Firestore profile write notice:', fsErr);
      }

      // 5. Update local student session (NEVER store password in sharedDatabase!)
      const studentPayload = {
        name: fullName,
        firstName,
        lastName,
        email,
        phone: verifiedPhone,
        country,
        uid: user.uid,
        role: 'student',
        authProvider: 'phone'
      };

      const activeStudent = sharedDatabase.registerStudent(studentPayload);
      authService.loginStudent(activeStudent);

      // Clean up session
      currentConfirmationResult = null;
      clearRecaptcha();

      return {
        success: true,
        user,
        student: activeStudent,
        role: 'student',
        message: 'Phone number verified successfully!'
      };
    } catch (err) {
      console.warn('Firebase verify phone OTP error:', err);
      return {
        success: false,
        error: getFriendlyPhoneAuthError(err)
      };
    }
  },

  /**
   * Reset the current verification session state.
   */
  resetSession: () => {
    currentConfirmationResult = null;
    currentFormattedPhone = '';
    clearRecaptcha();
  }
};

export default phoneAuthService;
