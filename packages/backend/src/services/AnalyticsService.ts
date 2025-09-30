import { BaseModel } from '../models/BaseModel';
import { RollingAnalysis } from '../models/RollingAnalysis';
import { StockPrice } from '../models/StockPrice';
import { UserStock } from '../models/UserStock';
// import removed: HistoricalData not used; using StockPrice instead

export interface PortfolioAnalytics {
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  stockCount: number;
  valueDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  topPerformers: Array<{
    symbol: string;
    name: string;
    change: number;
    changePercent: number;
  }>;
  worstPerformers: Array<{
    symbol: string;
    name: string;
    change: number;
    changePercent: number;
  }>;
  sectorDistribution: Array<{
    sector: string;
    count: number;
    value: number;
    percentage: number;
  }>;
  riskMetrics: {
    portfolioVolatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    beta: number;
  };
}

export interface ValueOpportunity {
  stockId: string;
  symbol: string;
  name: string;
  currentPrice: number;
  percentAbove52WLow: number;
  percentAbove24WLow: number;
  percentAbove12WLow: number;
  valueScore: number;
  recommendation: 'excellent' | 'good' | 'fair' | 'poor';
  targetPrice?: number;
  potentialUpside?: number;
}

export interface TrendAnalysis {
  period: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  support: number;
  resistance: number;
  momentum: number;
  rsi: number;
  macd: {
    signal: number;
    histogram: number;
    line: number;
  };
}

export class AnalyticsService {
  // Calculate comprehensive portfolio analytics
  static async calculatePortfolioAnalytics(userId: string): Promise<PortfolioAnalytics> {
    const userStocks = await UserStock.getUserStocks(userId);

    let totalValue = 0;
    let totalChange = 0;
    const performers: Array<{ symbol: string; name: string; change: number; changePercent: number }> = [];
    const sectorMap = new Map<string, { count: number; value: number }>();
    const valueDistribution = { excellent: 0, good: 0, fair: 0, poor: 0 };

    // Process each stock
    for (const userStock of userStocks) {
      const currentPrice = await StockPrice.getLatestPrice(userStock.stock_id);
      const analysis = await RollingAnalysis.getLatestAnalysis(userStock.stock_id);

      if (currentPrice && analysis) {
        const stockValue = currentPrice.price;
        const change = currentPrice.change || 0;
        const changePercent = currentPrice.change_percent || 0;

        totalValue += stockValue;
        totalChange += change;

        performers.push({
          symbol: userStock.stock.symbol,
          name: userStock.stock.name,
          change,
          changePercent
        });

        // Sector distribution
        const sector = userStock.stock.sector || 'Unknown';
        const sectorData = sectorMap.get(sector) || { count: 0, value: 0 };
        sectorData.count += 1;
        sectorData.value += stockValue;
        sectorMap.set(sector, sectorData);

        // Value distribution based on percentage above 52-week low
        const percentAboveLow = analysis.percent_above_52w_low;
        if (percentAboveLow <= 10) {
          valueDistribution.excellent += 1;
        } else if (percentAboveLow <= 25) {
          valueDistribution.good += 1;
        } else if (percentAboveLow <= 50) {
          valueDistribution.fair += 1;
        } else {
          valueDistribution.poor += 1;
        }
      }
    }

    // Sort performers
    performers.sort((a, b) => b.changePercent - a.changePercent);
    const topPerformers = performers.slice(0, 5);
    const worstPerformers = performers.slice(-5).reverse();

    // Calculate sector distribution percentages
    const sectorDistribution = Array.from(sectorMap.entries()).map(([sector, data]) => ({
      sector,
      count: data.count,
      value: data.value,
      percentage: (data.value / totalValue) * 100
    }));

    // Calculate risk metrics (simplified)
    const riskMetrics = await this.calculateRiskMetrics(userId);

    const totalChangePercent = totalValue > 0 ? (totalChange / totalValue) * 100 : 0;

    return {
      totalValue,
      totalChange,
      totalChangePercent,
      stockCount: userStocks.length,
      valueDistribution,
      topPerformers,
      worstPerformers,
      sectorDistribution,
      riskMetrics
    };
  }

