import { BaseModel } from '@/models/BaseModel';

export interface StockPriceModel {
  id: string;
  stock_id: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  market_cap?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  fifty_two_week_low: number;
  fifty_two_week_high: number;
  fifty_day_avg?: number;
  two_hundred_day_avg?: number;
  is_latest: boolean;
  created_at: Date;
}

export class StockPrice extends BaseModel {
  protected static tableName = 'stock_prices';

  // Create new price record
  static async createPrice(data: {
    stock_id: string;
    price: number;
    change: number;
    change_percent: number;
    volume: number;
    market_cap?: number;
    pe_ratio?: number;
    dividend_yield?: number;
    fifty_two_week_low: number;
    fifty_two_week_high: number;
    fifty_day_avg?: number;
    two_hundred_day_avg?: number;
    is_latest?: boolean;
  }): Promise<StockPriceModel> {
    const transaction = await this.db.transaction();

    try {
      // If this is the latest price, mark all other prices for this stock as not latest
      if (data.is_latest) {
        await transaction(this.tableName)
          .where('stock_id', data.stock_id)
          .update({ is_latest: false });
      }

      // Create new price record
      const [price] = await transaction(this.tableName)
        .insert({
          ...data,
          is_latest: data.is_latest !== undefined ? data.is_latest : true,
          created_at: new Date()
        })
        .returning('*');

      await transaction.commit();
      return price;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Get latest price for a stock
  static async getLatestPrice(stockId: string): Promise<StockPriceModel | null> {
    return this.findOne<StockPriceModel>({
      stock_id: stockId,
      is_latest: true
    });
  }

  // Get historical prices for a stock
  static async getHistoricalPrices(
    stockId: string,
    days: number = 30
  ): Promise<Array<{
    date: Date;
    price: number;
    volume: number;
    change: number;
    change_percent: number;
  }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.db(this.tableName)
      .select(
        'created_at as date',
        'price',
        'volume',
        'change',
        'change_percent'
      )
      .where('stock_id', stockId)
      .where('created_at', '>=', cutoffDate)
      .orderBy('created_at', 'desc');
  }

  // Get price range for a stock over a period
  static async getPriceRange(
    stockId: string,
    days: number = 30
  ): Promise<{
    high: number;
    low: number;
    average: number;
  } | null> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.db(this.tableName)
      .select(
        this.db.raw('MAX(price) as high'),
        this.db.raw('MIN(price) as low'),
        this.db.raw('AVG(price) as average')
      )
      .where('stock_id', stockId)
      .where('created_at', '>=', cutoffDate)
      .first();

    if (!result) return null;

    return {
      high: parseFloat(result.high) || 0,
      low: parseFloat(result.low) || 0,
      average: parseFloat(result.average) || 0
    };
  }

  // Get price at specific date
  static async getPriceAtDate(
    stockId: string,
    date: Date
  ): Promise<StockPriceModel | null> {
    return this.db(this.tableName)
      .select('*')
      .where('stock_id', stockId)
      .where('created_at', '<=', date)
      .orderBy('created_at', 'desc')
      .first();
  }

  // Get multiple latest prices
  static async getMultipleLatestPrices(
    stockIds: string[]
  ): Promise<StockPriceModel[]> {
    return this.db(this.tableName)
      .select('*')
      .whereIn('stock_id', stockIds)
      .where('is_latest', true);
  }

  // Get price statistics for a stock
  static async getPriceStatistics(
    stockId: string,
    days: number = 365
  ): Promise<{
    current: number;
    high: number;
    low: number;
    average: number;
    volatility: number;
    totalVolume: number;
    averageVolume: number;
  } | null> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const prices = await this.db(this.tableName)
      .select('price', 'volume')
      .where('stock_id', stockId)
      .where('created_at', '>=', cutoffDate)
      .orderBy('created_at', 'desc');

    if (prices.length === 0) return null;

    const priceValues = prices.map(p => p.price);
    const volumeValues = prices.map(p => p.volume);

    const current = priceValues[0];
    const high = Math.max(...priceValues);
    const low = Math.min(...priceValues);
    const average = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
    
    // Calculate volatility (standard deviation)
    const variance = priceValues.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / priceValues.length;
    const volatility = Math.sqrt(variance);

    const totalVolume = volumeValues.reduce((sum, volume) => sum + volume, 0);
    const averageVolume = totalVolume / volumeValues.length;

