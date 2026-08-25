import { StockPrice } from '@/models/StockPrice';
import { RollingAnalysis } from '@/models/RollingAnalysis';
import { AlphaVantageService, AlphaVantageQuote } from '@/services/AlphaVantageService';
import { YahooFinanceService } from '@/services/YahooFinanceService';

export class StockPriceService {
  private alphaVantageService: AlphaVantageService;
  private yahooService: YahooFinanceService;

  constructor() {
    this.alphaVantageService = new AlphaVantageService();
    this.yahooService = new YahooFinanceService();
  }

  // Update stock price with latest data (accepts AlphaVantage or Yahoo-shaped quotes)
  async updateStockPrice(stockId: string, quote: any): Promise<void> {
    try {
      const price = quote.price ?? quote.regularMarketPrice;
      const change = quote.change ?? quote.regularMarketChange ?? 0;
      const changePercent = quote.changePercent ?? quote.regularMarketChangePercent ?? 0;
      const volume = quote.volume ?? quote.regularMarketVolume ?? 0;
      const marketCap = quote.marketCap;
      const peRatio = quote.peRatio ?? quote.trailingPE;
      const dividendYield = quote.dividendYield;
      const fiftyDayAverage = quote.fiftyDayAverage;
      const twoHundredDayAverage = quote.twoHundredDayAverage;

      await StockPrice.createPrice({
        stock_id: stockId,
        price,
        change,
        change_percent: changePercent,
        volume,
        market_cap: marketCap,
        pe_ratio: peRatio,
        dividend_yield: dividendYield,
        fifty_two_week_low: quote.fiftyTwoWeekLow ?? 0,
        fifty_two_week_high: quote.fiftyTwoWeekHigh ?? 0,
        fifty_day_avg: fiftyDayAverage,
        two_hundred_day_avg: twoHundredDayAverage,
        is_latest: true
      });

      // Pass Yahoo-provided 52W low directly — avoids needing a full year of DB history
      await this.updateRollingAnalysis(stockId, {
        symbol: quote.symbol,
        currentPrice: price,
        week52Low: quote.fiftyTwoWeekLow,
      });
    } catch (error) {
      console.error(`Error updating stock price for ${stockId}:`, error);
      throw error;
    }
  }

  // Update rolling analysis using Yahoo historical data for accurate lows
  async updateRollingAnalysis(stockId: string, hint?: { symbol?: string; currentPrice?: number; week52Low?: number }): Promise<void> {
    try {
      // Resolve current price
      let currentPrice = hint?.currentPrice;
      if (!currentPrice) {
        const latest = await StockPrice.getLatestPrice(stockId);
        currentPrice = latest?.price ?? 0;
      }
      if (!currentPrice) return;

      let week52Low: number | undefined = hint?.week52Low;
      let week24Low: number | undefined;
      let week12Low: number | undefined;

      // Fetch 1Y historical from Yahoo to compute accurate 24W/12W (and 52W if not provided)
      if (hint?.symbol) {
        try {
          const history = await this.yahooService.getHistoricalData(hint.symbol, '1y', '1d');
          if (history && history.length > 0) {
            const closes = history.map(d => d.close).filter(v => v > 0);
            const slice = (weeks: number) => closes.slice(0, Math.min(weeks * 5, closes.length));
            if (!week52Low) week52Low = Math.min(...closes);
            week24Low = Math.min(...slice(24));
            week12Low = Math.min(...slice(12));
          }
        } catch {
          // non-fatal — fall through to DB-based fallback
        }
      }

      // Fallback: compute from whatever price history we have in DB
      if (!week52Low || !week24Low || !week12Low) {
        const prices = await StockPrice.getHistoricalPrices(stockId, 365);
        if (prices.length > 0) {
          const vals = prices.map(p => p.price);
          week52Low = week52Low ?? Math.min(...vals);
          week24Low = week24Low ?? Math.min(...vals.slice(0, Math.min(168, vals.length)));
          week12Low = week12Low ?? Math.min(...vals.slice(0, Math.min(84, vals.length)));
        }
      }

      if (!week52Low) return;
      week24Low = week24Low ?? week52Low;
      week12Low = week12Low ?? week52Low;

      const pctAbove = (low: number) => low > 0 ? ((currentPrice! - low) / low) * 100 : 0;

      const volatility = this.calculateVolatilityFromHistory(hint?.symbol);
      const trend = await this.calculateTrendFromHistory(hint?.symbol);

      await RollingAnalysis.upsertAnalysis({
        stock_id: stockId,
        current_price: currentPrice,
        week_52_low: week52Low,
        week_24_low: week24Low,
        week_12_low: week12Low,
        percent_above_52w_low: pctAbove(week52Low),
        percent_above_24w_low: pctAbove(week24Low),
        percent_above_12w_low: pctAbove(week12Low),
        volatility: 0,
        trend_direction: trend,
        trend_strength: 0,
      });
    } catch (error) {
      console.error(`Error updating rolling analysis for ${stockId}:`, error);
      throw error;
    }
  }

