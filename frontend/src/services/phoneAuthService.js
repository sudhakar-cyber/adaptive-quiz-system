import {
  auth,
  db,
  RecaptchaVerifier,
  signInWithPhoneNumber,
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
  'India': '+91',
  'United States': '+1',
  'Canada': '+1',
  'United Kingdom': '+44',
  'Australia': '+61',
  'Germany': '+49',
  'France': '+33',
  'Singapore': '+65',
  'Japan': '+81',
  'United Arab Emirates': '+971',
  'Brazil': '+55',
  'Other': '+1'
};

// Module-level storage for the active Firebase ConfirmationResult
let currentConfirmationResult = null;
let currentFormattedPhone = '';

/**
 * Normalizes an Indian phone number into E.164 format (+91 followed by the 10-digit mobile number).
 * Handles:
 *  - 10 digits: '9876543210' -> '+919876543210'
 *  - Trunk prefix '0': '09876543210' -> '+919876543210'
 *  - Country prefix '91': '919876543210' -> '+919876543210'
 *  - International prefix '0091': '00919876543210' -> '+919876543210'
 *  - Existing E.164: '+919876543210' or '+91 98765 43210' -> '+919876543210'
 */
export function formatIndianPhoneToE164(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  const trimmed = rawPhone.trim();

  // Extract all numeric digits
  let digits = trimmed.replace(/\D/g, '');

  // Strip international call prefix '0091'
  if (digits.startsWith('0091') && digits.length === 14) {
    digits = digits.slice(4);
  }
  // Strip '91' country code if 12 digits total
  else if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  // Strip trunk prefix '0' if 11 digits total
  else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // A valid Indian mobile number has exactly 10 digits
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return '';
}

/**
 * Format raw phone number into E.164 international standard (+[country][national]).
 * Automatically ensures Indian phone numbers are converted to '+91' followed by the 10-digit number.
 */
export function formatToE164(rawPhone, country = 'India') {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  const trimmed = rawPhone.trim();

  // Check if this is an Indian number
  const indianE164 = formatIndianPhoneToE164(trimmed);

  // If country is India, prioritize Indian E.164 format
  if (country === 'India' && indianE164) {
    return indianE164;
  }

  // If number begins with +91 or was detected as a valid Indian mobile number
  if (trimmed.startsWith('+91') && indianE164) {
    return indianE164;
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (indianE164 && (country === 'India' || /^[6-9]\d{9}$/.test(digitsOnly) || /^91[6-9]\d{9}$/.test(digitsOnly))) {
    return indianE164;
  }

  // If explicitly starts with '+'
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }

  // Fallback with country dial code
  const dialCode = COUNTRY_DIAL_CODES[country] || '+91';
  let cleanDigits = digitsOnly;
  if (cleanDigits.startsWith('0')) {
    cleanDigits = cleanDigits.slice(1);
  }

  return `${dialCode}${cleanDigits}`;
}

/**
 * Validates whether a phone number matches E.164 (+ followed by 7 to 15 digits).
 */
export function isValidE164(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  return e164Regex.test(phone);
}

/**
 * Masks phone number for secure display on the OTP screen.
 * Example: '+919876543210' -> '+91 ****** 3210'
 */
export function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();

  if (trimmed.startsWith('+')) {
    const digitsOnly = trimmed.slice(1);
    if (digitsOnly.length <= 6) return trimmed;
    // Determine country code length (+1 = 2, +91 = 3, etc.)
    const codeLength = trimmed.startsWith('+1') ? 2 : 3;
    const code = trimmed.slice(0, codeLength);
    const suffix = trimmed.slice(-4);
    const maskLen = Math.max(4, trimmed.length - codeLength - 4);
    return `${code} ${'*'.repeat(maskLen)} ${suffix}`;
  }

  if (trimmed.length > 6) {
    const suffix = trimmed.slice(-4);
    return `******${suffix}`;
  }

  return trimmed;
}

/**
 * Extracts the Firebase error code (e.g. 'auth/operation-not-allowed').
 */
export function extractFirebaseErrorCode(err) {
  if (!err) return '';
  if (typeof err === 'string') {
    const match = err.match(/auth\/[a-z0-9-]+/i);
    return match ? match[0] : '';
  }
  if (err.code && typeof err.code === 'string') {
    return err.code;
  }
  if (err.message && typeof err.message === 'string') {
    const match = err.message.match(/auth\/[a-z0-9-]+/i);
    return match ? match[0] : '';
  }
  return '';
}

/**
 * Translates Firebase Auth error codes into clear, user-friendly messages
 * while preserving and displaying the actual Firebase error code.
 */
