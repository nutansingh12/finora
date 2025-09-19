import { BaseModel } from './BaseModel';

export interface UserStockModel {
  id: string;
  user_id: string;
  stock_id: string;
  group_id?: string;
  target_price?: number;
  cutoff_price?: number;
  notes?: string;
  is_active: boolean;
  added_at: Date;
  created_at: Date;
  updated_at: Date;
}

export class UserStock extends BaseModel {
  protected static tableName = 'user_stocks';

  // Add stock to user's portfolio
  static async addUserStock(data: {
    user_id: string;
    stock_id: string;
    group_id?: string;
    target_price?: number;
    cutoff_price?: number;
    notes?: string;
  }): Promise<UserStockModel> {
    // Check if user already has this stock
    const existing = await this.findOne<UserStockModel>({
      user_id: data.user_id,
      stock_id: data.stock_id
    });

    if (existing) {
      // Reactivate if it was deactivated
      if (!existing.is_active) {
        return this.updateById<UserStockModel>(existing.id, {
          ...data,
          is_active: true,
          added_at: new Date()
        }) as Promise<UserStockModel>;
      }
      throw new Error('Stock already exists in portfolio');
    }

    return this.create<UserStockModel>({
      ...data,
      is_active: true,
      added_at: new Date()
    });
  }

