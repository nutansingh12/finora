import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '@/config';
import { User, UserModel } from '@/models/User';
import { Session } from '@/models/Session';
import { CustomError } from '@/middleware/errorHandler';
import { EmailService } from './EmailService';

export interface LoginResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    preferences: any;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export class AuthService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Register new user
  async register(userData: RegisterData, deviceInfo?: any): Promise<LoginResult> {
    const { email, password, firstName, lastName } = userData;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new CustomError('User with this email already exists', 409);
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

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await User.setEmailVerificationToken(user.id, verificationToken);

    // Send verification email
    await this.emailService.sendVerificationEmail(email, firstName, verificationToken);

    // Generate tokens and create session
    const tokens = await this.generateTokens(user.id, deviceInfo);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        preferences: user.preferences
      },
      tokens
    };
  }

  // Login user
  async login(email: string, password: string, deviceInfo?: any): Promise<LoginResult> {
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      throw new CustomError('Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.is_active) {
      throw new CustomError('Account is deactivated', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new CustomError('Invalid email or password', 401);
    }

    // Update last login
    await User.updateLastLogin(user.id, deviceInfo?.ipAddress || '');

    // Generate tokens and create session
    const tokens = await this.generateTokens(user.id, deviceInfo);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        preferences: user.preferences
      },
      tokens
    };
  }

  // Generate access and refresh tokens
  private async generateTokens(userId: string, deviceInfo?: any): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Generate access token
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Generate refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');

    // Calculate expiration
    const expiresIn = this.parseTimeToSeconds(config.jwt.expiresIn);
    const refreshExpiresAt = new Date(Date.now() + this.parseTimeToSeconds(config.jwt.refreshExpiresIn) * 1000);

    // Create session
    await Session.createSession({
      user_id: userId,
      refresh_token: refreshToken,
      device_type: deviceInfo?.deviceType || 'unknown',
      device_name: deviceInfo?.deviceName || 'Unknown Device',
      user_agent: deviceInfo?.userAgent || '',
      ip_address: deviceInfo?.ipAddress || '',
      location: deviceInfo?.location || '',
      expires_at: refreshExpiresAt
    });

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  // Refresh access token
  async refreshToken(refreshToken: string, deviceInfo?: any): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Find session by refresh token
    const session = await Session.findByRefreshToken(refreshToken);
    if (!session || !session.is_active) {
      throw new CustomError('Invalid refresh token', 401);
    }

    // Check if session is expired
    if (new Date() > session.expires_at) {
      await Session.deactivateSession(session.id);
      throw new CustomError('Refresh token expired', 401);
    }

    // Get user
    const user = await User.findById(session.user_id);
    if (!user || !user.is_active) {
      throw new CustomError('User not found or inactive', 401);
    }

    // Update session last used
    await Session.updateLastUsed(session.id, deviceInfo?.ipAddress || '');

    // Generate new tokens
    return this.generateTokens(user.id, deviceInfo);
  }

  // Logout user
  async logout(refreshToken: string): Promise<void> {
    const session = await Session.findByRefreshToken(refreshToken);
    if (session) {
      await Session.deactivateSession(session.id);
    }
  }

  // Forgot password
  async forgotPassword(email: string): Promise<void> {
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await User.setPasswordResetToken(email, resetToken, expiresAt);

    // Send reset email
    await this.emailService.sendPasswordResetEmail(email, user.first_name, resetToken);
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Reset password
    const user = await User.resetPassword(token, passwordHash);
    if (!user) {
      throw new CustomError('Invalid or expired reset token', 400);
    }

    // Deactivate all user sessions
    await Session.deactivateUserSessions(user.id);
  }

  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new CustomError('Current password is incorrect', 400);
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.updateById(userId, { password_hash: passwordHash });

    // Deactivate all other sessions
    await Session.deactivateUserSessions(userId);
  }

  // Verify email
  async verifyEmail(token: string): Promise<UserModel> {
    const user = await User.verifyEmail(token);
    if (!user) {
      throw new CustomError('Invalid or expired verification token', 400);
    }
    return user;
  }

  // Resend verification email
  async resendVerification(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (user.email_verified) {
      throw new CustomError('Email is already verified', 400);
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await User.setEmailVerificationToken(user.id, verificationToken);

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, user.first_name, verificationToken);
  }

  // Parse time string to seconds
  private parseTimeToSeconds(timeString: string): number {
    const unit = timeString.slice(-1);
    const value = parseInt(timeString.slice(0, -1));

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return value;
    }
  }
}
