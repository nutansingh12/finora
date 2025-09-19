import { BaseModel } from './BaseModel';

export interface RollingAnalysisModel {
  id: string;
  stock_id: string;
  current_price: number;
  week_52_low: number;
  week_24_low: number;
  week_12_low: number;
  week_52_high: number;
  week_24_high: number;
  week_12_high: number;
  percent_above_52w_low: number;
  percent_above_24w_low: number;
  percent_above_12w_low: number;
  percent_below_52w_high: number;
  percent_below_24w_high: number;
  percent_below_12w_high: number;
  calculated_at: Date;
  created_at: Date;
  updated_at: Date;
}

export class RollingAnalysis extends BaseModel {
  protected static tableName = 'rolling_analysis';

  // Create or update rolling analysis
  static async upsertAnalysis(data: {
    stock_id: string;
    current_price: number;
    week_52_low?: number;
    week_24_low?: number;
    week_12_low?: number;
    week_52_high?: number;
    week_24_high?: number;
    week_12_high?: number;
    percent_above_52w_low?: number;
    percent_above_24w_low?: number;
    percent_above_12w_low?: number;
    percent_below_52w_high?: number;
    percent_below_24w_high?: number;
    percent_below_12w_high?: number;
    calculated_at?: Date;
  }): Promise<RollingAnalysisModel> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.findOne<RollingAnalysisModel>({
      stock_id: data.stock_id,
      calculated_at: { '>=': today }
    });

    const analysisData = {
      ...data,
      calculated_at: data.calculated_at || new Date()
    };

