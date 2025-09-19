import { Request, Response } from 'express';
import { AuthService } from '@/services/AuthService';
import { User } from '@/models/User';
import { Session } from '@/models/Session';
import { AuthenticatedRequest } from '@/middleware/auth';
import { CustomError } from '@/middleware/errorHandler';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Register new user
  register = async (req: Request, res: Response): Promise<void> => {
    const { email, password, firstName, lastName } = req.body;
    
    const deviceInfo = {
      deviceType: req.headers['x-device-type'] || 'web',
      deviceName: req.headers['x-device-name'] || 'Unknown Device',
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || req.connection.remoteAddress || '',
      location: req.headers['x-location'] || ''
    };

    const result = await this.authService.register(
      { email, password, firstName, lastName },
      deviceInfo
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: result
    });
  };

  // Login user
  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    
    const deviceInfo = {
      deviceType: req.headers['x-device-type'] || 'web',
      deviceName: req.headers['x-device-name'] || 'Unknown Device',
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || req.connection.remoteAddress || '',
      location: req.headers['x-location'] || ''
    };

    const result = await this.authService.login(email, password, deviceInfo);

    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  };

  // Logout user
  logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const refreshToken = req.body.refreshToken;
    
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  };

  // Refresh access token
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new CustomError('Refresh token is required', 400);
    }

    const deviceInfo = {
      deviceType: req.headers['x-device-type'] || 'web',
      deviceName: req.headers['x-device-name'] || 'Unknown Device',
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || req.connection.remoteAddress || '',
      location: req.headers['x-location'] || ''
    };

    const tokens = await this.authService.refreshToken(refreshToken, deviceInfo);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    });
  };

  // Forgot password
  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    
    await this.authService.forgotPassword(email);

    res.json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.'
    });
  };

  // Reset password
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body;
    
    await this.authService.resetPassword(token, password);

    res.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.'
    });
  };

  // Change password
  changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;
    
    await this.authService.changePassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  };

  // Verify email
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;
    
    if (!token) {
      throw new CustomError('Verification token is required', 400);
    }

    const user = await this.authService.verifyEmail(token);

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          emailVerified: user.email_verified
        }
      }
    });
  };

  // Resend verification email
  resendVerification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    await this.authService.resendVerification(userId);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  };

  // Get current user
  getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          emailVerified: user.email_verified,
          preferences: user.preferences,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at
        }
      }
    });
  };

  // Get user sessions
  getUserSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    const sessions = await Session.getUserSessions(userId);

    res.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          id: session.id,
          deviceType: session.device_type,
          deviceName: session.device_name,
          ipAddress: session.ip_address,
          location: session.location,
          lastUsedAt: session.last_used_at,
          createdAt: session.created_at,
          isActive: session.is_active
        }))
      }
    });
  };

  // Revoke specific session
  revokeSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const userId = req.user!.id;
    
    // Verify session belongs to user
    const session = await Session.findById(sessionId);
    if (!session || session.user_id !== userId) {
      throw new CustomError('Session not found', 404);
    }

    await Session.deactivateSession(sessionId);

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  };

  // Revoke all sessions
  revokeAllSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    await Session.deactivateUserSessions(userId);

    res.json({
      success: true,
      message: 'All sessions revoked successfully'
    });
  };
}
