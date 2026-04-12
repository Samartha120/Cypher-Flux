# CypherFlux - Email OTP Configuration Guide

## Overview
When users register in CypherFlux, they receive an OTP (One Time Password) verification code via email. Starting with this update, you can configure additional email addresses to automatically receive copies of all OTP emails.

## Configuration

### Setting Up Additional OTP Recipients

Add this line to your `.env` file in the `cypherflux-backend/` directory:

```env
OTP_RECIPIENT_EMAILS=admin@example.com,support@example.com,backup@example.com
```

**Format:**
- Comma-separated list of email addresses
- No spaces after commas (will be trimmed automatically)
- All emails will receive the same OTP code

### Examples

#### Example 1: Admin Only
```env
OTP_RECIPIENT_EMAILS=admin@example.com
```
When user registers: `john@example.com`
- john@example.com receives OTP ✅
- admin@example.com receives OTP ✅

#### Example 2: Admin + Support Team
```env
OTP_RECIPIENT_EMAILS=admin@example.com,support@email.com
```
When user registers: `john@example.com`
- john@example.com receives OTP ✅
- admin@example.com receives OTP ✅
- support@email.com receives OTP ✅

#### Example 3: Multiple Team Members
```env
OTP_RECIPIENT_EMAILS=admin@example.com,ops@example.com,security@example.com,monitoring@example.com
```

#### Example 4: No Additional Recipients (Default)
```env
# OTP_RECIPIENT_EMAILS not set or commented out
```
When user registers: `john@example.com`
- john@example.com receives OTP ✅
- No additional recipients


## How It Works

### User Registration Flow
1. User fills signup form: Username, Email, Password
2. User submits form
3. Backend creates user account
4. Backend generates random 6-digit OTP code
5. **Email Service sends OTP to:**
   - User's registration email (PRIMARY)
   - All emails in `OTP_RECIPIENT_EMAILS` (SECONDARY)
6. All recipients receive the same email with the same OTP code
7. User proceeds to verification page with 30-second countdown

### Email Sending
- **Single email** sent with multiple recipients (BCC style)
- All recipients see the same OTP verification code
- OTP expires after 30 seconds
- Invalid attempts are rate-limited (5 attempts → 15-minute lockout)

## Important Notes

### Duplicate Prevention
- If a user's email matches an admin email, it will only receive one copy
- System automatically removes duplicates from recipient list
- Example: If user@example.com = admin@example.com, only 1 email sent

### Email Format Validation
- All emails are normalized to lowercase
- Invalid email formats are rejected at signup
- Invalid admin emails in OTP_RECIPIENT_EMAILS are skipped

### SMTP Credentials Required
The email service requires these environment variables to be set:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

Without these, OTP codes are printed to console instead:
```
[WARNING] Email credentials not configured. OTP printed to console bypass:
[user@example.com] OTP: 123456
[admin@example.com] OTP: 123456
```

## Testing Your Configuration

### Test 1: Check Configuration
Run from `cypherflux-backend/`:
```bash
python test_email_config.py
```

Output shows:
- ✅ SMTP configuration status
- ✅ OTP_RECIPIENT_EMAILS value
- ✅ Emails that will receive OTP

### Test 2: Verify Email Logic
```bash
python test_email_service.py
```

Output shows:
- ✅ Full recipient list
- ✅ Email message content
- ✅ Total recipients count

### Test 3: Real Signup Test
1. Go to signup page
2. Register with test account
3. Check all configured emails for OTP code
4. All should receive the same 6-digit code

## Troubleshooting

### "OTP printed to console" message
**Issue:** Emails not being sent
**Solution:** Check SMTP credentials in `.env`
```env
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### Admin email not receiving OTP
**Issue:** Config not being read
**Solution:** 
1. Restart your Flask backend
2. Verify `.env` file syntax (comma-separated, no extra spaces)
3. Run `test_email_config.py` to confirm

### One recipient missing OTP
**Issue:** Duplicate email (user email = admin email)
**Solution:** Use different admin email addresses

### Email syntax errors
**Issue:** Invalid emails in OTP_RECIPIENT_EMAILS
**Solution:** Verify all emails have valid format: `name@domain.com`

## Use Cases

### Use Case 1: Monitoring
Track all new user registrations
```env
OTP_RECIPIENT_EMAILS=monitoring@company.com
```

### Use Case 2: Support Team
Support team needs audit trail
```env
OTP_RECIPIENT_EMAILS=support@company.com,audit@company.com
```

### Use Case 3: Security Team
Security team monitors auth activities
```env
OTP_RECIPIENT_EMAILS=security@company.com
```

### Use Case 4: Admin + Backup
Primary admin + backup if primary unavailable
```env
OTP_RECIPIENT_EMAILS=primary@company.com,backup@company.com
```

## Files Modified

- `cypherflux-backend/.env` - Added `OTP_RECIPIENT_EMAILS` variable
- `cypherflux-backend/.env.example` - Documentation example
- `app/services/email/email_service.py` - Reads .env for additional recipients
- Other implementations: Backward compatible (no breaking changes)

## FAQ

**Q: Can I change this without restarting?**
A: No. Flask loads environment variables at startup. Restart backend after changing `.env`

**Q: What if OTP_RECIPIENT_EMAILS has spaces?**
A: Automatically trimmed. `email1@example.com , email2@example.com` works fine

**Q: What if an admin email is invalid?**
A: Invalid emails in the list are skipped with a warning

**Q: Does this affect the database?**
A: No. User model unchanged. Configuration only affects email sending behavior

**Q: Can I disable this feature?**
A: Yes. Just comment out or remove `OTP_RECIPIENT_EMAILS` line from `.env`

---

**Last Updated:** April 12, 2026
**Version:** Email OTP v2.0
