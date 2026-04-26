import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import re

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _otp_expiry_seconds() -> int:
    try:
        return int(os.environ.get('OTP_EXPIRY_SECONDS', '300'))
    except ValueError:
        return 300

def send_otp_email(to_email, otp_code):
    """
    Send OTP email to primary email and any additional emails configured in .env
    
    Args:
        to_email: Primary user email address
        otp_code: The 6-digit OTP code
    """
    # Prefer SMTP_* variables, fallback to MAIL_* for backwards compatibility.
    sender_email = os.environ.get('SMTP_USERNAME') or os.environ.get('MAIL_USERNAME')
    sender_password = os.environ.get('SMTP_PASSWORD') or os.environ.get('MAIL_PASSWORD')
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    expiry_seconds = _otp_expiry_seconds()

    if not sender_email or not sender_password:
        print("[WARNING] Email credentials not configured. OTP printed to console bypass:")
        print(f"[{to_email}] OTP: {otp_code}")
        return True

    msg = MIMEMultipart("alternative")
    msg['Subject'] = "CipherFlux Verification Code"
    msg['From'] = sender_email
    msg['To'] = to_email

    text = f"Your secure access code is: {otp_code}\nThis code will expire in {expiry_seconds // 60} minutes."

    html = f"""
    <html>
      <body style="background-color: #050a14; color: #00f0ff; font-family: Courier New, Courier, monospace; padding: 20px;">
        <h2 style="letter-spacing: 2px;">CipherFlux Identification Protocol</h2>
        <p>A new access request has been initiated.</p>
        <p style="font-size: 2em; border: 1px solid #00f0ff; display: inline-block; padding: 15px; color: #39ff14; letter-spacing: 5px;">{otp_code}</p>
        <p style="color: #ff003c;">This secure code will expire in {expiry_seconds // 60} minutes. Do not share it.</p>
      </body>
    </html>
    """

    msg.attach(MIMEText(text, 'plain'))
    msg.attach(MIMEText(html, 'html'))

    # Build recipients list: primary email + any additional emails from .env
    recipients = [to_email]
    
    # Get additional recipient emails from .env configuration
    otp_recipients_env = os.environ.get('OTP_RECIPIENT_EMAILS', '').strip()
    if otp_recipients_env:
        additional_emails = [
            email.strip().lower()
            for email in otp_recipients_env.split(',')
            if email.strip() and EMAIL_REGEX.match(email.strip())
        ]
        recipients.extend(additional_emails)
    
    # Remove duplicates while preserving order
    recipients = list(dict.fromkeys(recipients))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, recipients, msg.as_string())
        server.quit()
        recipient_list = ", ".join(recipients)
        print(f"[INFO] OTP email sent to {recipient_list} via {smtp_host}:{smtp_port}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"[ERROR] SMTP Authentication failed: {e}")
        return False
    except smtplib.SMTPException as e:
        print(f"[ERROR] SMTP error: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Failed to send email: {type(e).__name__}: {e}")
        return False


def send_breach_alert(to_email, alert_details):
    """
    Send an emergency breach alert email.
    """
    from datetime import datetime
    sender_email = os.environ.get('SMTP_USERNAME') or os.environ.get('MAIL_USERNAME')
    sender_password = os.environ.get('SMTP_PASSWORD') or os.environ.get('MAIL_PASSWORD')
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))

    if not sender_email or not sender_password:
        print(f"[WARNING] SMTP not configured. Breach Alert bypass: {alert_details}")
        return True

    msg = MIMEMultipart("alternative")
    msg['Subject'] = f"CRITICAL SECURITY BREACH: {alert_details.get('type', 'Unknown')}"
    msg['From'] = sender_email
    msg['To'] = to_email

    text = f"CRITICAL ALERT DETECTED\n\nIP: {alert_details.get('ip')}\nType: {alert_details.get('type')}\nSeverity: {alert_details.get('severity')}\nTime: {datetime.now().isoformat()}\n\nDetails: {alert_details.get('details')}"
    
    html = f"""
    <html>
      <body style="background-color: #050a14; color: #ff003c; font-family: Courier New, Courier, monospace; padding: 20px; border: 2px solid #ff003c;">
        <h1 style="text-transform: uppercase; letter-spacing: 5px; color: #ff003c;">Critical Breach Detected</h1>
        <div style="background: rgba(255, 0, 60, 0.1); padding: 15px; border-left: 5px solid #ff003c;">
            <p><strong>SOURCE IP:</strong> {alert_details.get('ip')}</p>
            <p><strong>THREAT TYPE:</strong> {alert_details.get('type')}</p>
            <p><strong>SEVERITY:</strong> {alert_details.get('severity', '').upper()}</p>
        </div>
        <p style="margin-top: 20px;"><strong>Forensic Details:</strong></p>
        <p style="color: #00f0ff;">{alert_details.get('details')}</p>
        <hr style="border: 0; border-top: 1px solid #ff003c; margin-top: 30px;">
        <p style="font-size: 0.8em; color: #555;">Automated alert from CypherFlux Perimeter Defense System.</p>
      </body>
    </html>
    """

    msg.attach(MIMEText(text, 'plain'))
    msg.attach(MIMEText(html, 'html'))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.quit()
        print(f"[INFO] Breach alert email sent to {to_email}")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send breach alert email: {e}")
        return False

