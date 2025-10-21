import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if email configuration is available
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email configuration not found. Email sending will be disabled.');
      console.warn('To enable email sending, please set the following environment variables:');
      console.warn('- EMAIL_HOST (e.g., smtp.gmail.com)');
      console.warn('- EMAIL_PORT (e.g., 587)');
      console.warn('- EMAIL_USER (your email address)');
      console.warn('- EMAIL_PASSWORD (your email password or app-specific password)');
      console.warn('- EMAIL_FROM (sender email address)');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      // Verify connection configuration
      this.transporter.verify((error) => {
        if (error) {
          console.error('❌ Email service configuration error:', error);
          this.isConfigured = false;
        } else {
          console.log('✅ Email service is ready to send emails');
          this.isConfigured = true;
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('⚠️ Email service not configured. Skipping email send.');
      console.log('Would have sent email:', {
        to: options.to,
        subject: options.subject,
        preview: options.text?.substring(0, 100) || options.html.substring(0, 100),
      });
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            h1 {
              color: #1f2937;
              font-size: 24px;
              margin-bottom: 20px;
            }
            p {
              color: #4b5563;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              background-color: #2563eb;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #1d4ed8;
            }
            .link {
              color: #2563eb;
              word-break: break-all;
              font-size: 14px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
            .warning {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 6px;
              padding: 12px;
              margin: 20px 0;
              color: #92400e;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Accounting Platform</div>
            </div>

            <h1>Reset Your Password</h1>

            <p>Hello,</p>

            <p>We received a request to reset your password for your Accounting Platform account. Click the button below to create a new password:</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p class="link">${resetUrl}</p>

            <div class="warning">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.
            </div>

            <div class="footer">
              <p>This email was sent from Accounting Platform</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Reset Your Password

Hello,

We received a request to reset your password for your Accounting Platform account.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.

Best regards,
Accounting Platform Team
    `.trim();

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Accounting Platform',
      html,
      text,
    });
  }

  async sendInvitationEmail(
    email: string,
    companyName: string,
    invitationUrl: string,
    expiresInMinutes: number
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Invited to Join ${companyName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            h1 {
              color: #1f2937;
              font-size: 24px;
              margin-bottom: 20px;
            }
            p {
              color: #4b5563;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              background-color: #10b981;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #059669;
            }
            .link {
              color: #2563eb;
              word-break: break-all;
              font-size: 14px;
            }
            .company-badge {
              background-color: #f3f4f6;
              border-left: 4px solid #2563eb;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .company-badge strong {
              color: #1f2937;
              font-size: 18px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
            .warning {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 6px;
              padding: 12px;
              margin: 20px 0;
              color: #92400e;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Accounting Platform</div>
            </div>

            <h1>You're Invited!</h1>

            <p>Hello,</p>

            <p>You've been invited to join:</p>

            <div class="company-badge">
              <strong>${companyName}</strong>
            </div>

            <p>Click the button below to accept the invitation and set up your account:</p>

            <div style="text-align: center;">
              <a href="${invitationUrl}" class="button">Accept Invitation</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p class="link">${invitationUrl}</p>

            <div class="warning">
              <strong>Important:</strong> This invitation link will expire in ${expiresInMinutes} minutes for security reasons. If you didn't expect this invitation, you can safely ignore this email.
            </div>

            <div class="footer">
              <p>This invitation was sent via Accounting Platform</p>
              <p>If you have any questions, please contact the company administrator.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
You're Invited to Join ${companyName}!

Hello,

You've been invited to join ${companyName} on the Accounting Platform.

Click the link below to accept the invitation and set up your account:
${invitationUrl}

This invitation link will expire in ${expiresInMinutes} minutes for security reasons.

If you didn't expect this invitation, you can safely ignore this email.

Best regards,
Accounting Platform Team
    `.trim();

    return this.sendEmail({
      to: email,
      subject: `You're Invited to Join ${companyName} - Accounting Platform`,
      html,
      text,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Accounting Platform</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            h1 {
              color: #1f2937;
              font-size: 24px;
              margin-bottom: 20px;
            }
            p {
              color: #4b5563;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              background-color: #2563eb;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              margin: 20px 0;
            }
            .features {
              background-color: #f9fafb;
              border-radius: 6px;
              padding: 20px;
              margin: 20px 0;
            }
            .features ul {
              margin: 0;
              padding-left: 20px;
              color: #4b5563;
            }
            .features li {
              margin-bottom: 10px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Accounting Platform</div>
            </div>

            <h1>Welcome to Accounting Platform, ${firstName}!</h1>

            <p>Thank you for creating an account with us. We're excited to have you on board!</p>

            <div class="features">
              <p><strong>With Accounting Platform, you can:</strong></p>
              <ul>
                <li>Manage your financial transactions efficiently</li>
                <li>Generate detailed financial reports</li>
                <li>Track expenses and income in real-time</li>
                <li>Collaborate with your team securely</li>
                <li>Access your data from anywhere</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">Get Started</a>
            </div>

            <p>If you have any questions or need assistance, our support team is here to help!</p>

            <div class="footer">
              <p>Welcome aboard!</p>
              <p>The Accounting Platform Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to Accounting Platform, ${firstName}!

Thank you for creating an account with us. We're excited to have you on board!

With Accounting Platform, you can:
- Manage your financial transactions efficiently
- Generate detailed financial reports
- Track expenses and income in real-time
- Collaborate with your team securely
- Access your data from anywhere

Get started: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login

If you have any questions or need assistance, our support team is here to help!

Welcome aboard!
The Accounting Platform Team
    `.trim();

    return this.sendEmail({
      to: email,
      subject: `Welcome to Accounting Platform, ${firstName}!`,
      html,
      text,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();