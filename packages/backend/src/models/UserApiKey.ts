import { BaseModel } from './BaseModel';

export interface UserApiKeyModel {
  id: string;
  user_id: string;
  provider: 'alpha_vantage' | 'yahoo_finance' | 'iex_cloud';
  api_key: string; // Encrypted
  key_name?: string;
  is_active: boolean;
  requests_used: number;
  daily_requests_used: number;
  request_limit: number;
  daily_request_limit: number;
  last_used_at?: Date;
  expires_at?: Date;
  registration_id?: string;
  metadata?: any; // JSON field for additional key information
  created_at: Date;
  updated_at: Date;
}

export interface UserApiKeyCreationData {
  user_id: string;
  provider: 'alpha_vantage' | 'yahoo_finance' | 'iex_cloud';
  api_key: string;
  key_name?: string;
  request_limit?: number;
  daily_request_limit?: number;
  expires_at?: Date;
  registration_id?: string;
  metadata?: any;
}

export class UserApiKey extends BaseModel {
  protected static override tableName = 'user_api_keys';

  /**
   * Simple encryption for API keys (in production, use proper encryption)
   */
  static encryptApiKey(apiKey: string): string {
    // Simple base64 encoding for now - in production use proper encryption
    return Buffer.from(apiKey).toString('base64');
  }

  /**
   * Simple decryption for API keys
   */
  static decryptApiKey(encryptedApiKey: string): string {
    // Simple base64 decoding for now - in production use proper decryption
    return Buffer.from(encryptedApiKey, 'base64').toString('utf8');
  }

  /**
   * Create new API key for user
   */
  static async createForUser(
    userId: string,
    provider: 'alpha_vantage' | 'yahoo_finance' | 'iex_cloud',
    apiKey: string,
    options: {
      keyName?: string;
      requestLimit?: number;
      dailyRequestLimit?: number;
      expiresAt?: Date;
      registrationId?: string;
      metadata?: any;
    } = {}
  ): Promise<UserApiKeyModel> {
    const encryptedApiKey = this.encryptApiKey(apiKey);
    
    return this.create<UserApiKeyModel>({
      user_id: userId,
      provider,
      api_key: encryptedApiKey,
      key_name: options.keyName || `${provider}_key_${Date.now()}`,
      is_active: true,
      requests_used: 0,
      daily_requests_used: 0,
      request_limit: options.requestLimit || 500,
      daily_request_limit: options.dailyRequestLimit || 500,
      expires_at: options.expiresAt,
      registration_id: options.registrationId,
      metadata: options.metadata
    });
  }

  /**
   * Find active API key for user and provider
   */
  static async findActiveKeyForUser(userId: string, provider: string): Promise<UserApiKeyModel | null> {
    return this.findOne<UserApiKeyModel>({
      user_id: userId,
      provider,
      is_active: true
    });
  }

  /**
   * Find all API keys for user
   */
  static async findKeysForUser(userId: string): Promise<UserApiKeyModel[]> {
    return this.findAll<UserApiKeyModel>({
      user_id: userId
    });
  }

  /**
   * Get decrypted API key
   */
  static getDecryptedApiKey(apiKeyModel: UserApiKeyModel): string {
    return this.decryptApiKey(apiKeyModel.api_key);
  }

  /**
   * Check if API key is within rate limits
   */
  static isWithinRateLimit(apiKeyModel: UserApiKeyModel): boolean {
    const now = new Date();
    const lastUsed = apiKeyModel.last_used_at || new Date(0);
    const timeDiff = now.getTime() - lastUsed.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    // If it's a new day, daily usage should be reset (this would be handled by a cron job)
    const isDifferentDay = timeDiff > oneDay;
    const dailyUsage = isDifferentDay ? 0 : apiKeyModel.daily_requests_used;

    return dailyUsage < apiKeyModel.daily_request_limit && 
           apiKeyModel.requests_used < apiKeyModel.request_limit;
  }

  /**
   * Increment usage counters
   */
  static async incrementUsage(apiKeyId: string): Promise<void> {
    // For now, we'll get the current values and increment them
    const apiKey = await this.findById(apiKeyId);
    if (apiKey) {
      await this.updateById(apiKeyId, {
        requests_used: apiKey.requests_used + 1,
        daily_requests_used: apiKey.daily_requests_used + 1,
        last_used_at: new Date()
      });
    }
  }

  /**
   * Deactivate API key
   */
  static async deactivate(apiKeyId: string): Promise<void> {
    await this.updateById(apiKeyId, {
      is_active: false
    });
  }

  /**
   * Get usage statistics for an API key
   */
  static getUsageStats(apiKeyModel: UserApiKeyModel) {
    const usagePercentage = (apiKeyModel.requests_used / apiKeyModel.request_limit) * 100;
    const dailyUsagePercentage = (apiKeyModel.daily_requests_used / apiKeyModel.daily_request_limit) * 100;

    return {
      requestsUsed: apiKeyModel.requests_used,
      requestLimit: apiKeyModel.request_limit,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      dailyRequestsUsed: apiKeyModel.daily_requests_used,
      dailyRequestLimit: apiKeyModel.daily_request_limit,
      dailyUsagePercentage: Math.round(dailyUsagePercentage * 100) / 100,
      isWithinLimit: this.isWithinRateLimit(apiKeyModel),
      isExpired: apiKeyModel.expires_at ? new Date() > apiKeyModel.expires_at : false,
      isActive: apiKeyModel.is_active,
      lastUsedAt: apiKeyModel.last_used_at
    };
  }

  /**
   * Get API key pool statistics
   */
  static async getPoolStatistics(provider: string): Promise<any> {
    const keys = await this.findAll<UserApiKeyModel>({
      provider,
      is_active: true
    });

    const totalKeys = keys.length;
    const totalRequests = keys.reduce((sum: number, key: UserApiKeyModel) => sum + key.requests_used, 0);
    const totalDailyRequests = keys.reduce((sum: number, key: UserApiKeyModel) => sum + key.daily_requests_used, 0);
    const averageUsage = totalKeys > 0 ? totalRequests / totalKeys : 0;

    return {
      provider,
      totalKeys,
      totalRequests,
      totalDailyRequests,
      averageUsage: Math.round(averageUsage * 100) / 100,
      keysWithinLimit: keys.filter((key: UserApiKeyModel) => this.isWithinRateLimit(key)).length,
      expiredKeys: keys.filter((key: UserApiKeyModel) => key.expires_at ? new Date() > key.expires_at : false).length
    };
  }
}
