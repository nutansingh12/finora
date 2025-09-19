import { BaseModel } from './BaseModel';

export interface HistoricalDataModel {
  id: string;
  stock_id: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
  source: string;
  created_at: Date;
  updated_at: Date;
}

export class HistoricalData extends BaseModel {
  protected static tableName = 'historical_data';

  // Create or update historical data
  static async upsertHistoricalData(data: {
    stock_id: string;
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    adjusted_close: number;
    volume?: number;
    source?: string;
  }): Promise<HistoricalDataModel> {
    const existing = await this.findOne<HistoricalDataModel>({
      stock_id: data.stock_id,
      date: data.date,
      source: data.source || 'yahoo'
    });

    const historicalData = {
      ...data,
      volume: data.volume || 0,
      source: data.source || 'yahoo'
    };

    if (existing) {
      return this.updateById<HistoricalDataModel>(existing.id, historicalData) as Promise<HistoricalDataModel>;
    } else {
      return this.create<HistoricalDataModel>(historicalData);
    }
  }

  // Get historical data for a stock
  static async getHistoricalData(
    stockId: string,
    days?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<HistoricalDataModel[]> {
    let query = this.db(this.tableName)
      .where('stock_id', stockId)
      .orderBy('date', 'desc');

    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      query = query.where('date', '>=', cutoffDate);
    }

    if (startDate) {
      query = query.where('date', '>=', startDate);
    }

    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    return query;
  }

  // Get OHLCV data for charting
  static async getChartData(
    stockId: string,
    period: '1w' | '1m' | '3m' | '6m' | '1y' | '2y' | '5y' = '1y'
  ): Promise<Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    let days = 365;
    switch (period) {
      case '1w': days = 7; break;
      case '1m': days = 30; break;
      case '3m': days = 90; break;
      case '6m': days = 180; break;
      case '1y': days = 365; break;
      case '2y': days = 730; break;
      case '5y': days = 1825; break;
    }

    const data = await this.getHistoricalData(stockId, days);
    
    return data.map(item => ({
      date: item.date.toISOString().split('T')[0],
      open: parseFloat(item.open.toString()),
      high: parseFloat(item.high.toString()),
      low: parseFloat(item.low.toString()),
      close: parseFloat(item.close.toString()),
      volume: parseInt(item.volume.toString())
    })).reverse(); // Return in ascending order for charts
  }

  // Calculate rolling lows and highs
  static async getRollingExtremes(
    stockId: string,
    weeks: number
  ): Promise<{ low: number; high: number } | null> {
    const days = weeks * 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.db(this.tableName)
      .where('stock_id', stockId)
      .where('date', '>=', cutoffDate)
      .select(
        this.db.raw('MIN(low) as low'),
        this.db.raw('MAX(high) as high')
      )
      .first();

    if (!result || result.low === null || result.high === null) {
      return null;
    }

    return {
      low: parseFloat(result.low),
      high: parseFloat(result.high)
    };
  }

  // Get price at specific date
  static async getPriceAtDate(
    stockId: string,
    date: Date
  ): Promise<number | null> {
    const data = await this.db(this.tableName)
      .where('stock_id', stockId)
      .where('date', '<=', date)
      .orderBy('date', 'desc')
      .first();

    return data ? parseFloat(data.close) : null;
  }

  // Calculate returns over period
  static async calculateReturns(
    stockId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    startPrice: number;
    endPrice: number;
    totalReturn: number;
    totalReturnPercent: number;
  } | null> {
    const startData = await this.getPriceAtDate(stockId, startDate);
    const endData = await this.getPriceAtDate(stockId, endDate);

    if (!startData || !endData) return null;

    const totalReturn = endData - startData;
    const totalReturnPercent = (totalReturn / startData) * 100;

    return {
      startPrice: startData,
      endPrice: endData,
      totalReturn,
      totalReturnPercent
    };
  }

  // Get volatility (standard deviation of returns)
  static async getVolatility(
    stockId: string,
    days: number = 30
  ): Promise<number | null> {
    const data = await this.getHistoricalData(stockId, days);
    
    if (data.length < 2) return null;

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const currentPrice = parseFloat(data[i].close.toString());
      const previousPrice = parseFloat(data[i - 1].close.toString());
      const dailyReturn = (currentPrice - previousPrice) / previousPrice;
      returns.push(dailyReturn);
    }

    if (returns.length === 0) return null;

    // Calculate standard deviation
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility

    return volatility;
  }

  // Get moving averages
  static async getMovingAverages(
    stockId: string,
    periods: number[] = [20, 50, 200]
  ): Promise<Record<number, number | null>> {
    const maxPeriod = Math.max(...periods);
    const data = await this.getHistoricalData(stockId, maxPeriod);
    
    const result: Record<number, number | null> = {};

    for (const period of periods) {
      if (data.length >= period) {
        const prices = data.slice(0, period).map(d => parseFloat(d.close.toString()));
        const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        result[period] = average;
      } else {
        result[period] = null;
      }
    }

    return result;
  }

  // Clean old historical data
  static async cleanOldData(retentionDays: number = 1825): Promise<number> { // 5 years default
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return this.deleteWhere({
      date: { '<': cutoffDate }
    });
  }

  // Get data gaps (missing dates)
  static async getDataGaps(
    stockId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Date[]> {
    const existingDates = await this.db(this.tableName)
      .select('date')
      .where('stock_id', stockId)
      .whereBetween('date', [startDate, endDate])
      .orderBy('date');

    const existingDateSet = new Set(
      existingDates.map(row => row.date.toISOString().split('T')[0])
    );

    const gaps: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Skip weekends (assuming stock market data)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !existingDateSet.has(dateString)) {
        gaps.push(new Date(currentDate));
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return gaps;
  }

  // Get summary statistics
  static async getSummaryStats(
    stockId: string,
    days: number = 252
  ): Promise<{
    count: number;
    avgVolume: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    priceRange: number;
    volatility: number | null;
  } | null> {
    const data = await this.getHistoricalData(stockId, days);
    
    if (data.length === 0) return null;

    const prices = data.map(d => parseFloat(d.close.toString()));
    const volumes = data.map(d => parseInt(d.volume.toString()));

    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    const volatility = await this.getVolatility(stockId, days);

    return {
      count: data.length,
      avgVolume: Math.round(avgVolume),
      avgPrice: parseFloat(avgPrice.toFixed(2)),
      minPrice: parseFloat(minPrice.toFixed(2)),
      maxPrice: parseFloat(maxPrice.toFixed(2)),
      priceRange: parseFloat(priceRange.toFixed(2)),
      volatility: volatility ? parseFloat(volatility.toFixed(4)) : null
    };
  }
}
