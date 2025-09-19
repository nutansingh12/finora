import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, UserModel } from '../models/User';
import { config } from '../config';
import { validateEmail, validatePassword } from '../utils/validation';
import { AlphaVantageRegistrationService } from '../services/AlphaVantageRegistrationService';
import { UserApiKey, UserApiKeyModel } from '../models/UserApiKey';

// Import the shared AuthenticatedRequest interface
import { AuthenticatedRequest } from '../types/express';

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

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

      // Automatically request Alpha Vantage API key for new user
      let apiKeyStatus = null;

      // Skip API key registration for specific emails that already have keys
      const shouldSkipApiKey = config.alphaVantage.skipEmails.includes(email.toLowerCase());

      if (config.alphaVantage.autoRegister && !shouldSkipApiKey) {
        try {
          console.log(`🔑 Auto-registering Alpha Vantage API key for user: ${user.email}`);
          const registrationService = new AlphaVantageRegistrationService();
          const apiKeyResult = await registrationService.requestApiKeyForUser(user);

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
                  registrationDate: new Date().toISOString()
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
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
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

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as any;
      
      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
        return;
      }

      // Generate new tokens
      const tokens = AuthController.generateTokens(user.id);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokens
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  // Logout user
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // For now, just return success
      // In a full implementation, we would invalidate the refresh token
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
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
}
