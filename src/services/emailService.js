import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.etherealTransporter = null;
  }

  /**
   * Initialize or retrieve the Nodemailer transporter instance.
   */
  async getTransporter() {
    // If SMTP credentials provided in .env, use real SMTP (Gmail, etc.)
    if (env.SMTP_USER && env.SMTP_PASS) {
      if (!this.transporter) {
        const isGmail = (env.SMTP_HOST || '').toLowerCase().includes('gmail');
        const transportConfig = isGmail
          ? {
              service: 'gmail',
              auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              },
            }
          : {
              host: env.SMTP_HOST,
              port: env.SMTP_PORT,
              secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
              auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              },
            };

        this.transporter = nodemailer.createTransport(transportConfig);
      }
      return { transporter: this.transporter, isEthereal: false };
    }

    // Fallback: Automatic test inbox (Ethereal) in development
    if (!this.etherealTransporter) {
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.etherealTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } catch (err) {
        logger.warn(`[EMAIL SERVICE] Failed to create test account: ${err.message}`);
        return { transporter: null, isEthereal: false };
      }
    }
    return { transporter: this.etherealTransporter, isEthereal: true };
  }

  /**
   * Send a password reset email with formatted HTML and plain text alternatives.
   */
  async sendPasswordResetEmail({ to, name = 'User', resetToken }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/admin/reset-password?token=${encodeURIComponent(resetToken)}`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 28px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 700;">Reset Your Password</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 6px;">JAA Management Portal</p>
        </div>
        
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          We received a request to reset the password for your account (<strong>${to}</strong>). Click the button below to set a new password:
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" target="_blank" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
            Reset Password
          </a>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
          ⏱️ This link is secure and will expire in <strong>1 hour</strong>.
        </p>
        
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
          If you didn't request a password reset, you can safely ignore this email. Your account remains secure.
        </p>
      </div>
    `;

    const textContent = `
Hello ${name},

You requested to reset your password for your account (${to}).

Click the link below to set a new password:
${resetUrl}

This link will expire in 1 hour.
If you did not request this, please ignore this email.
    `.trim();

    try {
      const { transporter, isEthereal } = await this.getTransporter();
      if (!transporter) {
        logger.warn(`[EMAIL SERVICE] No transporter available to send email to ${to}`);
        return { sent: false };
      }

      const fromAddress = env.SMTP_FROM || (isEthereal ? '"JAA Portal" <no-reply@jaa.com>' : `"JAA Portal" <${env.SMTP_USER}>`);

      const mailOptions = {
        from: fromAddress,
        to,
        subject: 'Password Reset Request - JAA Portal',
        text: textContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);

      if (isEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        logger.info(`[EMAIL SERVICE] Email dispatched via test inbox. Preview: ${previewUrl}`);
        console.log(`\n======================================================`);
        console.log(`✉️ [EMAIL SENT - PREVIEW AVAILABLE]`);
        console.log(`To: ${to}`);
        console.log(`🔗 Preview Email in Browser: ${previewUrl}`);
        console.log(`⚠️ To send directly to your real Gmail inbox, set:`);
        console.log(`   SMTP_USER=your_email@gmail.com`);
        console.log(`   SMTP_PASS=your_gmail_app_password`);
        console.log(`   in your .env file.`);
        console.log(`======================================================\n`);
      } else {
        logger.info(`[EMAIL SERVICE] Password reset email sent to ${to}. MessageId: ${info.messageId}`);
        console.log(`\n======================================================`);
        console.log(`✅ [EMAIL SENT TO REAL INBOX] To: ${to}`);
        console.log(`MessageId: ${info.messageId}`);
        console.log(`======================================================\n`);
      }

      return {
        sent: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error(`[EMAIL SERVICE] Failed to send email to ${to}: ${error.message}`);
      console.log(`\n======================================================`);
      console.log(`❌ [EMAIL SEND ERROR] Could not deliver to ${to}`);
      console.log(`Error: ${error.message}`);
      if (error.code === 'EAUTH' || (error.message && error.message.includes('Username and Password not accepted'))) {
        console.log(`💡 FIX: Gmail requires a 16-character Google App Password.`);
        console.log(`   Generate one at: https://myaccount.google.com/apppasswords`);
        console.log(`   Then paste into SMTP_PASS in your .env file.`);
      }
      console.log(`======================================================\n`);
      return {
        sent: false,
        error: error.message,
      };
    }
  }
}

export const emailService = new EmailService();