  // Bulk update stock prices
  async bulkUpdateStockPrices(stockIds: string[]): Promise<void> {
    const batchSize = 10;
    
    for (let i = 0; i < stockIds.length; i += batchSize) {
      const batch = stockIds.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (stockId) => {
          try {
            // Get stock symbol
            const stock = await StockPrice.db('stocks')
              .select('symbol')
              .where('id', stockId)
              .first();

            if (!stock) {
              console.warn(`Stock not found for ID: ${stockId}`);
              return;
            }

            // Fetch latest data from Alpha Vantage
            const stockData = await this.alphaVantageService.getStockQuote(stock.symbol);

            if (stockData) {
              await this.updateStockPrice(stockId, stockData);
            }
          } catch (error) {
            console.error(`Error updating stock ${stockId}:`, error);
          }
        })
      );

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < stockIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Get current price for a stock
  async getCurrentPrice(stockId: string): Promise<number | null> {
    try {
      const latestPrice = await StockPrice.getLatestPrice(stockId);
      return latestPrice?.price || null;
    } catch (error) {
      console.error(`Error getting current price for ${stockId}:`, error);
      return null;
    }
  }

  // Get price history for a stock
  async getPriceHistory(
    stockId: string,
    days: number = 30
  ): Promise<Array<{ date: Date; price: number; volume: number }>> {
    try {
      return await StockPrice.getHistoricalPrices(stockId, days);
    } catch (error) {
      console.error(`Error getting price history for ${stockId}:`, error);
      return [];
    }
  }

  // Calculate price change over period
  async calculatePriceChange(
    stockId: string,
    days: number
  ): Promise<{ change: number; changePercent: number } | null> {
    try {
      const prices = await StockPrice.getHistoricalPrices(stockId, days + 1);
      
      if (prices.length < 2) {
        return null;
      }

      const currentPrice = prices[0]?.price ?? 0;
      const pastPrice = prices[prices.length - 1]?.price ?? 0;
      
      const change = currentPrice - pastPrice;
      const changePercent = (change / pastPrice) * 100;

      return { change, changePercent };
    } catch (error) {
      console.error(`Error calculating price change for ${stockId}:`, error);
      return null;
    }
  }

  // Get stocks near 52-week lows
  async getStocksNearLows(
    threshold: number = 10,
    limit: number = 50
  ): Promise<Array<{
    stockId: string;
    symbol: string;
    name: string;
    currentPrice: number;
    percentAboveLow: number;
  }>> {
    try {
      return await RollingAnalysis.getStocksNearLows(threshold, limit);
    } catch (error) {
      console.error('Error getting stocks near lows:', error);
      return [];
    }
  }

  private calculateVolatilityFromHistory(_symbol?: string): number {
    return 0;
  }

  private async calculateTrendFromHistory(_symbol?: string): Promise<'up' | 'down' | 'sideways'> {
    return 'sideways';
  }

  // Clean up old price data
  async cleanupOldPrices(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      return await StockPrice.db('stock_prices')
        .where('created_at', '<', cutoffDate)
        .where('is_latest', false)
        .del();
    } catch (error) {
      console.error('Error cleaning up old prices:', error);
      return 0;
    }
  }

  // Get price statistics
  async getPriceStatistics(stockId: string): Promise<{
    currentPrice: number;
    dayHigh: number;
    dayLow: number;
    weekHigh: number;
    weekLow: number;
    monthHigh: number;
    monthLow: number;
    yearHigh: number;
    yearLow: number;
  } | null> {
    try {
      const prices = await StockPrice.getHistoricalPrices(stockId, 365);
      
      if (prices.length === 0) {
        return null;
      }

      const currentPrice = prices[0]?.price ?? 0;
      const dayPrices = prices.slice(0, 1);
      const weekPrices = prices.slice(0, 7);
      const monthPrices = prices.slice(0, 30);
      const yearPrices = prices;

      return {
        currentPrice,
        dayHigh: Math.max(...dayPrices.map(p => p.price)),
        dayLow: Math.min(...dayPrices.map(p => p.price)),
        weekHigh: Math.max(...weekPrices.map(p => p.price)),
        weekLow: Math.min(...weekPrices.map(p => p.price)),
        monthHigh: Math.max(...monthPrices.map(p => p.price)),
        monthLow: Math.min(...monthPrices.map(p => p.price)),
        yearHigh: Math.max(...yearPrices.map(p => p.price)),
        yearLow: Math.min(...yearPrices.map(p => p.price))
      };
    } catch (error) {
      console.error(`Error getting price statistics for ${stockId}:`, error);
      return null;
    }
  }
}
