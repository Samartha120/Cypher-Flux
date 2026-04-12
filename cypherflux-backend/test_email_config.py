#!/usr/bin/env python3
"""
Test script to verify email configuration and OTP delivery setup
Run this from the backend directory: python test_email_config.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_config():
    print("\n" + "="*70)
    print("CypherFlux Email Configuration Test")
    print("="*70 + "\n")
    
    # Check SMTP Configuration
    print("[1] SMTP Configuration:")
    print("-" * 70)
    smtp_host = os.environ.get('SMTP_HOST', 'NOT SET')
    smtp_port = os.environ.get('SMTP_PORT', 'NOT SET')
    smtp_username = os.environ.get('SMTP_USERNAME', 'NOT SET')
    smtp_password_set = "YES (hidden)" if os.environ.get('SMTP_PASSWORD') else "NOT SET"
    
    print(f"  ✓ SMTP_HOST: {smtp_host}")
    print(f"  ✓ SMTP_PORT: {smtp_port}")
    print(f"  ✓ SMTP_USERNAME: {smtp_username}")
    print(f"  ✓ SMTP_PASSWORD: {smtp_password_set}")
    
    if smtp_host == 'NOT SET' or smtp_username == 'NOT SET':
        print("\n  ⚠️  WARNING: Email credentials not fully configured!")
    else:
        print("\n  ✅ SMTP Configuration looks good!")
    
    # Check OTP Recipient Emails
    print("\n[2] OTP Recipient Configuration:")
    print("-" * 70)
    otp_recipients = os.environ.get('OTP_RECIPIENT_EMAILS', '')
    
    if otp_recipients.strip():
        recipient_list = [e.strip() for e in otp_recipients.split(',')]
        print(f"  ✓ OTP_RECIPIENT_EMAILS: {otp_recipients}")
        print(f"\n  Emails that will receive OTP codes:")
        for i, email in enumerate(recipient_list, 1):
            print(f"    {i}. {email}")
        print(f"\n  ✅ {len(recipient_list)} additional recipient(s) configured!")
    else:
        print("  ℹ️  OTP_RECIPIENT_EMAILS: NOT SET (Optional)")
        print("  → OTP will only be sent to user's registration email")
    
    # Simulate what the email service will do
    print("\n[3] Email Service Behavior Simulation:")
    print("-" * 70)
    
    user_email = "user@example.com"
    recipients = [user_email]
    
    if otp_recipients.strip():
        additional = [e.strip().lower() for e in otp_recipients.split(',') if e.strip()]
        recipients.extend(additional)
        recipients = list(dict.fromkeys(recipients))  # Remove duplicates
    
    print(f"  When user registers with: {user_email}")
    print(f"\n  OTP Code will be sent to:")
    for i, email in enumerate(recipients, 1):
        print(f"    {i}. {email}")
    
    if len(recipients) > 1:
        print(f"\n  ✅ Total recipients: {len(recipients)} (Primary + {len(recipients)-1} admin/backup)")
    else:
        print(f"\n  ℹ️  Total recipients: {len(recipients)} (Primary only)")
    
    # Summary
    print("\n" + "="*70)
    print("Configuration Summary:")
    print("="*70)
    if smtp_host != 'NOT SET' and smtp_username != 'NOT SET':
        if otp_recipients.strip():
            print("✅ Ready: OTP will be sent to user email + admin emails from .env")
        else:
            print("✅ Ready: OTP will be sent to user's registration email only")
    else:
        print("❌ Email not ready: SMTP credentials missing or incomplete")
    
    print("="*70 + "\n")

if __name__ == "__main__":
    test_config()