  // Get user's stocks with details
  static async getUserStocks(
    userId: string,
    options: {
      groupId?: string;
      includeInactive?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Array<UserStockModel & {
    stock: any;
    currentPrice?: any;
    analysis?: any;
    group?: any;
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
        'stock_groups.color as group_color'
      )
      .leftJoin('stocks', 'user_stocks.stock_id', 'stocks.id')
      .leftJoin('stock_groups', 'user_stocks.group_id', 'stock_groups.id')
      .where('user_stocks.user_id', userId);

    if (!options.includeInactive) {
      query = query.where('user_stocks.is_active', true);
    }

    if (options.groupId) {
      query = query.where('user_stocks.group_id', options.groupId);
    }

    // Apply sorting
    if (options.sortBy) {
      const direction = options.sortOrder || 'asc';
      switch (options.sortBy) {
        case 'symbol':
          query = query.orderBy('stocks.symbol', direction);
          break;
        case 'name':
          query = query.orderBy('stocks.name', direction);
          break;
        case 'addedAt':
          query = query.orderBy('user_stocks.added_at', direction);
          break;
        default:
          query = query.orderBy('user_stocks.added_at', 'desc');
      }
    } else {
      query = query.orderBy('user_stocks.added_at', 'desc');
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  // Get recently added stocks (within last hour)
  static async getRecentlyAddedStocks(userId: string): Promise<UserStockModel[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return this.findAll<UserStockModel>({
      user_id: userId,
      is_active: true,
      added_at: { '>=': oneHourAgo }
    }, {
      orderBy: 'added_at',
      orderDirection: 'desc'
    });
  }

  // Update user stock
  static async updateUserStock(
    userId: string,
    stockId: string,
    updates: {
      group_id?: string;
      target_price?: number;
      cutoff_price?: number;
      notes?: string;
    }
  ): Promise<UserStockModel | null> {
    const userStock = await this.findOne<UserStockModel>({
      user_id: userId,
      stock_id: stockId,
      is_active: true
    });

    if (!userStock) {
      return null;
    }

    return this.updateById<UserStockModel>(userStock.id, updates);
  }

  // Remove stock from user's portfolio
  static async removeUserStock(userId: string, stockId: string): Promise<boolean> {
    const userStock = await this.findOne<UserStockModel>({
      user_id: userId,
      stock_id: stockId,
      is_active: true
    });

    if (!userStock) {
      return false;
    }

    await this.updateById(userStock.id, { is_active: false });
    return true;
  }

  // Bulk update user stocks
  static async bulkUpdateUserStocks(
    userId: string,
    stockIds: string[],
    updates: {
      group_id?: string;
      target_price?: number;
      cutoff_price?: number;
    }
  ): Promise<number> {
    return this.updateWhere({
      user_id: userId,
      stock_id: stockIds,
      is_active: true
    }, updates);
  }

  // Get stocks by group
  static async getStocksByGroup(userId: string, groupId: string): Promise<UserStockModel[]> {
    return this.findAll<UserStockModel>({
      user_id: userId,
      group_id: groupId,
      is_active: true
    }, {
      orderBy: 'added_at',
      orderDirection: 'desc'
    });
  }

  // Move stocks to different group
  static async moveStocksToGroup(
    userId: string,
    stockIds: string[],
    groupId: string | null
  ): Promise<number> {
    return this.updateWhere({
      user_id: userId,
      stock_id: stockIds,
      is_active: true
    }, {
      group_id: groupId
    });
  }

  // Get all tracked stocks (for price updates)
  static async getTrackedStocks(): Promise<Array<{ stock_id: string; symbol: string }>> {
    return this.db(this.tableName)
      .select('user_stocks.stock_id', 'stocks.symbol')
      .join('stocks', 'user_stocks.stock_id', 'stocks.id')
      .where('user_stocks.is_active', true)
      .where('stocks.is_active', true)
      .groupBy('user_stocks.stock_id', 'stocks.symbol');
  }

  // Get user's portfolio statistics
  static async getPortfolioStats(userId: string): Promise<{
    totalStocks: number;
    totalGroups: number;
    recentlyAdded: number;
    withTargetPrice: number;
    withCutoffPrice: number;
    withNotes: number;
  }> {
    const stats = await this.db(this.tableName)
      .select(
        this.db.raw('COUNT(*) as total_stocks'),
        this.db.raw('COUNT(DISTINCT group_id) as total_groups'),
        this.db.raw('COUNT(CASE WHEN target_price IS NOT NULL THEN 1 END) as with_target_price'),
        this.db.raw('COUNT(CASE WHEN cutoff_price IS NOT NULL THEN 1 END) as with_cutoff_price'),
        this.db.raw('COUNT(CASE WHEN notes IS NOT NULL AND notes != \'\' THEN 1 END) as with_notes')
      )
      .where('user_id', userId)
      .where('is_active', true)
      .first();

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentlyAdded = await this.count({
      user_id: userId,
      is_active: true,
      added_at: { '>=': oneHourAgo }
    });

    return {
      totalStocks: parseInt(stats?.total_stocks) || 0,
      totalGroups: parseInt(stats?.total_groups) || 0,
      recentlyAdded,
      withTargetPrice: parseInt(stats?.with_target_price) || 0,
      withCutoffPrice: parseInt(stats?.with_cutoff_price) || 0,
      withNotes: parseInt(stats?.with_notes) || 0
    };
  }

  // Get stocks with alerts
  static async getStocksWithAlerts(userId: string): Promise<Array<{
    stock_id: string;
    symbol: string;
    name: string;
    target_price?: number;
    cutoff_price?: number;
    current_price?: number;
    alert_count: number;
  }>> {
    return this.db(this.tableName)
      .select(
        'user_stocks.stock_id',
        'stocks.symbol',
        'stocks.name',
        'user_stocks.target_price',
        'user_stocks.cutoff_price',
        this.db.raw('COUNT(alerts.id) as alert_count')
      )
      .join('stocks', 'user_stocks.stock_id', 'stocks.id')
      .leftJoin('alerts', function() {
        this.on('alerts.stock_id', '=', 'user_stocks.stock_id')
            .andOn('alerts.user_id', '=', 'user_stocks.user_id')
            .andOn('alerts.is_active', '=', this.db.raw('true'));
      })
      .where('user_stocks.user_id', userId)
      .where('user_stocks.is_active', true)
      .groupBy(
        'user_stocks.stock_id',
        'stocks.symbol',
        'stocks.name',
        'user_stocks.target_price',
        'user_stocks.cutoff_price'
      )
      .having('alert_count', '>', 0)
      .orderBy('alert_count', 'desc');
  }

  // Search user's stocks
  static async searchUserStocks(
    userId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<UserStockModel[]> {
    const term = searchTerm.toLowerCase();

    return this.db(this.tableName)
      .select('user_stocks.*', 'stocks.symbol', 'stocks.name')
      .join('stocks', 'user_stocks.stock_id', 'stocks.id')
      .where('user_stocks.user_id', userId)
      .where('user_stocks.is_active', true)
      .where(function() {
        this.where('stocks.symbol', 'ilike', `%${term}%`)
            .orWhere('stocks.name', 'ilike', `%${term}%`)
            .orWhere('user_stocks.notes', 'ilike', `%${term}%`);
      })
      .orderByRaw(`
        CASE 
          WHEN LOWER(stocks.symbol) = ? THEN 1
          WHEN LOWER(stocks.symbol) LIKE ? THEN 2
          WHEN LOWER(stocks.name) LIKE ? THEN 3
          ELSE 4
        END
      `, [term, `${term}%`, `%${term}%`])
      .limit(limit);
  }
}
