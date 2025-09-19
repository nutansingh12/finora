import { BaseModel } from '@/models/BaseModel';

export interface RollingAnalysisModel {
  id: string;
  stock_id: string;
  fifty_two_week_low: number;
  twenty_four_week_low: number;
  twelve_week_low: number;
  percent_above_52w_low: number;
  percent_above_24w_low: number;
  percent_above_12w_low: number;
  volatility: number;
  trend_direction: 'up' | 'down' | 'sideways';
  trend_strength: number;
  created_at: Date;
  updated_at: Date;
}

export class RollingAnalysis extends BaseModel {
  protected static tableName = 'rolling_analysis';

  // Create or update rolling analysis
  static async upsertAnalysis(data: {
    stock_id: string;
    fifty_two_week_low: number;
    twenty_four_week_low: number;
    twelve_week_low: number;
    percent_above_52w_low: number;
    percent_above_24w_low: number;
    percent_above_12w_low: number;
    volatility: number;
    trend_direction: 'up' | 'down' | 'sideways';
    trend_strength: number;
  }): Promise<RollingAnalysisModel> {
    const existing = await this.findOne<RollingAnalysisModel>({
      stock_id: data.stock_id
    });

    if (existing) {
      return this.updateById<RollingAnalysisModel>(existing.id, {
        ...data,
        updated_at: new Date()
      });
    } else {
      return this.create<RollingAnalysisModel>({
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  // Get latest analysis for a stock
  static async getLatestAnalysis(stockId: string): Promise<RollingAnalysisModel | null> {
    return this.findOne<RollingAnalysisModel>({
      stock_id: stockId
    });
  }

  // Get stocks near their lows
  static async getStocksNearLows(
    threshold: number = 10,
    limit: number = 50
  ): Promise<Array<{
    stockId: string;
    symbol: string;
    name: string;
    currentPrice: number;
    percentAboveLow: number;
  }>> {
    return this.db(this.tableName)
      .select(
        'rolling_analysis.stock_id as stockId',
        'stocks.symbol',
        'stocks.name',
        'sp.price as currentPrice',
        'rolling_analysis.percent_above_52w_low as percentAboveLow'
      )
      .join('stocks', 'rolling_analysis.stock_id', 'stocks.id')
      .join('stock_prices as sp', function() {
        this.on('sp.stock_id', '=', 'rolling_analysis.stock_id')
            .andOn('sp.is_latest', '=', this.db.raw('true'));
      })
      .where('rolling_analysis.percent_above_52w_low', '<=', threshold)
      .where('stocks.is_active', true)
      .orderBy('rolling_analysis.percent_above_52w_low', 'asc')
      .limit(limit);
  }

  // Get value opportunities with detailed analysis
  static async getValueOpportunities(
    options: {
      maxPercentAbove52W?: number;
      maxPercentAbove24W?: number;
      maxPercentAbove12W?: number;
      minVolatility?: number;
      maxVolatility?: number;
      trendDirection?: 'up' | 'down' | 'sideways';
      limit?: number;
    } = {}
  ): Promise<Array<RollingAnalysisModel & {
    symbol: string;
    name: string;
    currentPrice: number;
    exchange: string;
  }>> {
    let query = this.db(this.tableName)
      .select(
        'rolling_analysis.*',
        'stocks.symbol',
        'stocks.name',
        'stocks.exchange',
        'sp.price as currentPrice'
      )
      .join('stocks', 'rolling_analysis.stock_id', 'stocks.id')
      .join('stock_prices as sp', function() {
        this.on('sp.stock_id', '=', 'rolling_analysis.stock_id')
            .andOn('sp.is_latest', '=', this.db.raw('true'));
      })
      .where('stocks.is_active', true);

    if (options.maxPercentAbove52W !== undefined) {
      query = query.where('rolling_analysis.percent_above_52w_low', '<=', options.maxPercentAbove52W);
    }

    if (options.maxPercentAbove24W !== undefined) {
      query = query.where('rolling_analysis.percent_above_24w_low', '<=', options.maxPercentAbove24W);
    }

    if (options.maxPercentAbove12W !== undefined) {
      query = query.where('rolling_analysis.percent_above_12w_low', '<=', options.maxPercentAbove12W);
    }

    if (options.minVolatility !== undefined) {
      query = query.where('rolling_analysis.volatility', '>=', options.minVolatility);
    }

    if (options.maxVolatility !== undefined) {
      query = query.where('rolling_analysis.volatility', '<=', options.maxVolatility);
    }

    if (options.trendDirection) {
      query = query.where('rolling_analysis.trend_direction', options.trendDirection);
    }

    return query
      .orderBy('rolling_analysis.percent_above_52w_low', 'asc')
      .limit(options.limit || 50);
  }

  // Get analysis statistics
  static async getAnalysisStatistics(): Promise<{
    totalStocks: number;
    stocksNear52WLow: number;
    stocksNear24WLow: number;
    stocksNear12WLow: number;
    averageVolatility: number;
    trendDistribution: {
      up: number;
      down: number;
      sideways: number;
    };
  }> {
    const stats = await this.db(this.tableName)
      .select(
        this.db.raw('COUNT(*) as total_stocks'),
        this.db.raw('COUNT(CASE WHEN percent_above_52w_low <= 10 THEN 1 END) as near_52w_low'),
        this.db.raw('COUNT(CASE WHEN percent_above_24w_low <= 10 THEN 1 END) as near_24w_low'),
        this.db.raw('COUNT(CASE WHEN percent_above_12w_low <= 10 THEN 1 END) as near_12w_low'),
        this.db.raw('AVG(volatility) as average_volatility'),
        this.db.raw('COUNT(CASE WHEN trend_direction = "up" THEN 1 END) as trend_up'),
        this.db.raw('COUNT(CASE WHEN trend_direction = "down" THEN 1 END) as trend_down'),
        this.db.raw('COUNT(CASE WHEN trend_direction = "sideways" THEN 1 END) as trend_sideways')
      )
      .first();

    return {
      totalStocks: parseInt(stats?.total_stocks) || 0,
      stocksNear52WLow: parseInt(stats?.near_52w_low) || 0,
      stocksNear24WLow: parseInt(stats?.near_24w_low) || 0,
      stocksNear12WLow: parseInt(stats?.near_12w_low) || 0,
      averageVolatility: parseFloat(stats?.average_volatility) || 0,
      trendDistribution: {
        up: parseInt(stats?.trend_up) || 0,
        down: parseInt(stats?.trend_down) || 0,
        sideways: parseInt(stats?.trend_sideways) || 0
      }
    };
  }

  // Get stocks by trend
  static async getStocksByTrend(
    trendDirection: 'up' | 'down' | 'sideways',
    minTrendStrength: number = 0,
    limit: number = 50
  ): Promise<Array<RollingAnalysisModel & {
    symbol: string;
    name: string;
    currentPrice: number;
  }>> {
    return this.db(this.tableName)
      .select(
        'rolling_analysis.*',
        'stocks.symbol',
        'stocks.name',
        'sp.price as currentPrice'
      )
      .join('stocks', 'rolling_analysis.stock_id', 'stocks.id')
      .join('stock_prices as sp', function() {
        this.on('sp.stock_id', '=', 'rolling_analysis.stock_id')
            .andOn('sp.is_latest', '=', this.db.raw('true'));
      })
      .where('rolling_analysis.trend_direction', trendDirection)
      .where('rolling_analysis.trend_strength', '>=', minTrendStrength)
      .where('stocks.is_active', true)
      .orderBy('rolling_analysis.trend_strength', 'desc')
      .limit(limit);
  }

  // Get most volatile stocks
  static async getMostVolatileStocks(limit: number = 50): Promise<Array<RollingAnalysisModel & {
    symbol: string;
    name: string;
    currentPrice: number;
  }>> {
    return this.db(this.tableName)
      .select(
        'rolling_analysis.*',
        'stocks.symbol',
        'stocks.name',
        'sp.price as currentPrice'
      )
      .join('stocks', 'rolling_analysis.stock_id', 'stocks.id')
      .join('stock_prices as sp', function() {
        this.on('sp.stock_id', '=', 'rolling_analysis.stock_id')
            .andOn('sp.is_latest', '=', this.db.raw('true'));
      })
      .where('stocks.is_active', true)
      .orderBy('rolling_analysis.volatility', 'desc')
      .limit(limit);
  }

  // Get least volatile stocks
  static async getLeastVolatileStocks(limit: number = 50): Promise<Array<RollingAnalysisModel & {
    symbol: string;
    name: string;
    currentPrice: number;
  }>> {
    return this.db(this.tableName)
      .select(
        'rolling_analysis.*',
        'stocks.symbol',
        'stocks.name',
        'sp.price as currentPrice'
      )
      .join('stocks', 'rolling_analysis.stock_id', 'stocks.id')
      .join('stock_prices as sp', function() {
        this.on('sp.stock_id', '=', 'rolling_analysis.stock_id')
            .andOn('sp.is_latest', '=', this.db.raw('true'));
      })
      .where('stocks.is_active', true)
      .orderBy('rolling_analysis.volatility', 'asc')
      .limit(limit);
  }

  // Get analysis for multiple stocks
  static async getMultipleAnalysis(stockIds: string[]): Promise<RollingAnalysisModel[]> {
    return this.findAll<RollingAnalysisModel>({}, {
      whereIn: {
        column: 'stock_id',
        values: stockIds
      }
    });
  }

  // Update analysis for stock
  static async updateAnalysis(
    stockId: string,
    updates: Partial<{
      fifty_two_week_low: number;
      twenty_four_week_low: number;
      twelve_week_low: number;
      percent_above_52w_low: number;
      percent_above_24w_low: number;
      percent_above_12w_low: number;
      volatility: number;
      trend_direction: 'up' | 'down' | 'sideways';
      trend_strength: number;
    }>
  ): Promise<RollingAnalysisModel | null> {
    const existing = await this.findOne<RollingAnalysisModel>({
      stock_id: stockId
    });

    if (!existing) {
      return null;
    }

    return this.updateById<RollingAnalysisModel>(existing.id, {
      ...updates,
      updated_at: new Date()
    });
  }

  // Delete analysis for stock
  static async deleteAnalysis(stockId: string): Promise<boolean> {
    const result = await this.db(this.tableName)
      .where('stock_id', stockId)
      .del();

    return result > 0;
  }

  // Get outdated analysis (older than specified days)
  static async getOutdatedAnalysis(days: number = 7): Promise<RollingAnalysisModel[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.findAll<RollingAnalysisModel>({}, {
      where: {
        updated_at: { '<': cutoffDate }
      }
    });
  }

  // Refresh analysis for all stocks
  static async refreshAllAnalysis(): Promise<void> {
    // This would typically be called by a background job
    // Implementation would fetch all active stocks and update their analysis
    console.log('Refreshing all rolling analysis...');
    
    // Get all active stocks
    const stocks = await this.db('stocks')
      .select('id')
      .where('is_active', true);

    console.log(`Found ${stocks.length} active stocks to analyze`);
    
    // This would trigger the StockPriceService to update analysis for each stock
    // For now, we'll just log the action
  }
}
