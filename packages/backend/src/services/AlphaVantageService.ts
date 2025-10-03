import axios, { AxiosInstance, AxiosError } from 'axios';
import config from '../config';
import { UserApiKey } from '@/models/UserApiKey';

// Alpha Vantage API Response Interfaces
export interface AlphaVantageQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

export interface AlphaVantageHistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AlphaVantageSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen: string;
  marketClose: string;
  timezone: string;
  currency: string;
  matchScore: string;
}

// API Key Pool Management
interface ApiKeyUsage {
  key: string;
  requestCount: number;
  dailyRequestCount: number;
  lastRequestTime: number;
  lastResetTime: number;
  isBlocked: boolean;
  blockUntil?: number;
}

export class AlphaVantageService {
  private client: AxiosInstance;
  private baseUrl = config.alphaVantage.baseUrl;
  private keyPool: string[] = [];
  private keyUsage: Map<string, ApiKeyUsage> = new Map();
  private currentKeyIndex = 0;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = {
    quote: 60000,      // 1 minute for quotes
    historical: 300000, // 5 minutes for historical data
    search: 600000     // 10 minutes for search results
  };

  constructor() {
    // Initialize key pool
    const keys = [config.alphaVantage.apiKey, ...config.alphaVantage.keyPool] as Array<string | undefined>;
    this.keyPool = keys
      .filter((key): key is string => !!key && key.trim() !== '' && key !== 'your_primary_alpha_vantage_key_here');

    console.log(`🔑 Alpha Vantage Service initialized with ${this.keyPool.length} API keys`);
    
    if (this.keyPool.length === 0) {
      console.error('❌ No valid Alpha Vantage API keys found! Please add keys to .env file');
      throw new Error('No Alpha Vantage API keys configured');
    }

    // Initialize key usage tracking
    this.keyPool.forEach(key => {
      this.keyUsage.set(key, {
        key,
        requestCount: 0,
        dailyRequestCount: 0,
        lastRequestTime: 0,
        lastResetTime: Date.now(),
        isBlocked: false
      });
    });

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Finora-App/1.0'
      }
    });

    // Add request interceptor for key rotation and rate limiting
    this.client.interceptors.request.use(async (config) => {
      // If caller already provided an API key (e.g., per-user), do not override
      if (config.params && typeof (config.params as any).apikey === 'string') {
        return config;
      }

      const apiKey = await this.getAvailableApiKey();
      config.params = { ...(config.params || {}), apikey: apiKey };

      // Track usage for pool key
      this.trackKeyUsage(apiKey);

      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );

    // Start cleanup interval for cache and key usage reset
    setInterval(() => {
      this.cleanupCache();
      this.resetDailyUsage();
    }, 60000); // Every minute
  }

  // Intelligent API Key Selection
  private async getAvailableApiKey(): Promise<string> {
    const now = Date.now();
    
    // Find the best available key
    let bestKey: string | null = null;
    let lowestUsage = Infinity;

    for (const key of this.keyPool) {
      const usage = this.keyUsage.get(key)!;
      
      // Skip blocked keys
      if (usage.isBlocked && usage.blockUntil && now < usage.blockUntil) {
        continue;
      }

      // Unblock if block period has passed
      if (usage.isBlocked && usage.blockUntil && now >= usage.blockUntil) {
        usage.isBlocked = false;
        usage.blockUntil = undefined;
        console.log(`🔓 Unblocked API key: ${key.substring(0, 8)}...`);
      }

      // Check rate limits
      const timeSinceLastRequest = now - usage.lastRequestTime;
      const requestsPerMinute = config.alphaVantage.requestsPerMinute;
      const requestsPerDay = config.alphaVantage.requestsPerDay;

      // Skip if minute rate limit exceeded
      if (timeSinceLastRequest < (60000 / requestsPerMinute)) {
        continue;
      }

      // Skip if daily limit exceeded
      if (usage.dailyRequestCount >= requestsPerDay) {
        continue;
      }

      // Select key with lowest usage
      if (usage.requestCount < lowestUsage) {
        lowestUsage = usage.requestCount;
        bestKey = key;
      }
    }

    if (!bestKey) {
      // All keys are rate limited, wait and retry with least recently used
      console.warn('⚠️ All API keys are rate limited, using least recently used key');
      const sortedKeys = Array.from(this.keyUsage.entries())
        .sort((a, b) => a[1].lastRequestTime - b[1].lastRequestTime);
      bestKey = (sortedKeys[0]?.[0] ?? this.keyPool[0] ?? config.alphaVantage.apiKey ?? '') as string;
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return (bestKey ?? this.keyPool[0] ?? config.alphaVantage.apiKey ?? '');
  }

  // Track API Key Usage
  private trackKeyUsage(apiKey: string): void {
    const usage = this.keyUsage.get(apiKey);
    if (usage) {
      usage.requestCount++;
      usage.dailyRequestCount++;
      usage.lastRequestTime = Date.now();
    }
  }

  // Handle API Errors and Key Blocking
  private handleApiError(error: AxiosError): void {
    const response = error.response;
    const config = error.config;
    
    if (response && config?.params?.apikey) {
      const apiKey = config.params.apikey;
      const usage = this.keyUsage.get(apiKey);
      
      if (usage) {
        switch (response.status) {
          case 429: // Rate limit exceeded
            console.warn(`⚠️ Rate limit exceeded for key: ${apiKey.substring(0, 8)}...`);
            usage.isBlocked = true;
            usage.blockUntil = Date.now() + (60 * 1000); // Block for 1 minute
            break;
            
          case 403: // Forbidden - invalid key or quota exceeded
            console.error(`❌ API key invalid or quota exceeded: ${apiKey.substring(0, 8)}...`);
            usage.isBlocked = true;
            usage.blockUntil = Date.now() + (24 * 60 * 60 * 1000); // Block for 24 hours
            break;
            
          case 500: // Server error
            console.error('🔥 Alpha Vantage server error');
            break;
        }
      }
    }
    
    console.error('Alpha Vantage API Error:', error.message);
  }

  // Cache Management
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.getCacheTimeout(key)) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private getCacheTimeout(key: string): number {
    if (key.startsWith('quote_')) return this.cacheTimeout.quote;
    if (key.startsWith('historical_')) return this.cacheTimeout.historical;
    if (key.startsWith('search_')) return this.cacheTimeout.search;
    return this.cacheTimeout.quote;
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.getCacheTimeout(key)) {
        this.cache.delete(key);
      }
    }
  }

  // Reset daily usage counters
  private resetDailyUsage(): void {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    for (const usage of this.keyUsage.values()) {
      if (now - usage.lastResetTime > oneDayMs) {
        usage.dailyRequestCount = 0;
        usage.lastResetTime = now;
        console.log(`🔄 Reset daily usage for key: ${usage.key.substring(0, 8)}...`);
      }
    }
  }

  // Get real-time stock quote (optionally using a user's own API key)
  async getStockQuote(symbol: string, opts?: { userId?: string }): Promise<AlphaVantageQuote | null> {
    try {
      const cacheKey = `quote_${symbol.toUpperCase()}`;

      // Check cache first
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Try user-specific API key if provided
      let userKeyModel: any = null;
      let params: any = { function: 'GLOBAL_QUOTE', symbol: symbol.toUpperCase() };

      if (opts?.userId) {
        userKeyModel = await UserApiKey.findActiveKeyForUser(opts.userId, 'alpha_vantage');
        if (userKeyModel) {
          const userKey = UserApiKey.getDecryptedApiKey(userKeyModel);
          params.apikey = userKey;
        }
      }

      const response = await this.client.get('/query', { params });

      const data = response.data;

      if (data['Error Message'] || data['Note']) {
        console.error('Alpha Vantage Error:', data['Error Message'] || data['Note']);
        return null;
      }

      const quote = data['Global Quote'];
      if (!quote) {
        return null;
      }

      const result: AlphaVantageQuote = {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        open: parseFloat(quote['02. open']),
        previousClose: parseFloat(quote['08. previous close']),
        timestamp: quote['07. latest trading day']
      };

      // Cache the result
      this.setCachedData(cacheKey, result);

      // Increment usage for user key if used
      if (userKeyModel && params.apikey) {
        await UserApiKey.incrementUsage(userKeyModel.id);
      }

      return result;
    } catch (error) {
      console.error('Error fetching stock quote:', error);
      return null;
    }
  }

  // Get historical stock data (optionally using a user's own API key)
  async getHistoricalData(symbol: string, period: 'daily' | 'weekly' | 'monthly' = 'daily', opts?: { userId?: string }): Promise<AlphaVantageHistoricalData[]> {
    try {
      const cacheKey = `historical_${symbol.toUpperCase()}_${period}`;

      // Check cache first
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const functionMap = {
        daily: 'TIME_SERIES_DAILY',
        weekly: 'TIME_SERIES_WEEKLY',
        monthly: 'TIME_SERIES_MONTHLY'
      };

      let params: any = {
        function: functionMap[period],
        symbol: symbol.toUpperCase(),
        outputsize: 'compact'
      };

      if (opts?.userId) {
        const userKeyModel = await UserApiKey.findActiveKeyForUser(opts.userId, 'alpha_vantage');
        if (userKeyModel) {
          params.apikey = UserApiKey.getDecryptedApiKey(userKeyModel);
        }
      }

      const response = await this.client.get('/query', { params });

      const data = response.data;

      if (data['Error Message'] || data['Note']) {
        console.error('Alpha Vantage Error:', data['Error Message'] || data['Note']);
        return [];
      }

      const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
      if (!timeSeriesKey) {
        return [];
      }

      const timeSeries = data[timeSeriesKey];
      const result: AlphaVantageHistoricalData[] = [];

      for (const [date, values] of Object.entries(timeSeries)) {
        const dayData = values as any;
        result.push({
          date,
          open: parseFloat(dayData['1. open']),
          high: parseFloat(dayData['2. high']),
          low: parseFloat(dayData['3. low']),
          close: parseFloat(dayData['4. close']),
          volume: parseInt(dayData['5. volume'])
        });
      }

      // Sort by date (newest first)
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Cache the result
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }

  // Search for stocks (optionally using a user's own API key)
  async searchStocks(query: string, opts?: { userId?: string }): Promise<AlphaVantageSearchResult[]> {
    try {
      const cacheKey = `search_${query.toLowerCase()}`;

      // Check cache first
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      let params: any = { function: 'SYMBOL_SEARCH', keywords: query };
      if (opts?.userId) {
        const userKeyModel = await UserApiKey.findActiveKeyForUser(opts.userId, 'alpha_vantage');
        if (userKeyModel) {
          params.apikey = UserApiKey.getDecryptedApiKey(userKeyModel);
        }
      }

      const response = await this.client.get('/query', { params });

      const data = response.data;

      if (data['Error Message'] || data['Note']) {
        console.error('Alpha Vantage Error:', data['Error Message'] || data['Note']);
        return [];
      }

      const matches = data['bestMatches'] || [];
      const result: AlphaVantageSearchResult[] = matches.map((match: any) => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        type: match['3. type'],
        region: match['4. region'],
        marketOpen: match['5. marketOpen'],
        marketClose: match['6. marketClose'],
        timezone: match['7. timezone'],
        currency: match['8. currency'],
        matchScore: match['9. matchScore']
      }));

      // Cache the result
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Error searching stocks:', error);
      return [];
    }
  }

  // Get service status and key usage statistics
  getServiceStatus() {
    const totalKeys = this.keyPool.length;
    const activeKeys = Array.from(this.keyUsage.values()).filter(usage => !usage.isBlocked).length;
    const totalRequests = Array.from(this.keyUsage.values()).reduce((sum, usage) => sum + usage.requestCount, 0);
    const totalDailyRequests = Array.from(this.keyUsage.values()).reduce((sum, usage) => sum + usage.dailyRequestCount, 0);

    return {
      service: 'Alpha Vantage',
      status: activeKeys > 0 ? 'operational' : 'degraded',
      totalKeys,
      activeKeys,
      blockedKeys: totalKeys - activeKeys,
      totalRequests,
      totalDailyRequests,
      cacheSize: this.cache.size,
      keyUsage: Array.from(this.keyUsage.entries()).map(([key, usage]) => ({
        key: `${key.substring(0, 8)}...`,
        requestCount: usage.requestCount,
        dailyRequestCount: usage.dailyRequestCount,
        isBlocked: usage.isBlocked,
        blockUntil: usage.blockUntil
      }))
    };
  }

  // Validate API keys in the pool
  async validateApiKeys(): Promise<{ valid: string[], invalid: string[] }> {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const key of this.keyPool) {
      try {
        const response = await axios.get(`${this.baseUrl}/query`, {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: 'AAPL',
            apikey: key
          },
          timeout: 10000
        });

        if (response.data['Error Message']?.includes('Invalid API call')) {
          invalid.push(key);
        } else {
          valid.push(key);
        }
      } catch (error) {
        invalid.push(key);
      }

      // Add delay between validation requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ API Key Validation: ${valid.length} valid, ${invalid.length} invalid`);
    return { valid, invalid };
  }
}