export function getFriendlyPhoneAuthError(err) {
  if (!err) return 'An unexpected error occurred. Please try again.';

  const code = extractFirebaseErrorCode(err);
  const rawMessage = (err && typeof err === 'object' && err.message) ? err.message : (typeof err === 'string' ? err : '');

  let friendly = '';

  switch (code) {
    case 'auth/operation-not-allowed': {
      if (rawMessage.toLowerCase().includes('region')) {
        friendly = 'SMS unable to be sent until this region is enabled in Firebase Console (Authentication > Settings > SMS Region Policy).';
      } else if (rawMessage.toLowerCase().includes('billing')) {
        friendly = 'Cloud Billing is not enabled for project adaptive-quiz-system-957ee. Phone Authentication requires linking a Google Cloud Billing account (Blaze plan) in Firebase Console.';
      } else {
        friendly = 'Phone authentication is not allowed. In Firebase Console: 1) Verify project adaptive-quiz-system-957ee is on the Blaze (Pay-as-you-go) plan with Cloud Billing enabled (required by Firebase for Phone SMS since Sept 2024), and 2) Ensure Authentication > Settings > SMS Region Policy allows your country.';
      }
      break;
    }
    case 'auth/billing-not-enabled':
      friendly = 'Cloud Billing is not enabled for project adaptive-quiz-system-957ee. Phone Authentication requires linking a Google Cloud Billing account (Blaze plan) in Firebase Console.';
      break;
    case 'auth/invalid-phone-number':
      friendly = 'Invalid phone number format. Please ensure country code (+91) and a valid 10-digit mobile number are entered.';
      break;
    case 'auth/missing-phone-number':
      friendly = 'Please enter your phone number.';
      break;
    case 'auth/quota-exceeded':
      friendly = 'SMS quota has been exceeded for this project. Please wait a while or try again later.';
      break;
    case 'auth/captcha-check-failed':
    case 'auth/missing-recaptcha-token':
      friendly = 'Security verification (reCAPTCHA) failed. Please refresh the page and try again.';
      break;
    case 'auth/too-many-requests':
      friendly = 'Too many requests. Please wait a few moments before trying again.';
      break;
    case 'auth/invalid-verification-code':
      friendly = 'Incorrect verification code. Please check your SMS and try again.';
      break;
    case 'auth/code-expired':
      friendly = 'This verification code has expired. Please click "Resend OTP".';
      break;
    case 'auth/session-expired':
    case 'auth/invalid-verification-id':
      friendly = 'Verification session has expired. Please click "Resend OTP".';
      break;
    case 'auth/credential-already-in-use':
    case 'auth/phone-number-already-exists':
      friendly = 'This phone number is already registered or associated with another account.';
      break;
    case 'auth/network-request-failed':
      friendly = 'Network connection error. Please check your internet connection.';
      break;
    case 'auth/app-not-authorized':
      friendly = 'This domain is not authorized in Firebase Console (Authentication > Settings > Authorized domains).';
      break;
    case 'auth/invalid-app-credential':
      friendly = 'Firebase app verification failed. Please refresh the page and try again.';
      break;
    case 'auth/internal-error':
      friendly = 'Internal Firebase authentication error occurred. Please try again.';
      break;
    default: {
      let clean = rawMessage.replace(/^Firebase:\s*/i, '').trim();
      clean = clean.replace(/^Error\s*\((auth\/[^)]+)\):?/i, '$1:').trim();
      friendly = clean || 'Phone authentication failed. Please try again.';
    }
  }

  // Display both the actual Firebase error code and the user-friendly message
  if (code) {
    return `[${code}] ${friendly}`;
  }

  return friendly || 'Phone authentication failed. Please try again.';
}

/**
 * Clean up existing invisible reCAPTCHA instance.
 */
export function clearRecaptcha() {
  if (typeof window !== 'undefined') {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        console.warn('Notice clearing recaptcha:', e);
      }
      window.recaptchaVerifier = null;
    }
    const container = document.getElementById('recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }
  }
}

/**
 * Initializes and returns an invisible RecaptchaVerifier attached to the DOM.
 */
