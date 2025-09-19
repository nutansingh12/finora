import axios, { AxiosInstance } from 'axios';
import { config } from '@/config';
import { CustomError } from '@/middleware/errorHandler';

export interface YahooStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  dayHigh?: number;
  dayLow?: number;
  week52High?: number;
  week52Low?: number;
  previousClose?: number;
  exchange: string;
  currency: string;
  sector?: string;
  industry?: string;
}

export interface YahooHistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

export interface YahooSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  sector?: string;
  industry?: string;
}

export class YahooFinanceService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.yahooFinance.baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(
      (config) => {
        // Add delay between requests to avoid rate limiting
        return new Promise(resolve => setTimeout(() => resolve(config), 100));
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          throw new CustomError('Rate limit exceeded. Please try again later.', 429);
        }
        throw new CustomError('Yahoo Finance API error', 500);
      }
    );
  }

  // Get real-time stock quote
  async getStockQuote(symbol: string): Promise<YahooStockData | null> {
    try {
      const response = await this.client.get(`/v8/finance/chart/${symbol.toUpperCase()}`);
      
      if (!response.data?.chart?.result?.[0]) {
        return null;
      }

      const result = response.data.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];

      if (!meta || !quote) {
        return null;
      }

      const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
      const previousClose = meta.previousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol: meta.symbol,
        name: meta.longName || meta.shortName || meta.symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: meta.regularMarketVolume || 0,
        marketCap: meta.marketCap,
        dayHigh: meta.regularMarketDayHigh,
        dayLow: meta.regularMarketDayLow,
        week52High: meta.fiftyTwoWeekHigh,
        week52Low: meta.fiftyTwoWeekLow,
        previousClose: previousClose,
        exchange: meta.exchangeName || meta.fullExchangeName || 'Unknown',
        currency: meta.currency || 'USD',
        sector: meta.sector,
        industry: meta.industry
      };
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  // Get multiple stock quotes
  async getMultipleQuotes(symbols: string[]): Promise<YahooStockData[]> {
    const quotes: YahooStockData[] = [];
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(symbol => this.getStockQuote(symbol));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          quotes.push(result.value);
        } else {
          console.error(`Failed to fetch quote for ${batch[index]}`);
        }
      });

      // Add delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return quotes;
  }

  // Get historical data
  async getHistoricalData(
    symbol: string, 
    period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max' = '1y',
    interval: '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo' = '1d'
  ): Promise<YahooHistoricalData[]> {
    try {
      const response = await this.client.get(`/v8/finance/chart/${symbol.toUpperCase()}`, {
        params: {
          period1: this.getPeriodTimestamp(period),
          period2: Math.floor(Date.now() / 1000),
          interval: interval,
          includePrePost: false,
          events: 'div,splits'
        }
      });

      if (!response.data?.chart?.result?.[0]) {
        return [];
      }

      const result = response.data.chart.result[0];
      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0];
      const adjClose = result.indicators?.adjclose?.[0]?.adjclose || [];

      if (!quotes || !timestamps.length) {
        return [];
      }

      const historicalData: YahooHistoricalData[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        if (quotes.open[i] !== null && quotes.high[i] !== null && 
            quotes.low[i] !== null && quotes.close[i] !== null) {
          historicalData.push({
            date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
            open: quotes.open[i],
            high: quotes.high[i],
            low: quotes.low[i],
            close: quotes.close[i],
            adjClose: adjClose[i] || quotes.close[i],
            volume: quotes.volume[i] || 0
          });
        }
      }

      return historicalData;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  // Search stocks
  async searchStocks(query: string, limit: number = 10): Promise<YahooSearchResult[]> {
    try {
      const response = await this.client.get('/v1/finance/search', {
        params: {
          q: query,
          quotesCount: limit,
          newsCount: 0,
          enableFuzzyQuery: false,
          quotesQueryId: 'tss_match_phrase_query',
          multiQuoteQueryId: 'multi_quote_single_token_query'
        }
      });

      if (!response.data?.quotes) {
        return [];
      }

      return response.data.quotes
        .filter((quote: any) => quote.symbol && quote.shortname)
        .map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          exchange: quote.exchange || 'Unknown',
          type: this.mapQuoteType(quote.quoteType),
          sector: quote.sector,
          industry: quote.industry
        }))
        .slice(0, limit);
    } catch (error) {
      console.error(`Error searching stocks for query "${query}":`, error);
      return [];
    }
  }

  // Get trending stocks
  async getTrendingStocks(region: string = 'US', limit: number = 20): Promise<YahooSearchResult[]> {
    try {
      const response = await this.client.get(`/v1/finance/trending/${region}`);
      
      if (!response.data?.finance?.result?.[0]?.quotes) {
        return [];
      }

      const quotes = response.data.finance.result[0].quotes;
      
      return quotes
        .slice(0, limit)
        .map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.shortName || quote.longName || quote.symbol,
          exchange: quote.fullExchangeName || quote.exchange || 'Unknown',
          type: this.mapQuoteType(quote.quoteType),
          sector: quote.sector,
          industry: quote.industry
        }));
    } catch (error) {
      console.error(`Error fetching trending stocks:`, error);
      return [];
    }
  }

  // Get stock profile/info
  async getStockProfile(symbol: string): Promise<any> {
    try {
      const response = await this.client.get(`/v10/finance/quoteSummary/${symbol.toUpperCase()}`, {
        params: {
          modules: 'assetProfile,summaryProfile,companyOfficers,summaryDetail,defaultKeyStatistics'
        }
      });

      return response.data?.quoteSummary?.result?.[0] || null;
    } catch (error) {
      console.error(`Error fetching profile for ${symbol}:`, error);
      return null;
    }
  }

  // Helper method to get period timestamp
  private getPeriodTimestamp(period: string): number {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    switch (period) {
      case '1d': return Math.floor((now - day) / 1000);
      case '5d': return Math.floor((now - 5 * day) / 1000);
      case '1mo': return Math.floor((now - 30 * day) / 1000);
      case '3mo': return Math.floor((now - 90 * day) / 1000);
      case '6mo': return Math.floor((now - 180 * day) / 1000);
      case '1y': return Math.floor((now - 365 * day) / 1000);
      case '2y': return Math.floor((now - 2 * 365 * day) / 1000);
      case '5y': return Math.floor((now - 5 * 365 * day) / 1000);
      case '10y': return Math.floor((now - 10 * 365 * day) / 1000);
      case 'ytd': {
        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        return Math.floor(yearStart.getTime() / 1000);
      }
      case 'max': return 0;
      default: return Math.floor((now - 365 * day) / 1000);
    }
  }

  // Helper method to map quote types
  private mapQuoteType(quoteType: string): string {
    switch (quoteType?.toLowerCase()) {
      case 'equity': return 'stock';
      case 'etf': return 'etf';
      case 'mutualfund': return 'mutual_fund';
      default: return 'stock';
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      const quote = await this.getStockQuote('AAPL');
      return quote !== null;
    } catch (error) {
      console.error('Yahoo Finance API connection test failed:', error);
      return false;
    }
  }
}
