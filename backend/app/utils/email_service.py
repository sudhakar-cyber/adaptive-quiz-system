import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
from typing import Tuple
import requests

from config import config

logger = logging.getLogger("email_service")


def _send_via_resend(to_email: str, subject: str, text_content: str, html_content: str) -> Tuple[bool, str]:
    """
    Sends an email using Resend REST API.
    Never logs the API key.
    """
    if not config.RESEND_API_KEY:
        return (False, "Resend API key is not configured in backend/.env.")

    from_address = config.RESEND_FROM or "LearnSmart <onboarding@resend.dev>"
    if "<" not in from_address and "@" not in from_address:
        from_address = f"{from_address} <onboarding@resend.dev>"

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {config.RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "from": from_address,
        "to": [to_email],
        "subject": subject,
        "text": text_content,
        "html": html_content
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code in (200, 201):
            return (True, "Email sent successfully via Resend.")
        error_data = response.json() if response.content else {}
        err_msg = error_data.get("message") or f"Resend API error: HTTP {response.status_code}"
        logger.warning(f"Resend sending failed: {err_msg}")
        return (False, err_msg)
    except Exception as e:
        logger.error(f"Resend request exception: {str(e)}")
        return (False, f"Resend request error: {str(e)}")


def _send_via_smtp(to_email: str, subject: str, text_content: str, html_content: str) -> Tuple[bool, str]:
    """
    Sends an email using SMTP.
    """
    if not config.SMTP_USER or not config.SMTP_PASS:
        return (
            False,
            "SMTP email service is not configured."
        )

    sender_email = config.SMTP_FROM or config.SMTP_USER
    if "<" in sender_email and ">" in sender_email:
        raw_from = sender_email
    else:
        raw_from = f"LearnSmart <{sender_email}>"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = raw_from
    msg["To"] = to_email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="learnsmart.edu")

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        if config.SMTP_PORT == 465 or config.SMTP_SECURE:
            server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT, timeout=20)
        else:
            server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=20)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(config.SMTP_USER, config.SMTP_PASS)
        server.sendmail(config.SMTP_USER, [to_email], msg.as_string())
        server.quit()
        return (True, "Email sent successfully via SMTP.")
    except Exception as e:
        logger.error(f"SMTP sending error: {str(e)}")
        return (False, f"SMTP delivery failed: {str(e)}")


def send_password_reset_email(to_email: str, reset_link: str, user_name: str = "Learner") -> Tuple[bool, str]:
    """
    Sends a real password reset link email using SMTP.
    """
    subject = "Reset Your LearnSmart Password"

    text_content = f"""Hello {user_name},

We received a request to reset your password for your LearnSmart Adaptive Quiz account.

Click the link below or copy and paste it into your browser to reset your password:
{reset_link}

This link will expire in 30 minutes.

If you did not request a password reset, please ignore this email. Your password will remain unchanged.

Best regards,
The LearnSmart Team
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your LearnSmart Password</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      color: #1E293B;
    }}
    .email-container {{
      max-width: 520px;
      margin: 40px auto;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      border: 1px solid #E2E8F0;
    }}
    .email-header {{
      background: linear-gradient(135deg, #1A6BFF 0%, #0F4CD9 100%);
      padding: 32px 28px;
      text-align: center;
      color: #FFFFFF;
    }}
    .brand-title {{
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }}
    .brand-sub {{
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
      margin: 0;
    }}
    .email-body {{
      padding: 36px 32px;
    }}
    .greeting {{
      font-size: 17px;
      font-weight: 600;
      color: #0F172A;
      margin: 0 0 14px 0;
    }}
    .message-text {{
      font-size: 14.5px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 24px 0;
    }}
    .btn-container {{
      text-align: center;
      margin: 28px 0;
    }}
    .reset-btn {{
      display: inline-block;
      background-color: #1A6BFF;
      color: #FFFFFF !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(26, 107, 255, 0.35);
    }}
    .fallback-url {{
      background: #F1F5F9;
      padding: 12px;
      border-radius: 8px;
      font-size: 12px;
      word-break: break-all;
      color: #64748B;
      margin-bottom: 24px;
    }}
    .security-note {{
      background: #EFF6FF;
      border-left: 4px solid #1A6BFF;
      padding: 12px 14px;
      border-radius: 4px;
      font-size: 12.5px;
      color: #1E40AF;
      line-height: 1.5;
    }}
    .email-footer {{
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 18px 24px;
      text-align: center;
      font-size: 12px;
      color: #94A3B8;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="brand-title">LearnSmart</div>
      <div class="brand-sub">Adaptive Quiz System &bull; Password Reset</div>
    </div>
    <div class="email-body">
      <div class="greeting">Hello {user_name},</div>
      <div class="message-text">
        We received a request to reset the password associated with your account. Click the button below to choose a new password:
      </div>
      <div class="btn-container">
        <a href="{reset_link}" class="reset-btn" target="_blank">Reset Password</a>
      </div>
      <div class="message-text" style="font-size: 13px; margin-bottom: 8px;">
        If the button above does not work, copy and paste this link into your browser:
      </div>
      <div class="fallback-url">
        {reset_link}
      </div>
      <div class="security-note">
        <strong>Security Notice:</strong> This password reset link is valid for 30 minutes. If you did not request a password reset, you can safely ignore this email; your account remains secure.
      </div>
    </div>
    <div class="email-footer">
      This is an automated email sent to {to_email}.<br>
      LearnSmart Adaptive Quiz System &bull; Secure Authentication Service
    </div>
  </div>
</body>
</html>
"""

    if config.RESEND_API_KEY:
        sent, msg = _send_via_resend(to_email, subject, text_content, html_content)
        if sent:
            return (True, "Password reset email sent successfully.")
        if config.SMTP_USER and config.SMTP_PASS:
            return _send_via_smtp(to_email, subject, text_content, html_content)
        return (False, msg)

    if config.SMTP_USER and config.SMTP_PASS:
        return _send_via_smtp(to_email, subject, text_content, html_content)

    return (
        False,
        "No email service is configured. Please provide RESEND_API_KEY in backend/.env."
    )