export function getRecaptchaVerifier(containerId = 'recaptcha-container') {
  if (typeof window === 'undefined') return null;

  clearRecaptcha();

  let el = document.getElementById(containerId);
  if (!el) {
    el = document.createElement('div');
    el.id = containerId;
    document.body.appendChild(el);
  }

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
  formatToE164,
  formatIndianPhoneToE164,
  isValidE164,
  maskPhoneNumber,
  extractFirebaseErrorCode,
  getFriendlyPhoneAuthError,
  clearRecaptcha,
  getRecaptchaVerifier,
  COUNTRY_DIAL_CODES,

  /**
   * Request a real SMS OTP using Firebase Phone Authentication.
   */
  sendPhoneOtp: async (rawPhone, country = 'India') => {
    try {
      if (!rawPhone || !rawPhone.trim()) {
        return { success: false, error: 'Please enter your phone number.' };
      }

      const formatted = formatToE164(rawPhone, country);
      if (!isValidE164(formatted)) {
        return {
          success: false,
          error: 'Please enter a valid 10-digit mobile number (e.g. 9876543210 or +91 98765 43210).'
        };
      }

      const masked = maskPhoneNumber(formatted);
      currentFormattedPhone = formatted;

      const verifier = getRecaptchaVerifier('recaptcha-container');
      if (!verifier) {
        return { success: false, error: 'Could not initialize reCAPTCHA verifier. Please refresh the page.' };
      }

      const confirmationResult = await signInWithPhoneNumber(auth, formatted, verifier);
      currentConfirmationResult = confirmationResult;

      return {
        success: true,
        formattedPhone: formatted,
        maskedPhone: masked,
        cooldownSeconds: 60,
        message: `Verification code sent via SMS to ${masked}`
      };
    } catch (err) {
      console.warn('Firebase signInWithPhoneNumber error:', err);
      clearRecaptcha();
      return {
        success: false,
        error: getFriendlyPhoneAuthError(err),
        errorCode: extractFirebaseErrorCode(err)
      };
    }
  },

  /**
   * Resend SMS OTP using Firebase Phone Authentication.
   */
  resendPhoneOtp: async (rawPhone, country = 'India') => {
    return await phoneAuthService.sendPhoneOtp(rawPhone, country);
  },

  /**
   * Verify the 6-digit SMS OTP using Firebase confirmationResult.
   * Only after successful OTP verification:
   * 1. Creates/updates Firebase user profile (displayName).
   * 2. Links email/password credentials to the Firebase user.
   * 3. Creates Firestore document at users/{firebaseUID} with:
   *    firstName, lastName, email, phoneNumber, country, role: "student", createdAt, updatedAt.
   *    (Never stores passwords or OTPs in Firestore).
   * 4. Establishes active student session and logs in.
   */
  verifyPhoneOtp: async (otpCode, registrationData = {}) => {
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
          error: 'Verification session expired. Please click "Resend OTP".'
        };
      }

      // Verify OTP with Firebase
      const userCredential = await currentConfirmationResult.confirm(cleanOtp);
      const user = userCredential.user;

      if (!user || !user.uid) {
        return {
          success: false,
          error: 'Firebase verification failed to authenticate user.'
        };
      }

      const verifiedPhone = user.phoneNumber || currentFormattedPhone || formatToE164(registrationData.phone, registrationData.country || 'India') || '';
      const firstName = (registrationData.firstName || '').trim();
      const lastName = (registrationData.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim() || user.displayName || 'Student';
      const email = (registrationData.email || user.email || '').trim().toLowerCase();
      const country = registrationData.country || 'India';

      // 1. Link Email & Password credential if provided (allowing email/password login too)
      if (email && registrationData.password) {
        try {
          const emailCred = EmailAuthProvider.credential(email, registrationData.password);
          await linkWithCredential(user, emailCred);
        } catch (linkErr) {
          console.warn('Notice linking email/password credential:', linkErr?.code || linkErr?.message);
        }
      }

      // 2. Update Firebase Auth displayName
      try {
        await updateProfile(user, { displayName: fullName });
      } catch (profErr) {
        console.warn('Notice updating profile displayName:', profErr);
      }

      // 3. Create / update Firestore user document at users/{firebaseUID}
      // ONLY specified fields: firstName, lastName, email, phoneNumber, country, role: "student", createdAt, updatedAt
      // NEVER store passwords or OTPs!
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const firestoreData = {
          firstName,
          lastName,
          email,
          phoneNumber: verifiedPhone,
          country,
          role: 'student',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await authService.safeFirestoreOp(setDoc(userDocRef, firestoreData, { merge: true }), 2500);
      } catch (fsErr) {
        console.warn('Firestore profile creation warning:', fsErr);
      }

      // 4. Update student profile in sharedDatabase & local storage
      const studentPayload = {
        uid: user.uid,
        name: fullName,
        firstName,
        lastName,
        email,
        phone: verifiedPhone,
        country,
        role: 'student',
        authProvider: 'phone'
      };

      const activeStudent = sharedDatabase.registerStudent(studentPayload);
      authService.loginStudent(activeStudent);

      // Clean up session and verifiers
      currentConfirmationResult = null;
      currentFormattedPhone = '';
      clearRecaptcha();

      return {
        success: true,
        user,
        student: activeStudent,
        role: 'student',
        message: 'Phone number verified successfully!'
      };
    } catch (err) {
      console.warn('Firebase verifyPhoneOtp error:', err);
      return {
        success: false,
        error: getFriendlyPhoneAuthError(err),
        errorCode: extractFirebaseErrorCode(err)
      };
    }
  },

  resetSession: () => {
    currentConfirmationResult = null;
    currentFormattedPhone = '';
    clearRecaptcha();
  }
};

export default phoneAuthService;
