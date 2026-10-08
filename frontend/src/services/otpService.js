/**
 * Service to communicate with the secure backend OTP endpoints.
 */

const API_BASE_URL = ''; // Relative path leverages Vite dev proxy; falls back to port 5000 directly

async function fetchWithFallback(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    return res;
  } catch (err) {
    // If relative path fails (e.g. proxy issue), try absolute localhost:5000
    try {
      const fallbackRes = await fetch(`http://127.0.0.1:5000${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      return fallbackRes;
    } catch (fallbackErr) {
      throw new Error(
        'Unable to connect to the authentication server. Please ensure the backend is running.'
      );
    }
  }
}

export const otpService = {
  /**
   * Request a real 4-digit verification code to be sent to the user's email.
   * @param {string} email
   * @returns {Promise<{success: boolean, message?: string, error?: string, cooldownSeconds?: number}>}
   */
  sendOtp: async (email) => {
    try {
      const res = await fetchWithFallback('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.detail || data.error || 'Failed to send verification code. Please try again.'
        };
      }

      return {
        success: true,
        message: data.message || `Verification code sent to ${email}.`,
        cooldownSeconds: data.cooldownSeconds || 60,
        expiresInMinutes: data.expiresInMinutes || 10
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Network error while requesting verification code.'
      };
    }
  },

  /**
   * Resend verification OTP code to the user's email.
   * @param {string} email
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  resendOtp: async (email) => {
    try {
      const res = await fetchWithFallback('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.detail || data.error || 'Failed to resend verification code.'
        };
      }

      return {
        success: true,
        message: data.message || `New verification code sent to ${email}.`,
        cooldownSeconds: data.cooldownSeconds || 60
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Network error while resending verification code.'
      };
    }
  },

  /**
   * Verify the 4-digit OTP entered by the user.
   * @param {string} email
   * @param {string} otp
   * @returns {Promise<{success: boolean, verificationToken?: string, error?: string}>}
   */
  verifyOtp: async (email, otp) => {
    try {
      const cleanOtp = (otp || '').trim();
      if (!cleanOtp || cleanOtp.length !== 4) {
        return {
          success: false,
          error: 'Please enter the complete 4-digit verification code.'
        };
      }

      const res = await fetchWithFallback('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), otp: cleanOtp })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.detail || data.error || 'Incorrect verification code. Please try again.'
        };
      }

      return {
        success: true,
        verificationToken: data.verificationToken,
        message: data.message || 'Code verified successfully.'
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Network error while verifying code.'
      };
    }
  },

  /**
   * Check if backend SMTP is configured.
   * @returns {Promise<{smtpConfigured: boolean}>}
   */
  checkSmtpStatus: async () => {
    try {
      const res = await fetchWithFallback('/api/auth/smtp-status', { method: 'GET' });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return { smtpConfigured: false };
  }
};

export default otpService;
