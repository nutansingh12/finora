import { YahooFinanceService, YahooStockData, YahooHistoricalData, YahooSearchResult } from './YahooFinanceService';
import { StockPriceService } from './StockPriceService';
import { Stock } from '../models/Stock';
import { StockPrice } from '../models/StockPrice';
import { config } from '../config';

export interface MarketSummary {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketState: string;
}

export interface StockAnalysis {
  symbol: string;
  currentPrice: number;
  priceTarget?: number;
  recommendation?: string;
  analystCount?: number;
  strongBuy?: number;
  buy?: number;
  hold?: number;
  sell?: number;
  strongSell?: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  description?: string;
  sector?: string;
  industry?: string;
  website?: string;
  employees?: number;
  headquarters?: string;
  founded?: string;
  ceo?: string;
}

/**
 * Enhanced Yahoo Finance Integration Service
 * Provides comprehensive stock market data integration with advanced features
 */
export class YahooFinanceIntegrationService {
  private yahooService: YahooFinanceService;
  private stockPriceService: StockPriceService;
  private batchSize: number = 10;
  private maxRetries: number = 3;

  constructor() {
    this.yahooService = new YahooFinanceService();
    this.stockPriceService = new StockPriceService();
  }

  /**
   * Get comprehensive stock data including fundamentals
   */
  async getComprehensiveStockData(symbol: string): Promise<YahooStockData | null> {
    try {
      const stockData = await this.yahooService.getStockQuote(symbol);
      
      if (!stockData) {
        return null;
      }

      // Enrich with additional data if needed
      return stockData;
    } catch (error) {
      console.error(`Error getting comprehensive stock data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get market summary for major indices
   */
  async getMarketSummary(): Promise<MarketSummary[]> {
    try {
      const indices = ['^GSPC', '^DJI', '^IXIC', '^RUT']; // S&P 500, Dow, NASDAQ, Russell 2000
      const summaryData: MarketSummary[] = [];

      for (const symbol of indices) {
        const data = await this.yahooService.getStockQuote(symbol);
        if (data) {
          summaryData.push({
            symbol: data.symbol,
            name: data.longName || data.shortName || symbol,
            price: data.regularMarketPrice,
            change: data.regularMarketChange,
            changePercent: data.regularMarketChangePercent,
            marketState: 'REGULAR' // Could be enhanced to get actual market state
          });
        }
      }

      return summaryData;
    } catch (error) {
      console.error('Error getting market summary:', error);
      return [];
    }
  }

  /**
   * Batch update stock prices for multiple symbols
   */
  async batchUpdateStockPrices(symbols: string[]): Promise<{ success: string[]; failed: string[] }> {
    const results: { success: string[]; failed: string[] } = { success: [], failed: [] };
    
    try {
      // Process in batches to avoid rate limiting
      for (let i = 0; i < symbols.length; i += this.batchSize) {
        const batch = symbols.slice(i, i + this.batchSize);
        
        const batchPromises = batch.map(async (symbol) => {
          try {
            const stockData = await this.yahooService.getStockQuote(symbol);
            
            if (stockData) {
              // Find or create stock in database
              let stock = await Stock.findBySymbol(symbol);
              
              if (!stock) {
                stock = await Stock.upsertStock({
                  symbol: stockData.symbol,
                  name: stockData.longName || stockData.shortName || symbol,
                  exchange: stockData.exchange,
                  sector: stockData.sector,
                  industry: stockData.industry
                });
              }

              if (stock) {
                // Update stock price
                await this.stockPriceService.updateStockPrice(stock.id, stockData);
                results.success.push(symbol);
              } else {
                results.failed.push(symbol);
              }
            } else {
              results.failed.push(symbol);
            }
          } catch (error) {
            console.error(`Error updating stock ${symbol}:`, error);
            results.failed.push(symbol);
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches
        if (i + this.batchSize < symbols.length) {
          await this.delay(500);
        }
      }
    } catch (error) {
      console.error('Error in batch update:', error);
    }

    return results;
  }

  /**
   * Get trending stocks
   */
  async getTrendingStocks(region: string = 'US'): Promise<YahooStockData[]> {
    try {
      // Yahoo Finance trending endpoint
      const response = await this.yahooService['client'].get('/v1/finance/trending/' + region);
      const data = response.data;

      if (!data.finance?.result?.[0]?.quotes) {
        return [];
      }

      const trendingSymbols = data.finance.result[0].quotes
        .map((quote: any) => quote.symbol)
        .slice(0, 20); // Limit to top 20

      // Get detailed data for trending symbols
      const trendingData: YahooStockData[] = [];
      
      for (const symbol of trendingSymbols) {
        const stockData = await this.yahooService.getStockQuote(symbol);
        if (stockData) {
          trendingData.push(stockData);
        }
      }

      return trendingData;
    } catch (error) {
      console.error('Error getting trending stocks:', error);
      return [];
    }
  }

  /**
   * Get stock recommendations/analysis
   */
  async getStockAnalysis(symbol: string): Promise<StockAnalysis | null> {
    try {
      // This would typically require a premium API or web scraping
      // For now, return basic analysis based on available data
      const stockData = await this.yahooService.getStockQuote(symbol);
      
      if (!stockData) {
        return null;
      }

      return {
        symbol: stockData.symbol,
        currentPrice: stockData.regularMarketPrice,
        // These would come from actual analyst data
        priceTarget: undefined,
        recommendation: undefined,
        analystCount: undefined,
        strongBuy: undefined,
        buy: undefined,
        hold: undefined,
        sell: undefined,
        strongSell: undefined
      };
    } catch (error) {
      console.error(`Error getting stock analysis for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Validate multiple stock symbols
   */
  async validateSymbols(symbols: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    const results: { valid: string[]; invalid: string[] } = { valid: [], invalid: [] };
    
    for (const symbol of symbols) {
      try {
        const isValid = await this.yahooService.validateSymbol(symbol);
        if (isValid) {
          results.valid.push(symbol);
        } else {
          results.invalid.push(symbol);
        }
      } catch (error) {
        results.invalid.push(symbol);
      }
    }

    return results;
  }

  /**
   * Get currency exchange rates
   */
  async getExchangeRates(baseCurrency: string = 'USD'): Promise<{ [key: string]: number }> {
    const currencies = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
    const rates: { [key: string]: number } = {};

    for (const currency of currencies) {
      if (currency !== baseCurrency) {
        try {
          const rate = await this.yahooService.getExchangeRate(baseCurrency, currency);
          if (rate) {
            rates[currency] = rate;
          }
        } catch (error) {
          console.error(`Error getting exchange rate for ${baseCurrency}/${currency}:`, error);
        }
      }
    }

    return rates;
  }

  /**
   * Get service health and statistics
   */
  getServiceHealth(): {
    status: string;
    rateLimitInfo: any;
    cacheStats: any;
    lastUpdate: Date;
  } {
    return {
      status: 'healthy',
      rateLimitInfo: this.yahooService.getRateLimitInfo(),
      cacheStats: this.yahooService.getCacheStats(),
      lastUpdate: new Date()
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.yahooService.clearCache();
  }

  /**
   * Private helper method for delays
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