  // Identify value opportunities based on rolling analysis
  static async identifyValueOpportunities(
    userId: string,
    limit: number = 20
  ): Promise<ValueOpportunity[]> {
    const query = `
      SELECT 
        us.stock_id,
        s.symbol,
        s.name,
        sp.price as current_price,
        ra.percent_above_52w_low,
        ra.percent_above_24w_low,
        ra.percent_above_12w_low,
        us.target_price
      FROM user_stocks us
      JOIN stocks s ON us.stock_id = s.id
      LEFT JOIN stock_prices sp ON s.id = sp.stock_id
      LEFT JOIN rolling_analysis ra ON s.id = ra.stock_id
      WHERE us.user_id = ? 
        AND us.is_active = true
        AND sp.is_latest = true
        AND ra.is_latest = true
      ORDER BY ra.percent_above_52w_low ASC
      LIMIT ?
    `;

    const results = await BaseModel.db.raw(query, [userId, limit]);
    const opportunities: ValueOpportunity[] = [];

    for (const row of results) {
      const valueScore = this.calculateValueScore(
        row.percent_above_52w_low,
        row.percent_above_24w_low,
        row.percent_above_12w_low
      );

      const recommendation = this.getValueRecommendation(row.percent_above_52w_low);
      
      let potentialUpside;
      if (row.target_price && row.current_price) {
        potentialUpside = ((row.target_price - row.current_price) / row.current_price) * 100;
      }

      opportunities.push({
        stockId: row.stock_id,
        symbol: row.symbol,
        name: row.name,
        currentPrice: row.current_price,
        percentAbove52WLow: row.percent_above_52w_low,
        percentAbove24WLow: row.percent_above_24w_low,
        percentAbove12WLow: row.percent_above_12w_low,
        valueScore,
        recommendation,
        targetPrice: row.target_price,
        potentialUpside
      });
    }

    return opportunities;
  }

  // Calculate value score (0-100, higher is better value)
  private static calculateValueScore(
    percent52W: number,
    percent24W: number,
    percent12W: number
  ): number {
    // Weight recent periods more heavily
    const weighted = (percent52W * 0.5) + (percent24W * 0.3) + (percent12W * 0.2);
    
    // Invert the score (lower percentage above low = higher value score)
    return Math.max(0, 100 - weighted);
  }

  // Get value recommendation based on percentage above 52-week low
  private static getValueRecommendation(percentAboveLow: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (percentAboveLow <= 10) return 'excellent';
    if (percentAboveLow <= 25) return 'good';
    if (percentAboveLow <= 50) return 'fair';
    return 'poor';
  }

  // Perform trend analysis for a stock
  static async performTrendAnalysis(
    stockId: string,
    period: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' = '1M'
  ): Promise<TrendAnalysis> {
    const days = this.getPeriodDays(period);
    const historical = await StockPrice.getHistoricalPrices(stockId, days);

    if (historical.length < 20) {
      throw new Error('Insufficient data for trend analysis');
    }

    const prices = historical.map((d: any) => d.price);
    const volumes = historical.map((d: any) => d.volume);

    // Calculate technical indicators
    const sma20 = this.calculateSMA(prices, 20);
    const sma50 = this.calculateSMA(prices, 50);
    const rsi = this.calculateRSI(prices, 14);
    const macd = this.calculateMACD(prices);
    
    // Determine trend
    const currentPrice = prices[prices.length - 1];
    const trend = this.determineTrend(currentPrice, sma20, sma50);
    const strength = this.calculateTrendStrength(prices, sma20, sma50);
    
    // Calculate support and resistance
    const { support, resistance } = this.calculateSupportResistance(prices);
    
    // Calculate momentum
    const momentum = this.calculateMomentum(prices, 10);

    return {
      period,
      trend,
      strength,
      support,
      resistance,
      momentum,
      rsi: rsi[rsi.length - 1] ?? 0,
      macd: {
        signal: macd.signal[macd.signal.length - 1] ?? 0,
        histogram: macd.histogram[macd.histogram.length - 1] ?? 0,
        line: macd.line[macd.line.length - 1] ?? 0
      }
    };
  }

