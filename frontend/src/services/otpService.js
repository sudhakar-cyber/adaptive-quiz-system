const OTP_API_BASE = '/api/auth';

const postOtpRequest = async (action, payload) => {
  const response = await fetch(`${OTP_API_BASE}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      success: false,
      error: data?.error || data?.message || `OTP request failed (${response.status}).`
    };
  }

  return data || { success: false, error: 'The OTP service returned an invalid response.' };
};

export const otpService = {
  sendOtp: (email) => postOtpRequest('send-otp', { email }),

  verifyOtp: (email, otp) => postOtpRequest('verify-otp', { email, otp }),

  resendOtp: (email) => postOtpRequest('resend-otp', { email })
};

export default otpService;
