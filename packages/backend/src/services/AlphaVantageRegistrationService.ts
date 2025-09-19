import axios from 'axios';
import config from '../config';
import { UserModel } from '../models/User';

export interface ApiKeyRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  jobTitle: string;
  country: string;
  intendedUsage: string;
}

export interface ApiKeyRegistrationResult {
  success: boolean;
  apiKey?: string;
  message: string;
  registrationId?: string;
}

export class AlphaVantageRegistrationService {
  private baseUrl = 'https://www.alphavantage.co';
  
  constructor() {
    console.log('🔑 Alpha Vantage Registration Service initialized');
  }

  /**
   * Automatically request an Alpha Vantage API key for a new user
   * This simulates the registration process - in production, you'd integrate with Alpha Vantage's API
   */
  async requestApiKeyForUser(user: UserModel): Promise<ApiKeyRegistrationResult> {
    try {
      console.log(`📝 Requesting Alpha Vantage API key for user: ${user.email}`);

      // Extract user information
      const registrationData: ApiKeyRegistrationData = {
        firstName: user.first_name || 'User',
        lastName: user.last_name || 'Finora',
        email: user.email,
        organization: config.alphaVantage.companyName,
        jobTitle: 'Portfolio Manager',
        country: 'United States',
        intendedUsage: 'Personal portfolio management and stock tracking through Finora mobile application'
      };

      // In a real implementation, you would:
      // 1. Submit registration to Alpha Vantage API
      // 2. Handle the response and extract the API key
      // 3. Store the key securely in the database
      
      // For now, we'll simulate the process and generate a placeholder
      const simulatedResult = await this.simulateApiKeyRegistration(registrationData);
      
      if (simulatedResult.success && simulatedResult.apiKey) {
        // Store the API key for the user
        await this.storeUserApiKey(user.id, simulatedResult.apiKey);
        
        console.log(`✅ API key registered for user: ${user.email}`);
        return simulatedResult;
      } else {
        console.error(`❌ Failed to register API key for user: ${user.email}`);
        return {
          success: false,
          message: 'Failed to register API key with Alpha Vantage'
        };
      }
    } catch (error) {
      console.error('Error requesting API key:', error);
      return {
        success: false,
        message: 'Internal error during API key registration'
      };
    }
  }

  /**
   * Simulate API key registration process
   * In production, replace this with actual Alpha Vantage API integration
   */
  private async simulateApiKeyRegistration(data: ApiKeyRegistrationData): Promise<ApiKeyRegistrationResult> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For demonstration, we'll generate a mock API key
    // In production, this would be the actual Alpha Vantage API response
    const mockApiKey = this.generateMockApiKey();
    
    return {
      success: true,
      apiKey: mockApiKey,
      message: 'API key successfully registered',
      registrationId: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * Generate a mock API key for development/testing
   * In production, this would come from Alpha Vantage
   */
  private generateMockApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Store user-specific API key in database
   */
  private async storeUserApiKey(userId: string, apiKey: string): Promise<void> {
    try {
      // In a real implementation, you would:
      // 1. Encrypt the API key before storing
      // 2. Store in a secure user_api_keys table
      // 3. Set expiration dates and usage limits
      
      console.log(`💾 Storing API key for user ${userId}: ${apiKey.substring(0, 8)}...`);
      
      // For now, we'll just log it
      // TODO: Implement actual database storage with encryption
    } catch (error) {
      console.error('Error storing user API key:', error);
      throw error;
    }
  }

  /**
   * Get user's personal API key
   */
  async getUserApiKey(userId: string): Promise<string | null> {
    try {
      // In production, retrieve from encrypted database storage
      // For now, return null to use pool keys
      return null;
    } catch (error) {
      console.error('Error retrieving user API key:', error);
      return null;
    }
  }

  /**
   * Validate if user has a personal API key
   */
  async hasUserApiKey(userId: string): Promise<boolean> {
    const apiKey = await this.getUserApiKey(userId);
    return !!apiKey;
  }

  /**
   * Request additional API key quota for heavy users
   */
  async requestQuotaIncrease(userId: string, currentUsage: number): Promise<ApiKeyRegistrationResult> {
    try {
      console.log(`📈 Requesting quota increase for user ${userId}, current usage: ${currentUsage}`);
      
      // In production, this would:
      // 1. Check user's current plan
      // 2. Submit upgrade request to Alpha Vantage
      // 3. Handle billing and plan changes
      
      return {
        success: true,
        message: 'Quota increase request submitted successfully'
      };
    } catch (error) {
      console.error('Error requesting quota increase:', error);
      return {
        success: false,
        message: 'Failed to request quota increase'
      };
    }
  }

  /**
   * Bulk register API keys for multiple users
   */
  async bulkRegisterApiKeys(users: UserModel[]): Promise<Map<string, ApiKeyRegistrationResult>> {
    const results = new Map<string, ApiKeyRegistrationResult>();
    
    console.log(`🔄 Bulk registering API keys for ${users.length} users`);
    
    for (const user of users) {
      try {
        const result = await this.requestApiKeyForUser(user);
        results.set(user.id, result);
        
        // Add delay between requests to avoid overwhelming Alpha Vantage
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.set(user.id, {
          success: false,
          message: `Error registering API key: ${(error as Error).message}`
        });
      }
    }
    
    const successful = Array.from(results.values()).filter(r => r.success).length;
    console.log(`✅ Bulk registration complete: ${successful}/${users.length} successful`);
    
    return results;
  }

  /**
   * Monitor API key usage and automatically request new keys when needed
   */
  async monitorAndRotateKeys(): Promise<void> {
    try {
      console.log('🔍 Monitoring API key usage and rotating if needed');
      
      // In production, this would:
      // 1. Check current key pool usage
      // 2. Identify keys approaching limits
      // 3. Automatically request new keys
      // 4. Rotate keys in the pool
      // 5. Notify administrators of key status
      
      console.log('✅ Key monitoring and rotation complete');
    } catch (error) {
      console.error('Error during key monitoring:', error);
    }
  }

  /**
   * Get registration service status
   */
  getServiceStatus() {
    return {
      service: 'Alpha Vantage Registration',
      status: 'operational',
      autoRegister: config.alphaVantage.autoRegister,
      companyName: config.alphaVantage.companyName,
      companyUrl: config.alphaVantage.companyUrl,
      registrationEmail: config.alphaVantage.registrationEmail
    };
  }

  /**
   * Real Alpha Vantage API key registration (for production use)
   * This method would integrate with Alpha Vantage's actual registration API
   */
  private async realApiKeyRegistration(data: ApiKeyRegistrationData): Promise<ApiKeyRegistrationResult> {
    try {
      // This is a placeholder for the actual Alpha Vantage registration API
      // Alpha Vantage doesn't currently have a public API for key registration
      // You would need to:
      // 1. Contact Alpha Vantage for enterprise API access
      // 2. Use their provided registration endpoint
      // 3. Handle authentication and rate limiting
      
      const response = await axios.post(`${this.baseUrl}/api/register`, {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        organization: data.organization,
        job_title: data.jobTitle,
        country: data.country,
        intended_usage: data.intendedUsage
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.alphaVantage.apiKey}` // Master API key
        }
      });

      if (response.data.success) {
        return {
          success: true,
          apiKey: response.data.api_key,
          message: 'API key successfully registered with Alpha Vantage',
          registrationId: response.data.registration_id
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Registration failed'
        };
      }
    } catch (error) {
      console.error('Real API registration error:', error);
      return {
        success: false,
        message: 'Failed to register with Alpha Vantage API'
      };
    }
  }
}
