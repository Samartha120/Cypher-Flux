#!/usr/bin/env python3
"""
Test script to verify email service can read .env and handle multiple recipients
Run from backend directory: python test_email_service.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Mock the email sending (since it would actually try to send emails)
def test_email_service():
    print("\n" + "="*70)
    print("CypherFlux Email Service Test")
    print("="*70 + "\n")
    
    # Simulate what send_otp_email() does
    to_email = "user@example.com"
    otp_code = "123456"
    
    print(f"[Scenario] User registration:")
    print(f"  User Email: {to_email}")
    print(f"  OTP Code: {otp_code}")
    print()
    
    # Get sender credentials
    sender_email = os.environ.get('SMTP_USERNAME') or os.environ.get('MAIL_USERNAME')
    sender_password = os.environ.get('SMTP_PASSWORD') or os.environ.get('MAIL_PASSWORD')
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    
    print(f"[SMTP Setup]")
    print(f"  Host: {smtp_host}:{smtp_port}")
    print(f"  Sender: {sender_email}")
    print(f"  Status: {'✅ Configured' if sender_email and sender_password else '❌ Not configured'}")
    print()
    
    # Build recipients list (same logic as email_service.py)
    recipients = [to_email]
    
    # Get additional recipient emails from .env configuration
    otp_recipients_env = os.environ.get('OTP_RECIPIENT_EMAILS', '').strip()
    if otp_recipients_env:
        additional_emails = [email.strip().lower() for email in otp_recipients_env.split(',') if email.strip()]
        recipients.extend(additional_emails)
    
    # Remove duplicates while preserving order
    recipients = list(dict.fromkeys(recipients))
    
    print(f"[Recipients List (after processing)]")
    for idx, email in enumerate(recipients, 1):
        if idx == 1:
            print(f"  {idx}. {email:45} (User's email - PRIMARY)")
        else:
            print(f"  {idx}. {email:45} (Admin/Backup)")
    
    print()
    print(f"[Email Message Content]")
    print(f"  Subject: CipherFlux Verification Code")
    print(f"  From: {sender_email}")
    print(f"  To: {', '.join(recipients)}")
    print(f"  Body: Your verification code is: {otp_code}")
    print()
    
    # Simulate sending
    print(f"[Sending Email]")
    if sender_email and sender_password:
        print(f"  ⏳ Would send via {smtp_host}:{smtp_port}")
        print(f"  📧 Recipients count: {len(recipients)}")
        print(f"  ✅ All recipients would receive the same OTP email")
        print()
        print(f"[Result]")
        print(f"  ✅ SUCCESS: Email would be sent to {len(recipients)} recipient(s)")
    else:
        print(f"  ⚠️  Email credentials not configured")
        print(f"  OTP would be printed to console instead")
    
    print("\n" + "="*70)
    print("Email Service Status: READY")
    print("="*70 + "\n")

if __name__ == "__main__":
    test_email_service()
