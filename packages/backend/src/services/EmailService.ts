import nodemailer from 'nodemailer';
import { config } from '../config';

export class EmailService {
  private transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: !!config.email.secure,
    auth: config.email.user
      ? { user: config.email.user, pass: config.email.pass }
      : undefined,
  });

  async sendAlertEmail(to: string, symbol: string, message: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject: `[Finora] Alert for ${symbol}`,
        text: message,
      });
      return true;
    } catch (err) {
      console.error('[EmailService] Failed to send alert email', err);
      return false;
    }
  }

  async sendVerificationEmail(email: string, firstName: string, token: string): Promise<boolean> {
    try {
      const frontendBase = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://finora.app' : 'http://localhost:3000');
      const verificationUrl = `${frontendBase}/verify-email?token=${token}`;
      await this.transporter.sendMail({
        from: config.email.from,
        to: email,
        subject: 'Verify Your Finora Account',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#3B82F6;">Welcome to Finora${firstName ? ', ' + firstName : ''}!</h2>
          <p>Click the button below to verify your email address:</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${verificationUrl}" style="background:#3B82F6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Verify Email</a>
          </div>
          <p>If the button doesn't work, copy and paste this link:</p>
          <p style="word-break:break-all;color:#555;">${verificationUrl}</p>
        </div>`
      });
      return true;
    } catch (err) {
      console.error('[EmailService] Failed to send verification email', err);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    try {
      const frontendBase = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://finora.app' : 'http://localhost:3000');
      const resetUrl = `${frontendBase}/reset-password?token=${token}`;
      await this.transporter.sendMail({
        from: config.email.from,
        to: email,
        subject: 'Reset Your Finora Password',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#3B82F6;">Reset your password</h2>
          <p>Click the button below to set a new password. This link expires in 1 hour.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${resetUrl}" style="background:#3B82F6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Reset Password</a>
          </div>
          <p>If the button doesn't work, copy and paste this link:</p>
          <p style="word-break:break-all;color:#555;">${resetUrl}</p>
        </div>`
      });
      return true;
    } catch (err) {
      console.error('[EmailService] Failed to send password reset email', err);
      return false;
    }
  }
}

