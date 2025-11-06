import { BaseModel } from '@/models/BaseModel';

export interface UserStockModel {
  id: string;
  user_id: string;
  stock_id: string;
  target_price?: number;
  cutoff_price?: number;
  group_id?: string;
  notes?: string;
  is_active: boolean;
  added_at: Date;
  updated_at: Date;
}

export class UserStock extends BaseModel {
  protected static tableName = 'user_stocks';

  // Add stock to user's portfolio
  static async addUserStock(data: {
    user_id: string;
    stock_id: string;
    target_price?: number;
    cutoff_price?: number;
    group_id?: string;
    notes?: string;
  }): Promise<UserStockModel> {
    // Check if stock already exists for user
    const existing = await this.findOne<UserStockModel>({
      user_id: data.user_id,
      stock_id: data.stock_id,
      is_active: true
    });

    if (existing) {
      throw new Error('Stock already exists in user portfolio');
    }

    return this.create<UserStockModel>({
      ...data,
      is_active: true,
      added_at: new Date()
    });
  }

  // Get user's stocks with detailed information
  static async getUserStocks(
    userId: string,
    options: {
      groupId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
      onlyWithPrice?: boolean;
      prioritizeWithPrice?: boolean;
    } = {}
  ): Promise<Array<UserStockModel & {
    stock: any;
    currentPrice?: any;
    analysis?: any;
  }>> {
    let query = this.db(this.tableName)
      .select(
        'user_stocks.*',
        'stocks.symbol',
        'stocks.name',
        'stocks.exchange',
        'stocks.sector',
        'stocks.industry',
        'stock_groups.name as group_name',
        'stock_groups.color as group_color',
        'sp.price as current_price',
        'sp.change as price_change',
        'sp.change_percent as price_change_percent',
        'sp.volume as volume',
        'sp.market_cap as market_cap',
        'sp.fifty_two_week_low as sp_week_52_low',
        'sp.fifty_two_week_high as sp_week_52_high',
        'ra.week_52_low',
        'ra.week_24_low',
        'ra.week_12_low',
        'ra.percent_above_52w_low',
        'ra.percent_above_24w_low',
        'ra.percent_above_12w_low',
        'ra.volatility',
        'ra.trend_direction'
      )
      .leftJoin('stocks', 'user_stocks.stock_id', 'stocks.id')
      .leftJoin('stock_groups', 'user_stocks.group_id', 'stock_groups.id')
      .leftJoin('stock_prices as sp', function() {
        this.on('sp.stock_id', '=', 'user_stocks.stock_id')
            .andOn('sp.is_latest', '=', BaseModel.db.raw('?', [true]));
      })
      .leftJoin('rolling_analysis as ra', 'ra.stock_id', 'user_stocks.stock_id')
      .where('user_stocks.user_id', userId)
      .where('user_stocks.is_active', true);

    if (options.groupId) {
      query = query.where('user_stocks.group_id', options.groupId);
    }

    if (options.onlyWithPrice) {
      query = query.whereNotNull('sp.price');
    }

    // If requested, prioritize rows that have a current price
    if (options.prioritizeWithPrice) {
      query = query.orderByRaw('CASE WHEN sp.price IS NULL THEN 1 ELSE 0 END ASC');
    }

    // Sorting (secondary)
    const sortBy = options.sortBy || 'added_at';
    const sortOrder = options.sortOrder || 'desc';

    switch (sortBy) {
      case 'symbol':
        query = query.orderBy('stocks.symbol', sortOrder);
        break;
      case 'name':
        query = query.orderBy('stocks.name', sortOrder);
        break;
      case 'currentPrice':
        query = query.orderBy('sp.price', sortOrder);
        break;
      case 'targetPrice':
        query = query.orderBy('user_stocks.target_price', sortOrder);
        break;
      case 'addedAt':
      default:
        query = query.orderBy('user_stocks.added_at', sortOrder);
        break;
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  // Update user stock
  static async updateUserStock(
    userId: string,
    stockId: string,
    updates: {
      target_price?: number;
      cutoff_price?: number;
      group_id?: string;
      notes?: string;
    }
  ): Promise<UserStockModel | null> {
    const existing = await this.findOne<UserStockModel>({
      user_id: userId,
      stock_id: stockId,
      is_active: true
    });

    if (!existing) {
      return null;
    }

    return this.updateById<UserStockModel>(existing.id, {
      ...updates,
      updated_at: new Date()
    });
  }

  // Remove stock from user's portfolio
  static async removeUserStock(userId: string, stockId: string): Promise<boolean> {
    const result = await this.db(this.tableName)
      .where('user_id', userId)
      .where('stock_id', stockId)
      .where('is_active', true)
      .update({
        is_active: false,
        updated_at: new Date()
      });

    return result > 0;
  }

  // Get recently added stocks
  static async getRecentlyAddedStocks(
    userId: string,
    limit: number = 10
  ): Promise<Array<UserStockModel & { stock: any }>> {
    return this.db(this.tableName)
      .select(
        'user_stocks.*',
        'stocks.symbol',
        'stocks.name',
        'stocks.exchange'
      )
      .join('stocks', 'user_stocks.stock_id', 'stocks.id')
      .where('user_stocks.user_id', userId)
      .where('user_stocks.is_active', true)
      .orderBy('user_stocks.added_at', 'desc')
      .limit(limit);
  }

  // Bulk update user stocks
  static async bulkUpdateUserStocks(
    userId: string,
    stockIds: string[],
    updates: {
      target_price?: number;
      cutoff_price?: number;
      group_id?: string;
      notes?: string;
    }
  ): Promise<number> {
    return this.db(this.tableName)
      .where('user_id', userId)
      .whereIn('stock_id', stockIds)
      .where('is_active', true)
      .update({
        ...updates,
        updated_at: new Date()
      });
  }

  // Get portfolio statistics
  static async getPortfolioStats(userId: string): Promise<{
    totalStocks: number;
    stocksWithTargets: number;
    stocksWithCutoffs: number;
    averageTargetPrice: number;
    groupedStocks: number;
    ungroupedStocks: number;
  }> {
    const stats = await this.db(this.tableName)
      .select(
        this.db.raw('COUNT(*) as total_stocks'),
        this.db.raw('COUNT(CASE WHEN target_price IS NOT NULL THEN 1 END) as stocks_with_targets'),
        this.db.raw('COUNT(CASE WHEN cutoff_price IS NOT NULL THEN 1 END) as stocks_with_cutoffs'),
        this.db.raw('AVG(target_price) as average_target_price'),
        this.db.raw('COUNT(CASE WHEN group_id IS NOT NULL THEN 1 END) as grouped_stocks'),
        this.db.raw('COUNT(CASE WHEN group_id IS NULL THEN 1 END) as ungrouped_stocks')
      )
      .where('user_id', userId)
      .where('is_active', true)
      .first();

    return {
      totalStocks: parseInt(stats?.total_stocks) || 0,
      stocksWithTargets: parseInt(stats?.stocks_with_targets) || 0,
      stocksWithCutoffs: parseInt(stats?.stocks_with_cutoffs) || 0,
      averageTargetPrice: parseFloat(stats?.average_target_price) || 0,
      groupedStocks: parseInt(stats?.grouped_stocks) || 0,
      ungroupedStocks: parseInt(stats?.ungrouped_stocks) || 0
    };
  }

  // Search user's stocks
  static async searchUserStocks(
    userId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<Array<UserStockModel & { stock: any }>> {
    return this.db(this.tableName)
      .select(
        'user_stocks.*',
        'stocks.symbol',
        'stocks.name',
        'stocks.exchange',
        'stocks.sector'
      )
      .join('stocks', 'user_stocks.stock_id', 'stocks.id')
      .where('user_stocks.user_id', userId)
      .where('user_stocks.is_active', true)
      .where(function() {
        this.where('stocks.symbol', 'ilike', `%${searchTerm}%`)
            .orWhere('stocks.name', 'ilike', `%${searchTerm}%`)
            .orWhere('user_stocks.notes', 'ilike', `%${searchTerm}%`);
      })
      .orderBy('stocks.symbol', 'asc')
      .limit(limit);
  }

  // Get stocks by group
  static async getStocksByGroup(
    userId: string,
    groupId: string | null
  ): Promise<Array<UserStockModel & { stock: any }>> {
    let query = this.db(this.tableName)
      .select(
        'user_stocks.*',
        'stocks.symbol',
        'stocks.name',
        'stocks.exchange'
      )
      .join('stocks', 'user_stocks.stock_id', 'stocks.id')
      .where('user_stocks.user_id', userId)
      .where('user_stocks.is_active', true);

    if (groupId === null) {
      query = query.whereNull('user_stocks.group_id');
    } else {
      query = query.where('user_stocks.group_id', groupId);
    }

    return query.orderBy('user_stocks.added_at', 'desc');
  }

  // Get stocks with alerts
  static async getStocksWithAlerts(userId: string): Promise<Array<UserStockModel & {
    stock: any;
    alertCount: number;
  }>> {
    return this.db(this.tableName)
      .select(
        'user_stocks.*',
        'stocks.symbol',
        'stocks.name',
        'stocks.exchange',
        this.db.raw('COUNT(alerts.id) as alert_count')
      )
      .join('stocks', 'user_stocks.stock_id', 'stocks.id')
      .leftJoin('alerts', function() {
        this.on('alerts.stock_id', '=', 'user_stocks.stock_id')
            .andOn('alerts.user_id', '=', 'user_stocks.user_id');
            this.on('alerts.is_active', '=', BaseModel.db.raw('true'));
      })
      .where('user_stocks.user_id', userId)
      .where('user_stocks.is_active', true)
      .groupBy('user_stocks.id', 'stocks.id')
      .having(this.db.raw('COUNT(alerts.id)'), '>', 0)
      .orderBy('alert_count', 'desc');
  }

  // Get value opportunities (stocks near lows)
  static async getValueOpportunities(
    userId: string,
    threshold: number = 20
  ): Promise<Array<UserStockModel & {
    stock: any;
    analysis: any;
  }>> {
    return this.db(this.tableName)
      .select(
        'user_stocks.*',
        'stocks.symbol',
        'stocks.name',
        'stocks.exchange',
        'ra.percent_above_52w_low',
        'ra.percent_above_24w_low',
        'ra.percent_above_12w_low'
      )
      .join('stocks', 'user_stocks.stock_id', 'stocks.id')
      .join('rolling_analysis as ra', 'ra.stock_id', 'user_stocks.stock_id')
      .where('user_stocks.user_id', userId)
      .where('user_stocks.is_active', true)
      .where('ra.percent_above_52w_low', '<=', threshold)
      .orderBy('ra.percent_above_52w_low', 'asc');
  }

  // Check if user owns stock
  static async userOwnsStock(userId: string, stockId: string): Promise<boolean> {
    const stock = await this.findOne<UserStockModel>({
      user_id: userId,
      stock_id: stockId,
      is_active: true
    });

    return !!stock;
  }

  // Get user stock by ID
  static async getUserStock(
    userId: string,
    stockId: string
  ): Promise<UserStockModel | null> {
    return this.findOne<UserStockModel>({
      user_id: userId,
      stock_id: stockId,
      is_active: true
    });
  }
}