    if (existing) {
      return this.updateById<RollingAnalysisModel>(existing.id, analysisData) as Promise<RollingAnalysisModel>;
    } else {
      return this.create<RollingAnalysisModel>(analysisData);
    }
  }

  // Get latest analysis for a stock
  static async getLatestAnalysis(stockId: string): Promise<RollingAnalysisModel | null> {
    return this.db(this.tableName)
      .where('stock_id', stockId)
      .orderBy('calculated_at', 'desc')
      .first();
  }

  // Get latest analysis for multiple stocks
  static async getLatestAnalysisForStocks(stockIds: string[]): Promise<RollingAnalysisModel[]> {
    if (stockIds.length === 0) return [];

    const subquery = this.db(this.tableName)
      .select('stock_id')
      .max('calculated_at as max_calculated_at')
      .whereIn('stock_id', stockIds)
      .groupBy('stock_id');

    return this.db(this.tableName)
      .select('rolling_analysis.*')
      .innerJoin(
        subquery.as('latest'),
        function() {
          this.on('rolling_analysis.stock_id', '=', 'latest.stock_id')
              .andOn('rolling_analysis.calculated_at', '=', 'latest.max_calculated_at');
        }
      )
      .orderBy('rolling_analysis.calculated_at', 'desc');
  }

  // Get best value opportunities (lowest percent above lows)
  static async getBestValueOpportunities(
    stockIds: string[],
    period: '52w' | '24w' | '12w' = '52w',
    limit: number = 10
  ): Promise<Array<RollingAnalysisModel & { symbol: string; name: string }>> {
    if (stockIds.length === 0) return [];

    const percentColumn = `percent_above_${period}_low`;

    const subquery = this.db(this.tableName)
      .select('stock_id')
      .max('calculated_at as max_calculated_at')
      .whereIn('stock_id', stockIds)
      .groupBy('stock_id');

    return this.db(this.tableName)
      .select('rolling_analysis.*', 'stocks.symbol', 'stocks.name')
      .innerJoin(
        subquery.as('latest'),
        function() {
          this.on('rolling_analysis.stock_id', '=', 'latest.stock_id')
              .andOn('rolling_analysis.calculated_at', '=', 'latest.max_calculated_at');
        }
      )
      .innerJoin('stocks', 'rolling_analysis.stock_id', 'stocks.id')
      .where('stocks.is_active', true)
      .whereNotNull(`rolling_analysis.${percentColumn}`)
      .orderBy(`rolling_analysis.${percentColumn}`, 'asc')
      .limit(limit);
  }

  // Get stocks near highs (lowest percent below highs)
  static async getStocksNearHighs(
    stockIds: string[],
    period: '52w' | '24w' | '12w' = '52w',
    limit: number = 10
  ): Promise<Array<RollingAnalysisModel & { symbol: string; name: string }>> {
    if (stockIds.length === 0) return [];

    const percentColumn = `percent_below_${period}_high`;

    const subquery = this.db(this.tableName)
      .select('stock_id')
      .max('calculated_at as max_calculated_at')
      .whereIn('stock_id', stockIds)
      .groupBy('stock_id');

    return this.db(this.tableName)
      .select('rolling_analysis.*', 'stocks.symbol', 'stocks.name')
      .innerJoin(
        subquery.as('latest'),
        function() {
          this.on('rolling_analysis.stock_id', '=', 'latest.stock_id')
              .andOn('rolling_analysis.calculated_at', '=', 'latest.max_calculated_at');
        }
      )
      .innerJoin('stocks', 'rolling_analysis.stock_id', 'stocks.id')
      .where('stocks.is_active', true)
      .whereNotNull(`rolling_analysis.${percentColumn}`)
      .orderBy(`rolling_analysis.${percentColumn}`, 'asc')
      .limit(limit);
  }

  // Get analysis history for a stock
  static async getAnalysisHistory(
    stockId: string,
    days: number = 30
  ): Promise<RollingAnalysisModel[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.db(this.tableName)
      .where('stock_id', stockId)
      .where('calculated_at', '>=', cutoffDate)
      .orderBy('calculated_at', 'desc');
  }

  // Get portfolio value distribution
  static async getPortfolioValueDistribution(
    stockIds: string[],
    period: '52w' | '24w' | '12w' = '52w'
  ): Promise<{
    excellent: number;    // 0-10% above low
    good: number;         // 10-25% above low
    fair: number;         // 25-50% above low
    poor: number;         // 50%+ above low
    unknown: number;      // No data
  }> {
    if (stockIds.length === 0) {
      return { excellent: 0, good: 0, fair: 0, poor: 0, unknown: 0 };
    }

    const percentColumn = `percent_above_${period}_low`;

    const subquery = this.db(this.tableName)
      .select('stock_id')
      .max('calculated_at as max_calculated_at')
      .whereIn('stock_id', stockIds)
      .groupBy('stock_id');

    const analysis = await this.db(this.tableName)
      .select(`rolling_analysis.${percentColumn}`)
      .innerJoin(
        subquery.as('latest'),
        function() {
          this.on('rolling_analysis.stock_id', '=', 'latest.stock_id')
              .andOn('rolling_analysis.calculated_at', '=', 'latest.max_calculated_at');
        }
      );

    const distribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      unknown: stockIds.length - analysis.length
    };

    analysis.forEach(item => {
      const percent = parseFloat(item[percentColumn]);
      if (percent <= 10) {
        distribution.excellent++;
      } else if (percent <= 25) {
        distribution.good++;
      } else if (percent <= 50) {
        distribution.fair++;
      } else {
        distribution.poor++;
      }
    });

    return distribution;
  }

  // Clean old analysis data
  static async cleanOldAnalysis(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return this.deleteWhere({
      calculated_at: { '<': cutoffDate }
    });
  }

  // Get analysis summary for dashboard
  static async getAnalysisSummary(stockIds: string[]): Promise<{
    totalStocks: number;
    analyzedStocks: number;
    avgPercentAbove52WLow: number;
    avgPercentAbove24WLow: number;
    avgPercentAbove12WLow: number;
    bestValue: { symbol: string; percent: number } | null;
    worstValue: { symbol: string; percent: number } | null;
  }> {
    if (stockIds.length === 0) {
      return {
        totalStocks: 0,
        analyzedStocks: 0,
        avgPercentAbove52WLow: 0,
        avgPercentAbove24WLow: 0,
        avgPercentAbove12WLow: 0,
        bestValue: null,
        worstValue: null
      };
    }

    const subquery = this.db(this.tableName)
      .select('stock_id')
      .max('calculated_at as max_calculated_at')
      .whereIn('stock_id', stockIds)
      .groupBy('stock_id');

    const analysis = await this.db(this.tableName)
      .select(
        'rolling_analysis.*',
        'stocks.symbol'
      )
      .innerJoin(
        subquery.as('latest'),
        function() {
          this.on('rolling_analysis.stock_id', '=', 'latest.stock_id')
              .andOn('rolling_analysis.calculated_at', '=', 'latest.max_calculated_at');
        }
      )
      .innerJoin('stocks', 'rolling_analysis.stock_id', 'stocks.id');

    if (analysis.length === 0) {
      return {
        totalStocks: stockIds.length,
        analyzedStocks: 0,
        avgPercentAbove52WLow: 0,
        avgPercentAbove24WLow: 0,
        avgPercentAbove12WLow: 0,
        bestValue: null,
        worstValue: null
      };
    }

    const avg52W = analysis.reduce((sum, item) => sum + parseFloat(item.percent_above_52w_low), 0) / analysis.length;
    const avg24W = analysis.reduce((sum, item) => sum + parseFloat(item.percent_above_24w_low), 0) / analysis.length;
    const avg12W = analysis.reduce((sum, item) => sum + parseFloat(item.percent_above_12w_low), 0) / analysis.length;

    const sortedBy52W = analysis.sort((a, b) => 
      parseFloat(a.percent_above_52w_low) - parseFloat(b.percent_above_52w_low)
    );

    return {
      totalStocks: stockIds.length,
      analyzedStocks: analysis.length,
      avgPercentAbove52WLow: parseFloat(avg52W.toFixed(2)),
      avgPercentAbove24WLow: parseFloat(avg24W.toFixed(2)),
      avgPercentAbove12WLow: parseFloat(avg12W.toFixed(2)),
      bestValue: {
        symbol: sortedBy52W[0].symbol,
        percent: parseFloat(sortedBy52W[0].percent_above_52w_low)
      },
      worstValue: {
        symbol: sortedBy52W[sortedBy52W.length - 1].symbol,
        percent: parseFloat(sortedBy52W[sortedBy52W.length - 1].percent_above_52w_low)
      }
    };
  }
}
