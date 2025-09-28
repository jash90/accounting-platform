# Email Configuration Guide

## Overview

The Accounting Platform uses Nodemailer for sending transactional emails such as:
- Password reset emails
- Welcome emails for new users
- Email verification (future feature)

## Configuration

Email sending is optional. If not configured, the application will:
- Log email content to the console (in development)
- Continue functioning normally without sending actual emails

### Environment Variables

Add these variables to your `.env` file:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM="Accounting Platform <your-email@gmail.com>"

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173
```

## Email Provider Setup

### Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" as the app
   - Generate a 16-character password
   - Use this password for `EMAIL_PASSWORD`

3. **Configure `.env`**:
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM="Your Name <your-gmail@gmail.com>"
```

### SendGrid Setup (Recommended for Production)

1. **Create a SendGrid account** at [sendgrid.com](https://sendgrid.com)
2. **Generate an API key** in Settings → API Keys
3. **Configure `.env`**:
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
EMAIL_FROM="noreply@yourdomain.com"
```

### Other Providers

#### Outlook/Hotmail
```bash
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

#### Mailgun
```bash
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=postmaster@your-mailgun-domain
EMAIL_PASSWORD=your-mailgun-password
```

#### Mailtrap (Testing Only)
```bash
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_SECURE=false
EMAIL_USER=your-mailtrap-username
EMAIL_PASSWORD=your-mailtrap-password
```

## Testing Email Configuration

1. **Start the backend server**:
```bash
npm run dev:backend
```

2. **Check server logs** for email configuration status:
   - ✅ "Email service is ready to send emails" - Configuration successful
   - ⚠️ "Email configuration not found" - Email variables not set
   - ❌ "Email service configuration error" - Invalid credentials or settings

3. **Test password reset**:
```bash
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

4. **Check console output**:
   - If email is configured: Email will be sent
   - If not configured: Email content will be logged to console

## Email Templates

The application includes professional HTML email templates for:

### Password Reset Email
- Subject: "Reset Your Password - Accounting Platform"
- Contains a secure reset link valid for 1 hour
- Mobile-responsive design
- Clear call-to-action button

### Welcome Email
- Subject: "Welcome to Accounting Platform, [Name]!"
- Sent after successful registration
- Lists platform features
- Includes getting started link

## Troubleshooting

### Common Issues

1. **"Email service configuration error"**
   - Check your email credentials
   - Ensure app-specific password is used for Gmail
   - Verify network connectivity

2. **"Email configuration not found"**
   - Ensure `.env` file exists and is loaded
   - Check environment variable names are correct
   - Restart the server after adding variables

3. **Gmail: "Less secure app access" error**
   - Use an app-specific password instead
   - Enable 2FA on your Google account

4. **Port Connection Issues**
   - Port 587: TLS (recommended)
   - Port 465: SSL
   - Port 25: Unencrypted (not recommended)

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use app-specific passwords** instead of account passwords
3. **Use environment-specific email settings** (dev/staging/prod)
4. **Implement rate limiting** for password reset requests
5. **Use verified sender addresses** to avoid spam filters
6. **Monitor bounce rates** and delivery status

## Development Without Email

The application works perfectly without email configuration:

1. Password reset tokens are logged to console
2. Reset links are displayed in server logs
3. All email content is shown in development logs
4. No functionality is blocked

This allows developers to work on the application without setting up email services.