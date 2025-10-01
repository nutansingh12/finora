import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { UserApiKey, UserApiKeyModel } from '../models/UserApiKey';
import { AlphaVantageRegistrationService } from '../services/AlphaVantageRegistrationService';
import { AlphaVantageService } from '../services/AlphaVantageService';
import { User, UserModel } from '../models/User';
import { config } from '../config';

export class ApiKeyController {
  private static registrationService = new AlphaVantageRegistrationService();
  private static alphaVantageService = new AlphaVantageService();

  // Get user's API keys
  static async getUserApiKeys(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const apiKeys = await UserApiKey.findKeysForUser(userId);
      
      // Return keys without exposing the actual API key values
      const safeApiKeys = apiKeys.map(key => ({
        id: key.id,
        provider: key.provider,
        keyName: key.key_name,
        isActive: key.is_active,
        usageStats: UserApiKey.getUsageStats(key),
        createdAt: key.created_at,
        expiresAt: key.expires_at
      }));

      res.json({
        success: true,
        data: {
          apiKeys: safeApiKeys,
          totalKeys: safeApiKeys.length,
          activeKeys: safeApiKeys.filter(key => key.isActive).length
        }
      });
    } catch (error) {
      console.error('Get user API keys error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Request new API key for user
  static async requestApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { provider = 'alpha_vantage', keyName } = req.body;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Get user details
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Check if user already has an active key for this provider
      const existingKey = await UserApiKey.findActiveKeyForUser(userId, provider);
      if (existingKey) {
        res.status(409).json({
          success: false,
          message: `User already has an active ${provider} API key`,
          data: {
            existingKey: {
              id: existingKey.id,
              keyName: existingKey.key_name,
              usageStats: UserApiKey.getUsageStats(existingKey)
            }
          }
        });
        return;
      }

      // Request new API key
      const registrationResult = await ApiKeyController.registrationService.requestApiKeyForUser(user);
      
      if (!registrationResult.success || !registrationResult.apiKey) {
        res.status(400).json({
          success: false,
          message: registrationResult.message
        });
        return;
      }

      // Store the new API key
      const newApiKey = await UserApiKey.createForUser(
        userId,
        provider as 'alpha_vantage',
        registrationResult.apiKey,
        {
          keyName: keyName || `${provider}_${Date.now()}`,
          requestLimit: 500,
          dailyRequestLimit: 500,
          registrationId: registrationResult.registrationId,
          metadata: {
            requestedAt: new Date().toISOString(),
            userRequested: true
          }
        }
      );

      res.status(201).json({
        success: true,
        message: 'API key requested and registered successfully',
        data: {
          apiKey: {
            id: newApiKey.id,
            provider: newApiKey.provider,
            keyName: newApiKey.key_name,
            usageStats: UserApiKey.getUsageStats(newApiKey),
            createdAt: newApiKey.created_at
          }
        }
      });
    } catch (error) {
      console.error('Request API key error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Deactivate API key
  static async deactivateApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { keyId } = req.params;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const apiKey = await UserApiKey.findById(keyId as string);

      if (!apiKey || apiKey.user_id !== userId) {
        res.status(404).json({
          success: false,
          message: 'API key not found'
        });
        return;
      }

      await UserApiKey.deactivate(keyId as string);

      res.json({
        success: true,
        message: 'API key deactivated successfully',
        data: {
          apiKey: {
            id: apiKey.id,
            provider: apiKey.provider,
            keyName: apiKey.key_name,
            isActive: false // It was just deactivated
          }
        }
      });
    } catch (error) {
      console.error('Deactivate API key error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get API key usage statistics
  static async getApiKeyUsage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { keyId } = req.params;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const apiKey = await UserApiKey.findById(keyId as string);

      if (!apiKey || apiKey.user_id !== userId) {
        res.status(404).json({
          success: false,
          message: 'API key not found'
        });
        return;
      }

      const usageStats = UserApiKey.getUsageStats(apiKey);

      res.json({
        success: true,
        data: {
          keyId: apiKey.id,
          provider: apiKey.provider,
          keyName: apiKey.key_name,
          usage: usageStats
        }
      });
    } catch (error) {
      console.error('Get API key usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get Alpha Vantage service status (admin)
  static async getServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      const alphaVantageStatus = ApiKeyController.alphaVantageService.getServiceStatus();
      const registrationStatus = ApiKeyController.registrationService.getServiceStatus();

      res.json({
        success: true,
        data: {
          alphaVantage: alphaVantageStatus,
          registration: registrationStatus,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get service status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Validate API keys in pool (admin)
  static async validateApiKeys(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 Starting API key validation...');
      const validationResult = await ApiKeyController.alphaVantageService.validateApiKeys();

      res.json({
        success: true,
        message: 'API key validation completed',
        data: {
          validation: validationResult,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Validate API keys error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get pool statistics (admin)
  static async getPoolStatistics(req: Request, res: Response): Promise<void> {
    try {
      const alphaVantageStats = await UserApiKey.getPoolStatistics('alpha_vantage');
      const serviceStatus = ApiKeyController.alphaVantageService.getServiceStatus();

      res.json({
        success: true,
        data: {
          poolStatistics: alphaVantageStats,
          serviceStatus: serviceStatus,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get pool statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Request quota increase
  static async requestQuotaIncrease(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { currentUsage, requestedQuota, reason } = req.body;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const result = await ApiKeyController.registrationService.requestQuotaIncrease(
        userId,
        currentUsage || 0
      );

      res.json({
        success: result.success,
        message: result.message,
        data: {
          requestedQuota,
          reason,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Request quota increase error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get skip list for API key registration (admin)
  static async getSkipList(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        data: {
          skipEmails: config.alphaVantage.skipEmails,
          message: 'These emails will skip automatic API key registration during account creation'
        }
      });
    } catch (error) {
      console.error('Get skip list error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
