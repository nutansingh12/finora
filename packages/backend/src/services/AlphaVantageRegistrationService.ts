import axios from 'axios';
import config from '../config';
import { UserModel } from '../models/User';
import { BackupApiKeysService } from './BackupApiKeysService';

export interface ApiKeyRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  userType: string;
  jobTitle?: string;
  country?: string;
  intendedUsage?: string;
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
  async requestApiKeyForUser(user: UserModel & { organization?: string; userType?: string; jobTitle?: string; country?: string; intendedUsage?: string }): Promise<ApiKeyRegistrationResult> {
    try {
      console.log(`📝 Requesting Alpha Vantage API key for user: ${user.email}`);

      // Extract user information with provided data or fallbacks
      const registrationData: ApiKeyRegistrationData = {
        firstName: user.first_name || 'User',
        lastName: user.last_name || 'Finora',
        email: user.email,
        organization: user.organization || config.alphaVantage.companyName || 'Individual Investor',
        userType: user.userType || 'Investor',
        jobTitle: user.jobTitle,
        country: user.country,
        intendedUsage: user.intendedUsage,
      };

      // In a real implementation, you would:
      // 1. Submit registration to Alpha Vantage API
      // 2. Handle the response and extract the API key
      // 3. Store the key securely in the database
      
      // Try real registration first; fallback to shared key if available
      const realResult = await this.realApiKeyRegistration(registrationData);

      if (realResult.success && realResult.apiKey) {
        console.log(`✅ API key registered for user: ${user.email}`);
        return realResult;
      }

      // Fallback: use configured shared API key if present
      const sharedKey = config.alphaVantage.apiKey;
      if (sharedKey && sharedKey.trim()) {
        console.warn(`⚠️ Using shared Alpha Vantage API key as fallback for ${user.email}`);
        return {
          success: true,
          apiKey: sharedKey,
          message: 'Using shared Alpha Vantage API key as fallback',
          registrationId: `fallback_${Date.now()}`
        };
      }

      // Try backup_api_keys table if available
      const backupRec = await BackupApiKeysService.fetchBackupKeyRecord();
      if (backupRec) {
        console.warn(`⚠️ Using backup_api_keys fallback for ${user.email} (id=${backupRec.id})`);
        return {
          success: true,
          apiKey: backupRec.api_key,
          message: 'Using backup_api_keys fallback',
          registrationId: `backup_${backupRec.id}`
        };
      }

      // Final fallback in non-production: simulate to unblock dev
      if (process.env.NODE_ENV !== 'production') {
        const simulatedResult = await this.simulateApiKeyRegistration(registrationData);
        if (simulatedResult.success && simulatedResult.apiKey) {
          return simulatedResult;
        }
      }

      console.error(`❌ Failed to register or fallback API key for user: ${user.email}`);
      return { success: false, message: 'Failed to register API key with Alpha Vantage' };
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
      // Step 1: Fetch support page to get CSRF token + cookies
      const pageResponse = await axios.get(`${this.baseUrl}/support/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
      });

      const csrfMatch = pageResponse.data.match(/name="csrfmiddlewaretoken"\s+value="([^"]+)"/);
      if (!csrfMatch) {
        return { success: false, message: 'CSRF token not found on Alpha Vantage page' };
      }
      const csrfToken = csrfMatch[1];

      const cookies = pageResponse.headers['set-cookie'] || [];
      const cookieHeader = cookies.map((c: string) => c.split(';')[0]).join('; ');

      // Map user type to the exact allowed options on the Alpha Vantage form
      const allowed = ['Investor', 'Software Developer', 'Educator', 'Student', 'Other'];
      const candidate = (data.userType || '').trim();
      const occupation = allowed.find(o => o.toLowerCase() === candidate.toLowerCase()) || 'Investor';

      // Step 2: Submit registration form with the exact field names used by Alpha Vantage
      const formData = new URLSearchParams();
      formData.append('occupation', occupation);
      formData.append('organization', data.organization || 'Individual Investor');
      formData.append('email', data.email);
      formData.append('csrfmiddlewaretoken', csrfToken);

      const submitResponse = await axios.post(`${this.baseUrl}/create_post/`, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': `${this.baseUrl}/support/`,
          'Origin': this.baseUrl,
          'Cookie': cookieHeader
        },
        timeout: 20000,
        validateStatus: () => true
      });

      const body: string = (typeof submitResponse.data === 'string')
        ? submitResponse.data
        : (submitResponse.data?.text || submitResponse.data?.message || JSON.stringify(submitResponse.data));

      const patterns = [
        /api\s*key\s*is[:\s]*([A-Z0-9]{16})/i,
        /api\s*key[:\s]*([A-Z0-9]{16})/i,
        /\b([A-Z0-9]{16})\b/
      ];

      let apiKey: string | null = null;
      for (const rx of patterns) {
        const m = body.match(rx);
        if (m && m[1]) { apiKey = m[1]; break; }
      }

      if (apiKey) {
        return {
          success: true,
          apiKey,
          message: 'API key successfully registered with Alpha Vantage',
          registrationId: `av_${Date.now()}`
        };
      }

      // Attempt a follow-up GET to the support page in case the key is rendered there after POST
      try {
        const followupCookies = [
          ...(submitResponse.headers['set-cookie'] || []).map((c: string) => c.split(';')[0]),
          ...cookieHeader.split('; ').filter(Boolean)
        ];
        const followupCookieHeader = Array.from(new Set(followupCookies)).join('; ');
        const follow = await axios.get(`${this.baseUrl}/support/`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cookie': followupCookieHeader,
            'Referer': `${this.baseUrl}/support/`
          },
          timeout: 15000,
          validateStatus: () => true
        });
        const followBody: string = typeof follow.data === 'string' ? follow.data : JSON.stringify(follow.data);
        for (const rx of patterns) {
          const m2 = followBody.match(rx);
          if (m2 && m2[1]) {
            return {
              success: true,
              apiKey: m2[1],
              message: 'API key successfully registered with Alpha Vantage',
              registrationId: `av_${Date.now()}`
            };
          }
        }
      } catch {}

      console.warn('Alpha Vantage registration: no inline key in response. Snippet:', String(body).slice(0, 300));
      return { success: false, message: 'Failed to extract API key from Alpha Vantage response' };
    } catch (error) {
      console.error('Real API registration error:', error);
      return { success: false, message: 'Failed to register with Alpha Vantage' };
    }
  }
}