    return {
      current,
      high,
      low,
      average,
      volatility,
      totalVolume,
      averageVolume
    };
  }

  // Get stocks with significant price changes
  static async getStocksWithSignificantChanges(
    threshold: number = 5,
    limit: number = 50
  ): Promise<Array<StockPriceModel & { symbol: string; name: string }>> {
    return this.db(this.tableName)
      .select(
        'stock_prices.*',
        'stocks.symbol',
        'stocks.name'
      )
      .join('stocks', 'stock_prices.stock_id', 'stocks.id')
      .where('stock_prices.is_latest', true)
      .where(function() {
        this.where('stock_prices.change_percent', '>=', threshold)
            .orWhere('stock_prices.change_percent', '<=', -threshold);
      })
      .orderBy('stock_prices.change_percent', 'desc')
      .limit(limit);
  }

  // Get top gainers
  static async getTopGainers(limit: number = 20): Promise<Array<StockPriceModel & {
    symbol: string;
    name: string;
  }>> {
    return this.db(this.tableName)
      .select(
        'stock_prices.*',
        'stocks.symbol',
        'stocks.name'
      )
      .join('stocks', 'stock_prices.stock_id', 'stocks.id')
      .where('stock_prices.is_latest', true)
      .where('stock_prices.change_percent', '>', 0)
      .orderBy('stock_prices.change_percent', 'desc')
      .limit(limit);
  }

  // Get top losers
  static async getTopLosers(limit: number = 20): Promise<Array<StockPriceModel & {
    symbol: string;
    name: string;
  }>> {
    return this.db(this.tableName)
      .select(
        'stock_prices.*',
        'stocks.symbol',
        'stocks.name'
      )
      .join('stocks', 'stock_prices.stock_id', 'stocks.id')
      .where('stock_prices.is_latest', true)
      .where('stock_prices.change_percent', '<', 0)
      .orderBy('stock_prices.change_percent', 'asc')
      .limit(limit);
  }

  // Get most active stocks by volume
  static async getMostActiveStocks(limit: number = 20): Promise<Array<StockPriceModel & {
    symbol: string;
    name: string;
  }>> {
    return this.db(this.tableName)
      .select(
        'stock_prices.*',
        'stocks.symbol',
        'stocks.name'
      )
      .join('stocks', 'stock_prices.stock_id', 'stocks.id')
      .where('stock_prices.is_latest', true)
      .orderBy('stock_prices.volume', 'desc')
      .limit(limit);
  }

  // Update latest price flag
  static async updateLatestPriceFlag(stockId: string, priceId: string): Promise<void> {
    const transaction = await this.db.transaction();

    try {
      // Mark all prices as not latest
      await transaction(this.tableName)
        .where('stock_id', stockId)
        .update({ is_latest: false });

      // Mark specific price as latest
      await transaction(this.tableName)
        .where('id', priceId)
        .update({ is_latest: true });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Clean up old price records
  static async cleanupOldPrices(
    stockId: string,
    keepDays: number = 365
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    return this.db(this.tableName)
      .where('stock_id', stockId)
      .where('is_latest', false)
      .where('created_at', '<', cutoffDate)
      .del();
  }

  // Get price trend
  static async getPriceTrend(
    stockId: string,
    days: number = 20
  ): Promise<'up' | 'down' | 'sideways'> {
    const prices = await this.getHistoricalPrices(stockId, days);
    
    if (prices.length < 2) return 'sideways';

    const recentPrice = prices[0]?.price ?? 0;
    const oldPrice = prices[prices.length - 1]?.price ?? 0;
    
    const changePercent = ((recentPrice - oldPrice) / oldPrice) * 100;
    
    if (changePercent > 2) return 'up';
    if (changePercent < -2) return 'down';
    return 'sideways';
  }

  // Get stocks near 52-week highs/lows
  static async getStocksNearExtremes(
    type: '52w_high' | '52w_low',
    threshold: number = 5,
    limit: number = 50
  ): Promise<Array<StockPriceModel & {
    symbol: string;
    name: string;
    percentFromExtreme: number;
  }>> {
    const field = type === '52w_high' ? 'fifty_two_week_high' : 'fifty_two_week_low';
    
    return this.db(this.tableName)
      .select(
        'stock_prices.*',
        'stocks.symbol',
        'stocks.name',
        this.db.raw(`
          CASE 
            WHEN ? = 'fifty_two_week_high' THEN 
              ((? - stock_prices.price) / stock_prices.price * 100)
            ELSE 
              ((stock_prices.price - ?) / stock_prices.price * 100)
          END as percentFromExtreme
        `, [field, field, field])
      )
      .join('stocks', 'stock_prices.stock_id', 'stocks.id')
      .where('stock_prices.is_latest', true)
      .havingRaw('percentFromExtreme <= ?', [threshold])
      .orderBy('percentFromExtreme', 'asc')
      .limit(limit);
  }
}
