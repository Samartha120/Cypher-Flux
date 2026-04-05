import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

def send_otp_email(to_email, otp_code):
    # Prefer SMTP_* variables, fallback to MAIL_* for backwards compatibility.
    sender_email = os.environ.get('SMTP_USERNAME') or os.environ.get('MAIL_USERNAME')
    sender_password = os.environ.get('SMTP_PASSWORD') or os.environ.get('MAIL_PASSWORD')
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))

    if not sender_email or not sender_password:
        print("[WARNING] Email credentials not configured. OTP printed to console bypass:")
        print(f"[{to_email}] OTP: {otp_code}")
        return True

    msg = MIMEMultipart("alternative")
    msg['Subject'] = "CipherFlux Verification Code"
    msg['From'] = sender_email
    msg['To'] = to_email

    text = f"Your secure access code is: {otp_code}\nThis code will expire in 5 minutes."

    html = f"""
    <html>
      <body style="background-color: #050a14; color: #00f0ff; font-family: Courier New, Courier, monospace; padding: 20px;">
        <h2 style="letter-spacing: 2px;">CipherFlux Identification Protocol</h2>
        <p>A new access request has been initiated.</p>
        <p style="font-size: 2em; border: 1px solid #00f0ff; display: inline-block; padding: 15px; color: #39ff14; letter-spacing: 5px;">{otp_code}</p>
        <p style="color: #ff003c;">This secure code will expire in exactly 5 minutes. Do not share it.</p>
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
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send email: {e}")
        return False
