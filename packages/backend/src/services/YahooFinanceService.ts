import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';

export interface YahooStockData {
  symbol: string;
  longName?: string;
  shortName?: string;
  exchange: string;
  sector?: string;
  industry?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap?: number;
  trailingPE?: number;
  dividendYield?: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  quoteType?: string;
  beta?: number;
  bookValue?: number;
  priceToBook?: number;
  earningsPerShare?: number;
  revenuePerShare?: number;
  profitMargins?: number;
  floatShares?: number;
  sharesOutstanding?: number;
  heldPercentInsiders?: number;
  heldPercentInstitutions?: number;
  impliedSharesOutstanding?: number;
  forwardPE?: number;
  pegRatio?: number;
  enterpriseValue?: number;
  priceToSalesTrailing12Months?: number;
  enterpriseToRevenue?: number;
  enterpriseToEbitda?: number;
}

export interface YahooHistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export interface YahooSearchResult {
  symbol: string;
  longName?: string;
  shortName?: string;
  exchange: string;
  quoteType?: string;
  sector?: string;
  industry?: string;
}

export class YahooFinanceService {
  private client: AxiosInstance;
  // Be defensive: optional chain to avoid type mismatches during build
  private baseUrl = ((config as any)?.yahooFinance?.baseUrl as string) || 'https://query1.finance.yahoo.com';
  private requestDelay = 200; // 200ms delay between requests for better rate limiting
  private requestCount: number = 0;
  private requestWindow: number = 60000; // 1 minute window
  private maxRequestsPerWindow: number = 100; // Max 100 requests per minute
  private requestTimes: number[] = [];
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 60000; // 1 minute cache

