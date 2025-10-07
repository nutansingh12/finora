import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { config } from '../config';
import { validateEmail, validatePassword } from '../utils/validation';
import { AlphaVantageRegistrationService } from '../services/AlphaVantageRegistrationService';
import { UserApiKey } from '../models/UserApiKey';
import { EmailService } from '../services/EmailService';
import { Session } from '../models/Session';

// Import the shared AuthenticatedRequest interface
import { AuthenticatedRequest } from '../types/express';

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, organization, userType, jobTitle, country, intendedUsage } = req.body;

      // Validate input
      if (!validateEmail(email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
        return;
      }

      if (!validatePassword(password)) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
        });
        return;
      }

      if (!firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: 'First name and last name are required'
        });
        return;
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
        return;
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await User.createUser({
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName
      });

      // Generate tokens
      const tokens = AuthController.generateTokens(user.id);

      // Auto-send email verification
      try {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        await User.setEmailVerificationToken(user.id, verificationToken);
        const emailSvc = new EmailService();
        await emailSvc.sendVerificationEmail(email, firstName, verificationToken);
      } catch (e) {
        console.warn('Email verification send failed (continuing):', e);
      }

      // Automatically request Alpha Vantage API key for new user
      let apiKeyStatus = null;

      // Skip API key registration for specific emails that already have keys
      const shouldSkipApiKey = config.alphaVantage.skipEmails.includes(email.toLowerCase());

      if (config.alphaVantage.autoRegister && !shouldSkipApiKey) {
        try {
          console.log(`🔑 Auto-registering Alpha Vantage API key for user: ${user.email}`);
          const registrationService = new AlphaVantageRegistrationService();

          // Create enhanced user object with Alpha Vantage registration data
          const userWithAlphaVantageData = {
            ...user,
            organization: organization || 'Individual Investor',
            userType: userType || 'Investor',
            jobTitle,
            country,
            intendedUsage,
          };

          const apiKeyResult = await registrationService.requestApiKeyForUser(userWithAlphaVantageData);

          if (apiKeyResult.success && apiKeyResult.apiKey) {
            // Store the API key in database
            await UserApiKey.createForUser(
              user.id,
              'alpha_vantage',
              apiKeyResult.apiKey,
              {
                keyName: `auto_registered_${Date.now()}`,
                requestLimit: 500,
                dailyRequestLimit: 500,
                registrationId: apiKeyResult.registrationId,
                metadata: {
                  autoRegistered: true,
                  registrationDate: new Date().toISOString(),
                  jobTitle,
                  country,
                  intendedUsage,
                }
              }
            );

            apiKeyStatus = {
              success: true,
              message: 'Alpha Vantage API key automatically registered',
              provider: 'alpha_vantage'
            };

            console.log(`✅ Alpha Vantage API key registered for user: ${user.email}`);
          } else {
            apiKeyStatus = {
              success: false,
              message: apiKeyResult.message,
              provider: 'alpha_vantage'
            };
            console.warn(`⚠️ Failed to register API key for user: ${user.email} - ${apiKeyResult.message}`);
          }
        } catch (error) {
          console.error('Error during API key registration:', error);
          apiKeyStatus = {
            success: false,
            message: 'Failed to register API key due to internal error',
            provider: 'alpha_vantage'
          };
        }
      } else if (shouldSkipApiKey) {
        console.log(`⏭️ Skipping API key registration for user: ${user.email} (already has Alpha Vantage key)`);
        apiKeyStatus = {
          success: true,
          message: 'API key registration skipped - user already has Alpha Vantage key',
          provider: 'alpha_vantage',
          skipped: true
        };
      }

      // Create initial session for refresh token
      try {
        const refreshTtlDays = 30;
        const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);
        await Session.createSession({
          user_id: user.id,
          refresh_token: tokens.refreshToken,
          device_type: (req.body?.deviceType || 'unknown'),
          device_name: (req.body?.deviceName || ''),
          user_agent: (req.headers['user-agent'] as string) || '',
          ip_address: req.ip || '',
          location: (req.body?.location || ''),
          expires_at: expiresAt
        });
      } catch (e) {
        console.warn('Failed to create session on register (continuing):', e);
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            isVerified: user.email_verified
          },
          tokens,
          apiKeyRegistration: apiKeyStatus
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      // In debug mode, surface the error to help diagnose production issues quickly
      const debug = req.headers['x-debug'] === '1' || process.env.NODE_ENV !== 'production';
      const payload: any = {
        success: false,
        message: 'Internal server error'
      };
      if (debug) {
        payload.error = (error as any)?.message || String(error);
      }
      res.status(500).json(payload);
    }
  }

  // Login user
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
        return;
      }

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      // Update last login
      await User.updateLastLogin(user.id, req.ip || 'unknown');

      // Generate tokens
      const tokens = AuthController.generateTokens(user.id);

      // Create session for refresh token
      try {
        const refreshTtlDays = 30; // align with config.jwt.refreshExpiresIn default '30d'
        const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);
        await Session.createSession({
          user_id: user.id,
          refresh_token: tokens.refreshToken,
          device_type: (req.body?.deviceType || 'unknown'),
          device_name: (req.body?.deviceName || ''),
          user_agent: (req.headers['user-agent'] as string) || '',
          ip_address: req.ip || '',
          location: (req.body?.location || ''),
          expires_at: expiresAt
        });
      } catch (e) {
        console.warn('Failed to create session (continuing):', e);
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            isVerified: user.email_verified
          },
          tokens
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
        return;
      }

      // Verify refresh token JWT
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as any;

      // Validate session record and expiry
      const session = await Session.findByRefreshToken(refreshToken);
      if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        return;
      }

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid refresh token' });
        return;
      }

      // Update session last used
      await Session.updateLastUsed(session.id, (req.ip || undefined) as any);

      // Generate new tokens (keep same session)
      const tokens = AuthController.generateTokens(user.id);

      res.json({ success: true, message: 'Token refreshed successfully', data: tokens });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  // Logout user (optional: revoke provided refresh token session)
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = (req.body || {}) as { refreshToken?: string };
      if (refreshToken) {
        const session = await Session.findByRefreshToken(refreshToken);
        if (session && req.user?.id && session.user_id === req.user.id) {
          await Session.deactivateSession(session.id);
        }
      }
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }


  // List current user's sessions
  static async listSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const sessions = await Session.getUserSessions(req.user.id, false);
      res.json({ success: true, data: { sessions } });
    } catch (error) {
      console.error('List sessions error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Revoke a session by id
  static async revokeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { id } = req.params as { id: string };
      if (!id) {
        res.status(400).json({ success: false, message: 'Session id is required' });
        return;
      }

      // Ensure the session belongs to the user
      const session = await Session.findOne<{ id: string; user_id: string }>({ id });
      if (!session || session.user_id !== req.user.id) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
      }

      await Session.deactivateSession(id);
      res.json({ success: true, message: 'Session revoked' });
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get current user
  static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            isVerified: user.email_verified,
            createdAt: user.created_at
          }
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Generate JWT tokens
  private static generateTokens(userId: string) {
    const secret = config.jwt.secret;

    const accessToken = (jwt.sign as any)(
      { userId, type: 'access' },
      secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = (jwt.sign as any)(
      { userId, type: 'refresh' },
      secret,
      { expiresIn: config.jwt.refreshExpiresIn }

    );

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn
    };
  }

  // Send password reset link
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!validateEmail(email)) {
        res.status(400).json({ success: false, message: 'Invalid email' });
        return;
      }

      // Always respond success to avoid email enumeration
      const user = await User.findByEmail(email);
      if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
        await User.setPasswordResetToken(email, token, expiresAt);
        const emailSvc = new EmailService();
        await emailSvc.sendPasswordResetEmail(email, token);
      }

      res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Reset password with token
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;
      if (!token || !validatePassword(password)) {
        res.status(400).json({ success: false, message: 'Invalid token or password' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const updated = await User.resetPassword(token, passwordHash);
      if (!updated) {
        res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        return;
      }
      res.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Change password for authenticated user
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { currentPassword, newPassword } = req.body;
      if (!validatePassword(newPassword)) {
        res.status(400).json({ success: false, message: 'New password does not meet requirements' });
        return;
      }
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      const ok = await bcrypt.compare(currentPassword, user.password_hash);
      if (!ok) {
        res.status(400).json({ success: false, message: 'Current password is incorrect' });
        return;
      }
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await User.updateById(userId, { password_hash: passwordHash });
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Verify email using token
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ success: false, message: 'Verification token is required' });
        return;
      }
      const updated = await User.verifyEmail(token);
      if (!updated) {
        res.status(400).json({ success: false, message: 'Invalid verification token' });
        return;
      }
      res.json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Resend verification email
  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!validateEmail(email)) {
        res.status(400).json({ success: false, message: 'Invalid email' });
        return;
      }
      const user = await User.findByEmail(email);
      // Always respond success to avoid enumeration
      if (user && !user.email_verified) {
        const token = crypto.randomBytes(32).toString('hex');
        await User.setEmailVerificationToken(user.id, token);
        const emailSvc = new EmailService();
        await emailSvc.sendVerificationEmail(email, user.first_name, token);
      }
      res.json({ success: true, message: 'If the email exists, a verification link has been sent' });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }


}
