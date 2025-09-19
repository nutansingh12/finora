import nodemailer from 'nodemailer';
import { config } from '@/config';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: {
        user: config.email.smtp.user,
        pass: config.email.smtp.pass
      }
    });
  }

  // Send email verification
  async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: `${config.email.from.name} <${config.email.from.email}>`,
      to: email,
      subject: 'Verify Your Finora Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Welcome to Finora, ${firstName}!</h2>
          <p>Thank you for creating your Finora account. To get started, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          
          <p>This verification link will expire in 24 hours.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            If you didn't create a Finora account, you can safely ignore this email.
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: `${config.email.from.name} <${config.email.from.email}>`,
      to: email,
      subject: 'Reset Your Finora Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Password Reset Request</h2>
          <p>Hi ${firstName},</p>
          <p>We received a request to reset your Finora account password. Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          
          <p>This password reset link will expire in 1 hour.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  // Send price alert email
  async sendPriceAlertEmail(
    email: string, 
    firstName: string, 
    stockSymbol: string, 
    stockName: string,
    currentPrice: number,
    targetPrice: number,
    alertType: string
  ): Promise<void> {
    const subject = `🚨 Price Alert: ${stockSymbol} ${alertType === 'below' ? 'Below' : 'Above'} Target`;
    
    const mailOptions = {
      from: `${config.email.from.name} <${config.email.from.email}>`,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${alertType === 'below' ? '#EF4444' : '#10B981'};">Price Alert Triggered</h2>
          <p>Hi ${firstName},</p>
          <p>Your price alert for <strong>${stockName} (${stockSymbol})</strong> has been triggered!</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">Alert Details</h3>
            <p style="margin: 5px 0;"><strong>Stock:</strong> ${stockName} (${stockSymbol})</p>
            <p style="margin: 5px 0;"><strong>Current Price:</strong> $${currentPrice.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Target Price:</strong> $${targetPrice.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Alert Type:</strong> Price ${alertType} target</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/portfolio" 
               style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Portfolio
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            You can manage your alerts in your Finora dashboard. To stop receiving these notifications, update your alert preferences.
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  // Send welcome email
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const mailOptions = {
      from: `${config.email.from.name} <${config.email.from.email}>`,
      to: email,
      subject: 'Welcome to Finora - Your Smart Stock Tracking Journey Begins!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Welcome to Finora, ${firstName}! 🎉</h2>
          <p>Congratulations on joining thousands of smart investors who use Finora to track their portfolios and discover value opportunities!</p>
          
          <h3 style="color: #333;">What you can do with Finora:</h3>
          <ul style="line-height: 1.6;">
            <li>📊 Track stocks with intelligent value-based sorting</li>
            <li>🎯 Set target prices and cutoff alerts</li>
            <li>📈 Analyze 52-week, 24-week, and 12-week rolling lows</li>
            <li>🔔 Get real-time price alerts</li>
            <li>📱 Access from any device - mobile, tablet, or desktop</li>
            <li>📋 Import/export your portfolio via CSV</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/portfolio" 
               style="background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Start Building Your Portfolio
            </a>
          </div>
          
          <p>Need help getting started? Check out our <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/help" style="color: #3B82F6;">quick start guide</a> or reply to this email with any questions.</p>
          
          <p>Happy investing!</p>
          <p>The Finora Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Follow us on social media for market insights and product updates.
          </p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  // Test email configuration
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}