  constructor() {
    // Check if commercial API key is available
    const commercialApiKey = ((config as any)?.yahooFinance?.apiKey as string) || process.env.YAHOO_FINANCE_API_KEY || '';
    const rapidToggle = ((config as any)?.yahooFinance?.useRapidApi === true) || process.env.YAHOO_USE_RAPIDAPI === 'true';
    const useCommercialAPI = rapidToggle && !!commercialApiKey;

    // Set base URL based on API type
    const baseURL = useCommercialAPI
      ? 'https://yahoo-finance1.p.rapidapi.com'
      : this.baseUrl;

    // Set headers based on API type
    const headers: Record<string, string> = useCommercialAPI ? {
      'X-RapidAPI-Key': commercialApiKey,
      'X-RapidAPI-Host': 'yahoo-finance1.p.rapidapi.com',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    } : {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    this.client = axios.create({
      baseURL,
      timeout: 15000,
      headers
    });

    // Log API type being used
    console.log(`Yahoo Finance Service initialized with ${useCommercialAPI ? 'Commercial' : 'Public'} API`);

    if (useCommercialAPI) {
      console.log('✅ Using licensed Yahoo Finance API - Safe for commercial use');
    } else {
      console.warn('⚠️  Using public Yahoo Finance endpoints - NOT suitable for commercial deployment');
    }

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.enforceRateLimit();
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.handleApiError(error);

        // Handle commercial API specific errors
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please upgrade your API plan or wait before making more requests.');
        }
        if (error.response?.status === 403 && useCommercialAPI) {
          throw new Error('API key invalid or subscription expired. Please check your RapidAPI subscription.');
        }

        return Promise.reject(error);
      }
    );
  }

  // Get stock quote with caching
  async getStockQuote(symbol: string): Promise<YahooStockData | null> {
    try {
      const cacheKey = `quote_${symbol.toUpperCase()}`;

      // Check cache first
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const response = await this.client.get(`/v8/finance/chart/${symbol.toUpperCase()}`);
      const data = response.data;

      if (!data.chart?.result?.[0]) {
        return null;
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];

      if (!meta || !quote) {
        return null;
      }

      const stockData: YahooStockData = {
        symbol: meta.symbol,
        longName: meta.longName,
        shortName: meta.shortName,
        exchange: meta.exchangeName || meta.fullExchangeName || 'UNKNOWN',
        sector: meta.sector,
        industry: meta.industry,
        regularMarketPrice: meta.regularMarketPrice || 0,
        regularMarketChange: meta.regularMarketPrice - meta.previousClose || 0,
        regularMarketChangePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100) || 0,
        regularMarketVolume: meta.regularMarketVolume || 0,
        marketCap: meta.marketCap,
        trailingPE: meta.trailingPE,
        dividendYield: meta.dividendYield,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
        fiftyDayAverage: meta.fiftyDayAverage,
        twoHundredDayAverage: meta.twoHundredDayAverage,
        quoteType: meta.quoteType,
        beta: meta.beta,
        bookValue: meta.bookValue,
        priceToBook: meta.priceToBook,
        earningsPerShare: meta.epsTrailingTwelveMonths,
        revenuePerShare: meta.revenuePerShare,
        profitMargins: meta.profitMargins,
        floatShares: meta.floatShares,
        sharesOutstanding: meta.sharesOutstanding,
        heldPercentInsiders: meta.heldPercentInsiders,
        heldPercentInstitutions: meta.heldPercentInstitutions,
        impliedSharesOutstanding: meta.impliedSharesOutstanding,
        forwardPE: meta.forwardPE,
        pegRatio: meta.pegRatio,
        enterpriseValue: meta.enterpriseValue,
        priceToSalesTrailing12Months: meta.priceToSalesTrailing12Months,
        enterpriseToRevenue: meta.enterpriseToRevenue,
        enterpriseToEbitda: meta.enterpriseToEbitda
      };

      // Cache the result
      this.setCachedData(cacheKey, stockData);

      return stockData;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  // Get multiple stock quotes
  async getMultipleQuotes(symbols: string[]): Promise<YahooStockData[]> {
    const quotes: YahooStockData[] = [];
    
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(symbol => this.getStockQuote(symbol));
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(result => {
        if (result) {
          quotes.push(result);
        }
      });

      // Delay between batches
      if (i + batchSize < symbols.length) {
        await this.delay(500);
      }
    }

    return quotes;
  }

  // Get historical data with caching
  async getHistoricalData(
    symbol: string,
    period: string = '1y',
    interval: string = '1d'
  ): Promise<YahooHistoricalData[]> {
    try {
      const cacheKey = `historical_${symbol.toUpperCase()}_${period}_${interval}`;

      // Check cache first (longer cache time for historical data)
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (this.cacheTimeout * 5)) { // 5 minutes cache for historical
        return cached.data;
      }

      const response = await this.client.get(`/v8/finance/chart/${symbol.toUpperCase()}`, {
        params: {
          range: period,
          interval: interval,
          includePrePost: false,
          events: 'div,splits'
        }
      });

      const data = response.data;
      if (!data.chart?.result?.[0]) {
        return [];
      }

      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const quote = result.indicators?.quote?.[0];
      const adjClose = result.indicators?.adjclose?.[0]?.adjclose;

      if (!timestamps || !quote) {
        return [];
      }

      const historicalData: YahooHistoricalData[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const t = timestamps?.[i] ?? 0;
        const open = quote.open?.[i] ?? null;
        const high = quote.high?.[i] ?? null;
        const low = quote.low?.[i] ?? null;
        const close = quote.close?.[i] ?? null;
        const volume = quote.volume?.[i] ?? 0;
        const adj = adjClose?.[i] ?? close;
        if (open !== null && close !== null) {
          historicalData.push({
            date: new Date(t * 1000).toISOString().split('T')[0] as string,
            open: open as number,
            high: (high as number) ?? (close as number),
            low: (low as number) ?? (close as number),
            close: close as number,
            volume: volume,
            adjClose: adj as number
          });
        }
      }

      // Cache the result with longer TTL
      this.cache.set(cacheKey, {
        data: historicalData,
        timestamp: Date.now()
      });

      return historicalData;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  // Search symbols with caching
  async searchSymbols(query: string, limit: number = 10): Promise<YahooSearchResult[]> {
    try {
      const cacheKey = `search_${query.toLowerCase()}_${limit}`;

      // Check cache first (longer cache for search results)
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (this.cacheTimeout * 10)) { // 10 minutes cache for search
        return cached.data;
      }

      const response = await this.client.get('/v1/finance/search', {
        params: {
          q: query,
          quotesCount: limit,
          newsCount: 0,
          enableFuzzyQuery: false,
          quotesQueryId: 'tss_match_phrase_query'
        }
      });

      const data = response.data;
      if (!data.quotes) {
        return [];
      }

      const searchResults = data.quotes
        .filter((quote: any) => quote.symbol && quote.quoteType) // Filter out invalid results
        .map((quote: any) => ({
          symbol: quote.symbol,
          longName: quote.longname,
          shortName: quote.shortname,
          exchange: quote.exchange,
          quoteType: quote.quoteType,
          sector: quote.sector,
          industry: quote.industry
        }));

      // Cache the result
      this.cache.set(cacheKey, {
        data: searchResults,
        timestamp: Date.now()
      });

      return searchResults;
    } catch (error) {
      console.error(`Error searching symbols for "${query}":`, error);
      return [];
    }
  }

  // Get trending stocks
  async getTrendingStocks(limit: number = 20): Promise<YahooSearchResult[]> {
    try {
      await this.delay();

      const response = await this.client.get('/v1/finance/trending/US');
      const data = response.data;

      if (!data.finance?.result?.[0]?.quotes) {
        return [];
      }

      const quotes = data.finance.result[0].quotes.slice(0, limit);
      
      return quotes.map((quote: any) => ({
        symbol: quote.symbol,
        longName: quote.longName,
        shortName: quote.shortName,
        exchange: quote.fullExchangeName || quote.exchange,
        quoteType: quote.quoteType,
        sector: quote.sector,
        industry: quote.industry
      }));
    } catch (error) {
      console.error('Error fetching trending stocks:', error);
      return [];
    }
  }

  // Get market summary
  async getMarketSummary(): Promise<any[]> {
    try {
      await this.delay();

      const response = await this.client.get('/v6/finance/quote/marketSummary');
      const data = response.data;

      if (!data.marketSummaryResponse?.result) {
        return [];
      }

      return data.marketSummaryResponse.result;
    } catch (error) {
      console.error('Error fetching market summary:', error);
      return [];
    }
  }

  // Get options data
  async getOptionsData(symbol: string): Promise<any> {
    try {
      await this.delay();

      const response = await this.client.get(`/v7/finance/options/${symbol}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching options data for ${symbol}:`, error);
      return null;
    }
  }

  // Validate symbol
  async validateSymbol(symbol: string): Promise<boolean> {
    const quote = await this.getStockQuote(symbol);
    return quote !== null;
  }

  // Get exchange rate
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    try {
      await this.delay();

      const symbol = `${fromCurrency}${toCurrency}=X`;
      const quote = await this.getStockQuote(symbol);
      
      return quote?.regularMarketPrice || null;
    } catch (error) {
      console.error(`Error fetching exchange rate ${fromCurrency}/${toCurrency}:`, error);
      return null;
    }
  }

  // Enhanced rate limiting
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    // Clean old request times
    this.requestTimes = this.requestTimes.filter(time => now - time < this.requestWindow);

    // Check if we're at the limit
    if (this.requestTimes.length >= this.maxRequestsPerWindow) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = this.requestWindow - (now - oldestRequest);

      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
        await this.delay(waitTime);
      }
    }

    // Add current request time
    this.requestTimes.push(now);

    // Add standard delay between requests
    await this.delay();
  }

  // Cache management
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Remove expired cache entry
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Error handling
  private handleApiError(error: AxiosError): void {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.statusText;

      switch (status) {
        case 429:
          console.error('Yahoo Finance API rate limit exceeded');
          break;
        case 404:
          console.error('Yahoo Finance API endpoint not found');
          break;
        case 500:
          console.error('Yahoo Finance API server error');
          break;
        default:
          console.error(`Yahoo Finance API error: ${status} - ${message}`);
      }
    } else if (error.request) {
      console.error('Yahoo Finance API request failed - no response received');
    } else {
      console.error('Yahoo Finance API request setup error:', error.message);
    }
  }

  // Enhanced delay method
  private async delay(ms: number = this.requestDelay): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get rate limit info
  getRateLimitInfo(): { requestDelay: number; batchSize: number; requestsInWindow: number } {
    const now = Date.now();
    const recentRequests = this.requestTimes.filter(time => now - time < this.requestWindow);

    return {
      requestDelay: this.requestDelay,
      batchSize: 5,
      requestsInWindow: recentRequests.length
    };
  }

  // Update rate limit settings
  updateRateLimit(delayMs: number): void {
    this.requestDelay = Math.max(50, delayMs); // Minimum 50ms delay
  }

  // Clear cache method
  public clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
