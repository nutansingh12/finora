import { BaseModel } from '@/models/BaseModel';

export interface StockGroupModel {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class StockGroup extends BaseModel {
  protected static tableName = 'stock_groups';

  // Create new stock group
  static async createGroup(data: {
    user_id: string;
    name: string;
    description?: string;
    color?: string;
    sort_order?: number;
  }): Promise<StockGroupModel> {
    // Get next sort order if not provided
    let sortOrder = data.sort_order;
    if (sortOrder === undefined) {
      const maxOrder = await this.db(this.tableName)
        .where('user_id', data.user_id)
        .max('sort_order as max_order')
        .first();
      
      sortOrder = (maxOrder?.max_order || 0) + 1;
    }

    return this.create<StockGroupModel>({
      ...data,
      color: data.color || this.generateRandomColor(),
      sort_order: sortOrder,
      is_active: true
    });
  }

  // Get user's stock groups
  static async getUserGroups(
    userId: string,
    options: {
      includeInactive?: boolean;
      includeStockCount?: boolean;
    } = {}
  ): Promise<Array<StockGroupModel & { stockCount?: number }>> {
    let query = this.db(this.tableName)
      .select('stock_groups.*')
      .where('user_id', userId);

    if (!options.includeInactive) {
      query = query.where('is_active', true);
    }

    if (options.includeStockCount) {
      query = query
        .select(
          'stock_groups.*',
          this.db.raw('COUNT(user_stocks.id) as stockCount')
        )
        .leftJoin('user_stocks', function() {
          this.on('user_stocks.group_id', '=', 'stock_groups.id')
              .andOn('user_stocks.is_active', '=', this.db.raw('true'));
        })
        .groupBy('stock_groups.id');
    }

    return query.orderBy('sort_order', 'asc');
  }

  // Update stock group
  static async updateGroup(
    groupId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      color?: string;
      sort_order?: number;
    }
  ): Promise<StockGroupModel | null> {
    // Verify group belongs to user
    const group = await this.findOne<StockGroupModel>({
      id: groupId,
      user_id: userId
    });

    if (!group) {
      return null;
    }

    return this.updateById<StockGroupModel>(groupId, updates);
  }

  // Delete stock group
  static async deleteGroup(groupId: string, userId: string): Promise<boolean> {
    // Verify group belongs to user
    const group = await this.findOne<StockGroupModel>({
      id: groupId,
      user_id: userId
    });

    if (!group) {
      return false;
    }

    // Move stocks to ungrouped (null group_id)
    await this.db('user_stocks')
      .where('group_id', groupId)
      .update({ group_id: null });

    // Delete the group
    await this.deleteById(groupId);
    return true;
  }

  // Reorder groups
  static async reorderGroups(
    userId: string,
    groupOrders: Array<{ id: string; sort_order: number }>
  ): Promise<void> {
    const transaction = await this.db.transaction();

    try {
      for (const { id, sort_order } of groupOrders) {
        await transaction(this.tableName)
          .where('id', id)
          .where('user_id', userId)
          .update({ sort_order });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Get group with stock count
  static async getGroupWithStockCount(
    groupId: string,
    userId: string
  ): Promise<(StockGroupModel & { stockCount: number }) | null> {
    const result = await this.db(this.tableName)
      .select(
        'stock_groups.*',
        this.db.raw('COUNT(user_stocks.id) as stockCount')
      )
      .leftJoin('user_stocks', function() {
        this.on('user_stocks.group_id', '=', 'stock_groups.id')
            .andOn('user_stocks.is_active', '=', this.db.raw('true'));
      })
      .where('stock_groups.id', groupId)
      .where('stock_groups.user_id', userId)
      .groupBy('stock_groups.id')
      .first();

    if (!result) return null;

    return {
      ...result,
      stockCount: parseInt(result.stockCount) || 0
    };
  }

  // Get default group for user (create if doesn't exist)
  static async getOrCreateDefaultGroup(userId: string): Promise<StockGroupModel> {
    let defaultGroup = await this.findOne<StockGroupModel>({
      user_id: userId,
      name: 'Default'
    });

    if (!defaultGroup) {
      defaultGroup = await this.createGroup({
        user_id: userId,
        name: 'Default',
        description: 'Default stock group',
        color: '#3B82F6'
      });
    }

    return defaultGroup;
  }

  // Get groups with their stocks
  static async getGroupsWithStocks(userId: string): Promise<Array<StockGroupModel & {
    stocks: any[];
  }>> {
    const groups = await this.getUserGroups(userId);
    
    const groupsWithStocks = await Promise.all(
      groups.map(async (group) => {
        const stocks = await this.db('user_stocks')
          .select(
            'user_stocks.*',
            'stocks.symbol',
            'stocks.name',
            'stocks.exchange'
          )
          .join('stocks', 'user_stocks.stock_id', 'stocks.id')
          .where('user_stocks.group_id', group.id)
          .where('user_stocks.is_active', true)
          .orderBy('user_stocks.added_at', 'desc');

        return {
          ...group,
          stocks
        };
      })
    );

    return groupsWithStocks;
  }

  // Move stocks between groups
  static async moveStocksToGroup(
    userId: string,
    stockIds: string[],
    targetGroupId: string | null
  ): Promise<number> {
    // Verify target group belongs to user (if not null)
    if (targetGroupId) {
      const targetGroup = await this.findOne<StockGroupModel>({
        id: targetGroupId,
        user_id: userId
      });

      if (!targetGroup) {
        throw new Error('Target group not found');
      }
    }

    // Update stocks
    return this.db('user_stocks')
      .where('user_id', userId)
      .whereIn('stock_id', stockIds)
      .where('is_active', true)
      .update({ group_id: targetGroupId });
  }

  // Get group statistics
  static async getGroupStatistics(userId: string): Promise<{
    totalGroups: number;
    activeGroups: number;
    totalStocksInGroups: number;
    ungroupedStocks: number;
  }> {
    const groupStats = await this.db(this.tableName)
      .select(
        this.db.raw('COUNT(*) as total_groups'),
        this.db.raw('COUNT(CASE WHEN is_active = true THEN 1 END) as active_groups')
      )
      .where('user_id', userId)
      .first();

    const stockStats = await this.db('user_stocks')
      .select(
        this.db.raw('COUNT(CASE WHEN group_id IS NOT NULL THEN 1 END) as stocks_in_groups'),
        this.db.raw('COUNT(CASE WHEN group_id IS NULL THEN 1 END) as ungrouped_stocks')
      )
      .where('user_id', userId)
      .where('is_active', true)
      .first();

    return {
      totalGroups: parseInt(groupStats?.total_groups) || 0,
      activeGroups: parseInt(groupStats?.active_groups) || 0,
      totalStocksInGroups: parseInt(stockStats?.stocks_in_groups) || 0,
      ungroupedStocks: parseInt(stockStats?.ungrouped_stocks) || 0
    };
  }

  // Search groups
  static async searchGroups(
    userId: string,
    searchTerm: string,
    limit: number = 10
  ): Promise<StockGroupModel[]> {
    return this.db(this.tableName)
      .select('*')
      .where('user_id', userId)
      .where('is_active', true)
      .where(function() {
        this.where('name', 'ilike', `%${searchTerm}%`)
            .orWhere('description', 'ilike', `%${searchTerm}%`);
      })
      .orderBy('name', 'asc')
      .limit(limit);
  }

  // Generate random color for new groups
  private static generateRandomColor(): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
      '#14B8A6', '#F43F5E', '#8B5A2B', '#6B7280', '#059669'
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
