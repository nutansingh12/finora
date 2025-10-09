import { StockPrice } from '@/models/StockPrice';
import { RollingAnalysis } from '@/models/RollingAnalysis';
import { AlphaVantageService, AlphaVantageQuote } from '@/services/AlphaVantageService';

export class StockPriceService {
  private alphaVantageService: AlphaVantageService;

  constructor() {
    this.alphaVantageService = new AlphaVantageService();
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
      const fiftyTwoWeekLow = quote.fiftyTwoWeekLow;
      const fiftyTwoWeekHigh = quote.fiftyTwoWeekHigh;
      const fiftyDayAverage = quote.fiftyDayAverage;
      const twoHundredDayAverage = quote.twoHundredDayAverage;

      // Create new price record
      await StockPrice.createPrice({
        stock_id: stockId,
        price,
        change,
        change_percent: changePercent,
        volume,
        market_cap: marketCap,
        pe_ratio: peRatio,
        dividend_yield: dividendYield,
        fifty_two_week_low: fiftyTwoWeekLow,
        fifty_two_week_high: fiftyTwoWeekHigh,
        fifty_day_avg: fiftyDayAverage,
        two_hundred_day_avg: twoHundredDayAverage,
        is_latest: true
      });

      // Update rolling analysis
      await this.updateRollingAnalysis(stockId);
    } catch (error) {
      console.error(`Error updating stock price for ${stockId}:`, error);
      throw error;
    }
  }

  // Update rolling analysis for a stock
  async updateRollingAnalysis(stockId: string): Promise<void> {
    try {
      // Get historical prices for analysis
      const prices = await StockPrice.getHistoricalPrices(stockId, 365); // Get 1 year of data
      
      if (prices.length === 0) {
        return;
      }

      const currentPrice = prices[0]?.price ?? 0;
      
      // Calculate rolling lows
      const fiftyTwoWeekLow = this.calculateRollingLow(prices, 365);
      const twentyFourWeekLow = this.calculateRollingLow(prices, 168);
      const twelveWeekLow = this.calculateRollingLow(prices, 84);

      // Calculate percentages above lows
      const percentAbove52WLow = ((currentPrice - fiftyTwoWeekLow) / currentPrice) * 100;
      const percentAbove24WLow = ((currentPrice - twentyFourWeekLow) / currentPrice) * 100;
      const percentAbove12WLow = ((currentPrice - twelveWeekLow) / currentPrice) * 100;

      // Calculate volatility (standard deviation of returns)
      const volatility = this.calculateVolatility(prices);

      // Calculate trend (simple moving average slope)
      const trend = this.calculateTrend(prices, 20);

      // Create or update rolling analysis
      await RollingAnalysis.upsertAnalysis({
        stock_id: stockId,
        week_52_low: fiftyTwoWeekLow,
        week_24_low: twentyFourWeekLow,
        week_12_low: twelveWeekLow,
        percent_above_52w_low: percentAbove52WLow,
        percent_above_24w_low: percentAbove24WLow,
        percent_above_12w_low: percentAbove12WLow,
        volatility: volatility,
        trend_direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'sideways',
        trend_strength: Math.abs(trend)
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

  // Private helper methods

  private calculateRollingLow(prices: Array<{ price: number }>, days: number): number {
    const relevantPrices = prices.slice(0, Math.min(days, prices.length));
    return Math.min(...relevantPrices.map(p => p.price));
  }

  private calculateVolatility(prices: Array<{ price: number }>): number {
    if (prices.length < 2) return 0;

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const dailyReturn = ((prices[i - 1]?.price ?? 0) - (prices[i]?.price ?? 0)) / ((prices[i]?.price ?? 1));
      returns.push(dailyReturn);
    }

    // Calculate standard deviation of returns
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
  }

  private calculateTrend(prices: Array<{ price: number }>, period: number): number {
    if (prices.length < period) return 0;

    const recentPrices = prices.slice(0, period);
    const n = recentPrices.length;
    
    // Calculate linear regression slope
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = recentPrices[i]?.price ?? 0;
      
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
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
