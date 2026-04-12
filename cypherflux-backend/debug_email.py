#!/usr/bin/env python3
"""
Quick test to isolate the email service issue
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Test the email service logic without actually sending
def test_send_otp_logic():
    print("Testing email service logic...")
    
    to_email = "user@example.com"
    
    # Build recipients list (same logic as email_service.py)
    recipients = [to_email]
    
    # Get additional recipient emails from .env configuration
    otp_recipients_env = os.environ.get('OTP_RECIPIENT_EMAILS', '').strip()
    if otp_recipients_env:
        additional_emails = [email.strip().lower() for email in otp_recipients_env.split(',') if email.strip()]
        recipients.extend(additional_emails)
    
    # Remove duplicates while preserving order
    recipients = list(dict.fromkeys(recipients))
    
    print(f"Recipients list: {recipients}")
    print(f"Recipients type: {type(recipients)}")
    print(f"Recipients list types: {[type(r) for r in recipients]}")
    
    # Test sendmail parameter format
    sender_email = "test@example.com"
    try:
        # Simulate what smtp.sendmail expects
        if isinstance(recipients, list):
            print("✅ Recipients is a list (correct)")
        
        all_strings = all(isinstance(r, str) for r in recipients)
        if all_strings:
            print("✅ All recipients are strings (correct)")
        else:
            print("❌ Some recipients are not strings!")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    print("✅ Logic test passed!")
    return True

if __name__ == "__main__":
    test_send_otp_logic()
