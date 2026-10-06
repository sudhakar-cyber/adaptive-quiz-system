import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
import logging
from config import config

logger = logging.getLogger("email_service")

def send_otp_email(to_email: str, otp_code: str) -> tuple[bool, str]:
    """
    Sends a real 6-digit verification OTP email to the user's email address using SMTP.
    Returns (success: bool, message_or_error: str).
    """
    if not config.SMTP_USER or not config.SMTP_PASS:
        return (
            False,
            "SMTP server is not configured. Please add SMTP_USER and SMTP_PASS to backend/.env."
        )

    sender_email = config.SMTP_FROM or config.SMTP_USER
    if "<" in sender_email and ">" in sender_email:
        raw_from = sender_email
    else:
        raw_from = f"LearnSmart Adaptive Quiz <{sender_email}>"

    subject = f"Your LearnSmart Verification Code: {otp_code}"

    # Plain text version for non-HTML mail clients
    text_content = f"""Hello,

Thank you for signing up for LearnSmart Adaptive Quiz System.

Your 6-digit verification code is: {otp_code}

This code will expire in {config.OTP_EXPIRY_MINUTES} minutes.
For security reasons, do not share this code with anyone.

If you did not request this verification code, please ignore this email.

Best regards,
The LearnSmart Team
"""

    # Rich responsive HTML version matching LearnSmart branding
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LearnSmart Verification Code</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      color: #1E293B;
    }}
    .email-container {{
      max-width: 540px;
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
      opacity: 0.88;
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
      background: #F1F5F9;
      border: 2px dashed #1A6BFF;
      border-radius: 12px;
      padding: 20px;
      margin: 24px auto;
      display: inline-block;
      min-width: 240px;
    }}
    .otp-code {{
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #1A6BFF;
      font-family: 'Courier New', Courier, monospace;
      padding-left: 10px;
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
        Welcome to LearnSmart! Use the 6-digit verification code below to verify your email address and complete your account creation.
      </p>
      
      <div class="otp-box">
        <div class="otp-code">{otp_code}</div>
        <div class="otp-expiry">Valid for {config.OTP_EXPIRY_MINUTES} minutes</div>
      </div>
      
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

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = raw_from
    msg["To"] = to_email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="learnsmart.edu")

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        # Port 465 is typically SSL
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
        return (True, "Verification email sent successfully.")
    except smtplib.SMTPAuthenticationError as auth_err:
        err_msg = (
            "SMTP Authentication failed. For Gmail, please use an App Password "
            "(Google Account -> Security -> 2-Step Verification -> App passwords). "
            f"Details: {auth_err}"
        )
        logger.error(err_msg)
        return (False, err_msg)
    except smtplib.SMTPConnectError as conn_err:
        err_msg = f"Failed to connect to SMTP server {config.SMTP_HOST}:{config.SMTP_PORT}. Error: {conn_err}"
        logger.error(err_msg)
        return (False, err_msg)
    except Exception as e:
        err_msg = f"Failed to send email: {str(e)}"
        logger.error(err_msg)
        return (False, err_msg)
