import { BaseModel } from './BaseModel';

export interface StockPriceModel {
  id: string;
  stock_id: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  market_cap?: number;
  day_high?: number;
  day_low?: number;
  week_52_high?: number;
  week_52_low?: number;
  previous_close?: number;
  source: string;
  timestamp: Date;
  created_at: Date;
  updated_at: Date;
}

export class StockPrice extends BaseModel {
  protected static tableName = 'stock_prices';

  // Create new price record
  static async createPrice(priceData: {
    stock_id: string;
    price: number;
    change?: number;
    change_percent?: number;
    volume?: number;
    market_cap?: number;
    day_high?: number;
    day_low?: number;
    week_52_high?: number;
    week_52_low?: number;
    previous_close?: number;
    source?: string;
    timestamp?: Date;
  }): Promise<StockPriceModel> {
    return this.create<StockPriceModel>({
      ...priceData,
      change: priceData.change || 0,
      change_percent: priceData.change_percent || 0,
      volume: priceData.volume || 0,
      source: priceData.source || 'yahoo',
      timestamp: priceData.timestamp || new Date()
    });
  }

  // Get latest price for a stock
  static async getLatestPrice(stockId: string): Promise<StockPriceModel | null> {
    return this.db(this.tableName)
      .where('stock_id', stockId)
      .orderBy('timestamp', 'desc')
      .first();
  }

  // Get latest prices for multiple stocks
  static async getLatestPrices(stockIds: string[]): Promise<StockPriceModel[]> {
    if (stockIds.length === 0) return [];

    const subquery = this.db(this.tableName)
      .select('stock_id')
      .max('timestamp as max_timestamp')
      .whereIn('stock_id', stockIds)
      .groupBy('stock_id');

    return this.db(this.tableName)
      .select('stock_prices.*')
      .innerJoin(
        subquery.as('latest'),
        function() {
          this.on('stock_prices.stock_id', '=', 'latest.stock_id')
              .andOn('stock_prices.timestamp', '=', 'latest.max_timestamp');
        }
      )
      .orderBy('stock_prices.timestamp', 'desc');
  }

  // Get price history for a stock
  static async getPriceHistory(
    stockId: string, 
    days: number = 30
  ): Promise<Array<{ date: Date; price: number; volume: number }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const prices = await this.db(this.tableName)
      .select('timestamp as date', 'price', 'volume')
      .where('stock_id', stockId)
      .where('timestamp', '>=', cutoffDate)
      .orderBy('timestamp', 'asc');

    return prices.map(price => ({
      date: price.date,
      price: parseFloat(price.price),
      volume: parseInt(price.volume) || 0
    }));
  }

  // Get price changes for a stock over time
  static async getPriceChanges(
    stockId: string,
    period: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' = '1d'
  ): Promise<{
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  } | null> {
    const latest = await this.getLatestPrice(stockId);
    if (!latest) return null;

    let daysBack = 1;
    switch (period) {
      case '1w': daysBack = 7; break;
      case '1m': daysBack = 30; break;
      case '3m': daysBack = 90; break;
      case '6m': daysBack = 180; break;
      case '1y': daysBack = 365; break;
    }

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - daysBack);

    const pastPrice = await this.db(this.tableName)
      .where('stock_id', stockId)
      .where('timestamp', '<=', pastDate)
      .orderBy('timestamp', 'desc')
      .first();

    if (!pastPrice) {
      return {
        current: latest.price,
        previous: latest.price,
        change: 0,
        changePercent: 0
      };
    }

    const change = latest.price - pastPrice.price;
    const changePercent = pastPrice.price > 0 ? (change / pastPrice.price) * 100 : 0;

    return {
      current: latest.price,
      previous: pastPrice.price,
      change,
      changePercent
    };
  }

  // Get stocks with biggest price movements
  static async getBiggestMovers(
    limit: number = 10,
    type: 'gainers' | 'losers' = 'gainers'
  ): Promise<Array<{
    stock_id: string;
    symbol: string;
    name: string;
    price: number;
    change: number;
    change_percent: number;
  }>> {
    const orderDirection = type === 'gainers' ? 'desc' : 'asc';

    return this.db(this.tableName)
      .select(
        'stock_prices.stock_id',
        'stocks.symbol',
        'stocks.name',
        'stock_prices.price',
        'stock_prices.change',
        'stock_prices.change_percent'
      )
      .join('stocks', 'stock_prices.stock_id', 'stocks.id')
      .whereIn('stock_prices.id', function() {
        this.select(this.db.raw('MAX(id)'))
          .from('stock_prices')
          .groupBy('stock_id');
      })
      .where('stocks.is_active', true)
      .orderBy('stock_prices.change_percent', orderDirection)
      .limit(limit);
  }

  // Get volume leaders
  static async getVolumeLeaders(limit: number = 10): Promise<Array<{
    stock_id: string;
    symbol: string;
    name: string;
    price: number;
    volume: number;
    change_percent: number;
  }>> {
    return this.db(this.tableName)
      .select(
        'stock_prices.stock_id',
        'stocks.symbol',
        'stocks.name',
        'stock_prices.price',
        'stock_prices.volume',
        'stock_prices.change_percent'
      )
      .join('stocks', 'stock_prices.stock_id', 'stocks.id')
      .whereIn('stock_prices.id', function() {
        this.select(this.db.raw('MAX(id)'))
          .from('stock_prices')
          .groupBy('stock_id');
      })
      .where('stocks.is_active', true)
      .where('stock_prices.volume', '>', 0)
      .orderBy('stock_prices.volume', 'desc')
      .limit(limit);
  }

  // Clean old price data
  static async cleanOldPrices(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return this.deleteWhere({
      timestamp: { '<': cutoffDate }
    });
  }

  // Get price statistics for a stock
  static async getPriceStats(stockId: string, days: number = 30): Promise<{
    current: number;
    high: number;
    low: number;
    average: number;
    volatility: number;
    volume_avg: number;
  } | null> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const stats = await this.db(this.tableName)
      .where('stock_id', stockId)
      .where('timestamp', '>=', cutoffDate)
      .select(
        this.db.raw('MAX(price) as high'),
        this.db.raw('MIN(price) as low'),
        this.db.raw('AVG(price) as average'),
        this.db.raw('STDDEV(price) as volatility'),
        this.db.raw('AVG(volume) as volume_avg'),
        this.db.raw('COUNT(*) as count')
      )
      .first();

    if (!stats || stats.count === 0) return null;

    const latest = await this.getLatestPrice(stockId);
    if (!latest) return null;

    return {
      current: latest.price,
      high: parseFloat(stats.high),
      low: parseFloat(stats.low),
      average: parseFloat(stats.average),
      volatility: parseFloat(stats.volatility) || 0,
      volume_avg: parseInt(stats.volume_avg) || 0
    };
  }
}
