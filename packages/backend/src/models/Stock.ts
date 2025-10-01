import { BaseModel } from './BaseModel';

export interface StockModel {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  type: 'stock' | 'etf' | 'mutual_fund';
  sector?: string;
  industry?: string;
  market_cap?: number;
  currency: string;
  country: string;
  description?: string;
  website?: string;
  is_active: boolean;
  last_updated?: Date;
  created_at: Date;
  updated_at: Date;
}

export class Stock extends BaseModel {
  protected static tableName = 'stocks';

  // Find stock by symbol
  static async findBySymbol(symbol: string): Promise<StockModel | null> {
    return this.findOne<StockModel>({ symbol: symbol.toUpperCase() });
  }

  // Find stocks by exchange
  static async findByExchange(exchange: string): Promise<StockModel[]> {
    return this.findAll<StockModel>({ exchange, is_active: true });
  }

  // Search stocks by symbol or name
  static async searchStocks(
    searchTerm: string,
    limit: number = 20
  ): Promise<StockModel[]> {
    const term = searchTerm.toLowerCase();

    return this.db(this.tableName)
      .where('is_active', true)
      .where(function() {
        this.where('symbol', 'ilike', `%${term}%`)
          .orWhere('name', 'ilike', `%${term}%`);
      })
      .orderByRaw(`
        CASE
          WHEN LOWER(symbol) = ? THEN 1
          WHEN LOWER(symbol) LIKE ? THEN 2
          WHEN LOWER(name) LIKE ? THEN 3
          ELSE 4
        END
      `, [term, `${term}%`, `%${term}%`])
      .limit(limit);
  }

  // Create or update stock
  static async upsertStock(stockData: {
    symbol: string;
    name: string;
    exchange: string;
    type?: 'stock' | 'etf' | 'mutual_fund';
    sector?: string;
    industry?: string;
    market_cap?: number;
    currency?: string;
    country?: string;
    description?: string;
    website?: string;
  }): Promise<StockModel> {
    const existingStock = await this.findBySymbol(stockData.symbol);

    const stockInfo = {
      ...stockData,
      symbol: stockData.symbol.toUpperCase(),
      type: stockData.type || 'stock',
      currency: stockData.currency || 'USD',
      country: stockData.country || 'US',
      last_updated: new Date()
    };

    if (existingStock) {
      return this.updateById<StockModel>(existingStock.id, stockInfo) as Promise<StockModel>;
    } else {
      return this.create<StockModel>(stockInfo);
    }
  }

  // Get stocks by sector
  static async getStocksBySector(sector: string): Promise<StockModel[]> {
    return this.findAll<StockModel>({ sector, is_active: true });
  }

  // Get stocks by industry
  static async getStocksByIndustry(industry: string): Promise<StockModel[]> {
    return this.findAll<StockModel>({ industry, is_active: true });
  }

  // Get popular stocks (most tracked)
  static async getPopularStocks(limit: number = 10): Promise<StockModel[]> {
    return this.db(this.tableName)
      .select('stocks.*')
      .leftJoin('user_stocks', 'stocks.id', 'user_stocks.stock_id')
      .where('stocks.is_active', true)
      .groupBy('stocks.id')
      .orderByRaw('COUNT(user_stocks.id) DESC')
      .limit(limit);
  }

  // Get stocks with recent price updates
  static async getStocksWithRecentPrices(hours: number = 24): Promise<StockModel[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.db(this.tableName)
      .select('stocks.*')
      .join('stock_prices', 'stocks.id', 'stock_prices.stock_id')
      .where('stocks.is_active', true)
      .where('stock_prices.timestamp', '>=', cutoffTime)
      .groupBy('stocks.id')
      .orderBy('stock_prices.timestamp', 'desc');
  }

  // Deactivate stock
  static async deactivateStock(stockId: string): Promise<StockModel | null> {
    return this.updateById<StockModel>(stockId, { is_active: false });
  }

  // Activate stock
  static async activateStock(stockId: string): Promise<StockModel | null> {
    return this.updateById<StockModel>(stockId, { is_active: true });
  }

  // Get stock statistics
  static async getStockStats(): Promise<{
    total: number;
    active: number;
    byType: Record<string, number>;
    bySector: Record<string, number>;
    byExchange: Record<string, number>;
  }> {
    const total = await this.count();
    const active = await this.count({ is_active: true });

    const byType = await this.db(this.tableName)
      .select('type')
      .count('* as count')
      .where('is_active', true)
      .groupBy('type');

    const bySector = await this.db(this.tableName)
      .select('sector')
      .count('* as count')
      .where('is_active', true)
      .whereNotNull('sector')
      .groupBy('sector')
      .orderBy('count', 'desc')
      .limit(10);

    const byExchange = await this.db(this.tableName)
      .select('exchange')
      .count('* as count')
      .where('is_active', true)
      .groupBy('exchange')
      .orderBy('count', 'desc');

    return {
      total,
      active,
      byType: byType.reduce<Record<string, number>>((acc, item) => {
        const key = (item.type as string) || 'unknown';
        acc[key] = parseInt(String(item.count));
        return acc;
      }, {}),
      bySector: bySector.reduce<Record<string, number>>((acc, item) => {
        const key = (item.sector as string) || 'Unknown';
        acc[key] = parseInt(String(item.count));
        return acc;
      }, {}),
      byExchange: byExchange.reduce<Record<string, number>>((acc, item) => {
        const key = (item.exchange as string) || 'Unknown';
        acc[key] = parseInt(String(item.count));
        return acc;
      }, {})
    };
  }

  // Bulk update stocks
  static async bulkUpdateStocks(
    stockUpdates: Array<{ id: string; data: Partial<StockModel> }>
  ): Promise<void> {
    await this.transaction(async (trx) => {
      for (const update of stockUpdates) {
        await trx(this.tableName)
          .where('id', update.id)
          .update({
            ...update.data,
            updated_at: new Date()
          });
      }
    });
  }

  // Create stock (minimal fields); ensures symbol is uppercase and active
  static async createStock(data: {
    symbol: string;
    name: string;
    exchange: string;
    sector?: string;
    industry?: string;
    type?: 'stock' | 'etf' | 'mutual_fund';
  }): Promise<StockModel> {
    return this.create<StockModel>({
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      exchange: data.exchange,
      type: data.type || 'stock',
      sector: data.sector,
      industry: data.industry,
      currency: 'USD',
      country: 'US',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);
  }

  // Popular stocks by sector based on how many users track them
  static async getPopularStocksBySector(sector: string, limit: number = 10): Promise<StockModel[]> {
    return this.db(this.tableName)
      .select('stocks.*')
      .leftJoin('user_stocks', 'stocks.id', 'user_stocks.stock_id')
      .where('stocks.is_active', true)
      .andWhere('stocks.sector', sector)
      .groupBy('stocks.id')
      .orderByRaw('COUNT(user_stocks.id) DESC')
      .limit(limit);
  }

  // Simple suggestions: popular stocks the user doesn't already track
  static async getStockSuggestions(userId: string, limit: number = 10): Promise<StockModel[]> {
    const subquery = this.db('user_stocks')
      .select('stock_id')
      .where('user_id', userId);

    return this.db(this.tableName)
      .select('stocks.*')
      .leftJoin('user_stocks', 'stocks.id', 'user_stocks.stock_id')
      .where('stocks.is_active', true)
      .whereNotIn('stocks.id', subquery)
      .groupBy('stocks.id')
      .orderByRaw('COUNT(user_stocks.id) DESC')
      .limit(limit);
  }

}