def send_otp_email(to_email: str, otp_code: str, user_name: str = "Learner") -> Tuple[bool, str]:
    """
    Sends a real 4-digit verification code email using Resend (with SMTP fallback).
    """
    subject = f"{otp_code} is your LearnSmart verification code"

    text_content = f"""Hello {user_name},

Thank you for signing up for LearnSmart Adaptive Quiz System!

Your 4-digit verification code is: {otp_code}

This code will expire in {config.OTP_EXPIRY_MINUTES} minutes.

Do not share this code with anyone.

Best regards,
The LearnSmart Team
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LearnSmart Email Verification</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      color: #1E293B;
    }}
    .email-container {{
      max-width: 520px;
      margin: 40px auto;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      border: 1px solid #E2E8F0;
    }}
    .email-header {{
      background: linear-gradient(135deg, #1A6BFF 0%, #0F4CD9 100%);
      padding: 32px 24px;
      text-align: center;
      color: #FFFFFF;
    }}
    .email-logo-title {{
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }}
    .email-tagline {{
      font-size: 13px;
      opacity: 0.9;
      margin-top: 6px;
    }}
    .email-body {{
      padding: 32px 32px 28px 32px;
      text-align: center;
    }}
    .email-heading {{
      font-size: 20px;
      font-weight: 700;
      color: #0F172A;
      margin-top: 0;
      margin-bottom: 12px;
    }}
    .email-text {{
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 24px;
    }}
    .otp-box {{
      background: #EFF6FF;
      border: 2px dashed #1A6BFF;
      border-radius: 12px;
      padding: 20px;
      margin: 24px auto;
      max-width: 280px;
    }}
    .otp-lead {{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748B;
      margin-bottom: 6px;
      font-weight: 600;
    }}
    .otp-code {{
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 12px;
      color: #1A6BFF;
      font-family: 'Courier New', Courier, monospace;
      padding-left: 12px;
      margin: 4px 0;
    }}
    .otp-expiry {{
      font-size: 12px;
      color: #64748B;
      margin-top: 8px;
      font-weight: 500;
    }}
    .security-note {{
      background: #FEF3C7;
      border-left: 4px solid #F59E0B;
      padding: 12px 16px;
      border-radius: 6px;
      text-align: left;
      font-size: 12px;
      color: #92400E;
      margin-top: 24px;
      line-height: 1.5;
    }}
    .email-footer {{
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 20px;
      text-align: center;
      font-size: 11px;
      color: #94A3B8;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1 class="email-logo-title">LearnSmart</h1>
      <div class="email-tagline">Adaptive Quiz &amp; Personalized Learning System</div>
    </div>
    <div class="email-body">
      <h2 class="email-heading">Email Verification Code</h2>
      <p class="email-text">
        Welcome to LearnSmart! Use the 4-digit verification code below to verify your email address and complete your account creation.
      </p>
      
      <div class="otp-box">
        <div class="otp-lead">Your Verification Code</div>
        <div class="otp-code">{otp_code}</div>
        <div class="otp-expiry">Valid for {config.OTP_EXPIRY_MINUTES} minutes</div>
      </div>
      
      <p class="email-text" style="font-size: 13px; color: #475569; margin-top: 16px;">
        Your LearnSmart verification code is: <strong>{otp_code}</strong>
      </p>
      
      <div class="security-note">
        <strong>Security Notice:</strong> Never share this code with anyone. LearnSmart support staff will never ask you for your verification code or password.
      </div>
    </div>
    <div class="email-footer">
      This is an automated email sent to {to_email}.<br>
      If you did not attempt to register on LearnSmart, you can safely ignore this message.
    </div>
  </div>
</body>
</html>
"""

    if config.RESEND_API_KEY:
        sent, msg = _send_via_resend(to_email, subject, text_content, html_content)
        if sent:
            return (True, "Verification email sent successfully.")
        if config.SMTP_USER and config.SMTP_PASS:
            logger.warning(f"Resend error: {msg}. Attempting SMTP fallback.")
            return _send_via_smtp(to_email, subject, text_content, html_content)
        return (False, msg)

    if config.SMTP_USER and config.SMTP_PASS:
        return _send_via_smtp(to_email, subject, text_content, html_content)

    return (
        False,
        "No email service is configured. Please provide RESEND_API_KEY in backend/.env."
    )