  // Calculate Simple Moving Average
  private static calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  // Calculate RSI (Relative Strength Index)
  private static calculateRSI(prices: number[], period: number = 14): number[] {
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = (prices[i] ?? 0) - (prices[i - 1] ?? 0);
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const rsi: number[] = [];
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + (gains[i] ?? 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (losses[i] ?? 0)) / period;
      
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }

    return rsi;
  }

  // Calculate MACD
  private static calculateMACD(prices: number[]): {
    line: number[];
    signal: number[];
    histogram: number[];
  } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    
    const macdLine: number[] = [];
    for (let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
      macdLine.push((ema12[i] ?? 0) - (ema26[i] ?? 0));
    }
    
    const signalLine = this.calculateEMA(macdLine, 9);
    const histogram: number[] = [];
    
    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      histogram.push((macdLine[i] ?? 0) - (signalLine[i] ?? 0));
    }

    return {
      line: macdLine,
      signal: signalLine,
      histogram
    };
  }

  // Calculate EMA (Exponential Moving Average)
  private static calculateEMA(prices: number[], period: number): number[] {
    const multiplier = 2 / (period + 1);
    const ema: number[] = [prices[0] ?? 0];
    
    for (let i = 1; i < prices.length; i++) {
      ema.push(((prices[i] ?? 0) * multiplier) + ((ema[i - 1] ?? 0) * (1 - multiplier)));
    }
    
    return ema;
  }

  // Helper methods
  private static getPeriodDays(period: string): number {
    const periodMap: Record<string, number> = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365
    };
    return periodMap[period] || 30;
  }

  private static determineTrend(
    currentPrice: number,
    sma20: number[],
    sma50: number[]
  ): 'bullish' | 'bearish' | 'neutral' {
    const latestSMA20 = sma20[sma20.length - 1];
    const latestSMA50 = sma50[sma50.length - 1];
    
    if ((currentPrice ?? 0) > (latestSMA20 ?? 0) && (latestSMA20 ?? 0) > (latestSMA50 ?? 0)) {
      return 'bullish';
    } else if ((currentPrice ?? 0) < (latestSMA20 ?? 0) && (latestSMA20 ?? 0) < (latestSMA50 ?? 0)) {
      return 'bearish';
    }
    return 'neutral';
  }

  private static calculateTrendStrength(
    prices: number[],
    sma20: number[],
    sma50: number[]
  ): number {
    // Simplified trend strength calculation
    const currentPrice = prices[prices.length - 1];
    const latestSMA20 = sma20[sma20.length - 1];
    const latestSMA50 = sma50[sma50.length - 1];
    
    const deviation20 = Math.abs(((currentPrice ?? 0) - (latestSMA20 ?? 0)) / (latestSMA20 || 1)) * 100;
    const deviation50 = Math.abs(((currentPrice ?? 0) - (latestSMA50 ?? 0)) / (latestSMA50 || 1)) * 100;
    
    return Math.min(100, (deviation20 + deviation50) * 2);
  }

  private static calculateSupportResistance(prices: number[]): {
    support: number;
    resistance: number;
  } {
    const sortedPrices = [...prices].sort((a, b) => (a ?? 0) - (b ?? 0));
    const support = sortedPrices[Math.floor(sortedPrices.length * 0.1)] ?? 0;
    const resistance = sortedPrices[Math.floor(sortedPrices.length * 0.9)] ?? 0;

    return { support, resistance };
  }

  private static calculateMomentum(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    
    const current = prices[prices.length - 1] ?? 0;
    const previous = prices[prices.length - 1 - period] ?? 0;
    if (previous === 0) return 0;

    return ((current - previous) / (previous || 1)) * 100;
  }

  private static async calculateRiskMetrics(userId: string): Promise<{
    portfolioVolatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    beta: number;
  }> {
    // Simplified risk metrics calculation
    // In a real implementation, you would calculate these based on historical returns
    return {
      portfolioVolatility: 15.5,
      sharpeRatio: 1.2,
      maxDrawdown: -8.3,
      beta: 1.1
    };
  }
}
