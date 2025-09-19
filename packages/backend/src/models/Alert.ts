import { BaseModel } from '@/models/BaseModel';

export interface AlertModel {
  id: string;
  user_id: string;
  stock_id: string;
  alert_type: 'price_below' | 'price_above' | 'target_reached' | 'cutoff_reached';
  target_price: number;
  message?: string;
  is_active: boolean;
  triggered_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export class Alert extends BaseModel {
  protected static tableName = 'alerts';

  // Create new alert
  static async createAlert(data: {
    user_id: string;
    stock_id: string;
    alert_type: string;
    target_price: number;
    message?: string;
    is_active?: boolean;
  }): Promise<AlertModel> {
    return this.create<AlertModel>({
      ...data,
      is_active: data.is_active !== undefined ? data.is_active : true
    });
  }

  // Get user's alerts
  static async getUserAlerts(
    userId: string,
    options: {
      activeOnly?: boolean;
      stockId?: string;
      alertType?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Array<AlertModel & {
    stock: any;
    currentPrice?: any;
  }>> {
    let query = this.db(this.tableName)
      .select(
        'alerts.*',
        'stocks.symbol',
        'stocks.name',
        'stocks.exchange',
        'sp.price as current_price',
        'sp.change as price_change',
        'sp.change_percent as price_change_percent'
      )
      .leftJoin('stocks', 'alerts.stock_id', 'stocks.id')
      .leftJoin('stock_prices as sp', function() {
        this.on('sp.stock_id', '=', 'alerts.stock_id')
            .andOn('sp.is_latest', '=', this.db.raw('true'));
      })
      .where('alerts.user_id', userId);

    if (options.activeOnly) {
      query = query.where('alerts.is_active', true);
    }

    if (options.stockId) {
      query = query.where('alerts.stock_id', options.stockId);
    }

    if (options.alertType) {
      query = query.where('alerts.alert_type', options.alertType);
    }

    query = query.orderBy('alerts.created_at', 'desc');

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  // Get active alerts for checking
  static async getActiveAlerts(): Promise<AlertModel[]> {
    return this.findAll<AlertModel>({
      is_active: true
    }, {
      orderBy: 'created_at',
      orderDirection: 'desc'
    });
  }

  // Get alerts for a specific stock
  static async getStockAlerts(stockId: string): Promise<AlertModel[]> {
    return this.findAll<AlertModel>({
      stock_id: stockId,
      is_active: true
    });
  }

  // Update alert
  static async updateAlert(
    alertId: string,
    updates: {
      alert_type?: string;
      target_price?: number;
      message?: string;
      is_active?: boolean;
      triggered_at?: Date;
    }
  ): Promise<AlertModel | null> {
    return this.updateById<AlertModel>(alertId, updates);
  }

  // Bulk delete user alerts
  static async bulkDeleteUserAlerts(userId: string, alertIds: string[]): Promise<number> {
    return this.db(this.tableName)
      .where('user_id', userId)
      .whereIn('id', alertIds)
      .del();
  }

  // Get triggered alerts for user
  static async getTriggeredAlerts(
    userId: string,
    options: {
      limit?: number;
      since?: Date;
    } = {}
  ): Promise<AlertModel[]> {
    let query = this.db(this.tableName)
      .select('alerts.*', 'stocks.symbol', 'stocks.name')
      .leftJoin('stocks', 'alerts.stock_id', 'stocks.id')
      .where('alerts.user_id', userId)
      .whereNotNull('alerts.triggered_at')
      .orderBy('alerts.triggered_at', 'desc');

    if (options.since) {
      query = query.where('alerts.triggered_at', '>=', options.since);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    return query;
  }

  // Mark alert as triggered
  static async markAsTriggered(alertId: string): Promise<AlertModel | null> {
    return this.updateById<AlertModel>(alertId, {
      triggered_at: new Date(),
      is_active: false
    });
  }

  // Get alert statistics
  static async getAlertStatistics(userId: string): Promise<{
    total: number;
    active: number;
    triggered: number;
    byType: Record<string, number>;
  }> {
    const stats = await this.db(this.tableName)
      .select(
        this.db.raw('COUNT(*) as total'),
        this.db.raw('COUNT(CASE WHEN is_active = true THEN 1 END) as active'),
        this.db.raw('COUNT(CASE WHEN triggered_at IS NOT NULL THEN 1 END) as triggered'),
        this.db.raw('COUNT(CASE WHEN alert_type = "price_below" THEN 1 END) as price_below'),
        this.db.raw('COUNT(CASE WHEN alert_type = "price_above" THEN 1 END) as price_above'),
        this.db.raw('COUNT(CASE WHEN alert_type = "target_reached" THEN 1 END) as target_reached'),
        this.db.raw('COUNT(CASE WHEN alert_type = "cutoff_reached" THEN 1 END) as cutoff_reached')
      )
      .where('user_id', userId)
      .first();

    return {
      total: parseInt(stats?.total) || 0,
      active: parseInt(stats?.active) || 0,
      triggered: parseInt(stats?.triggered) || 0,
      byType: {
        price_below: parseInt(stats?.price_below) || 0,
        price_above: parseInt(stats?.price_above) || 0,
        target_reached: parseInt(stats?.target_reached) || 0,
        cutoff_reached: parseInt(stats?.cutoff_reached) || 0
      }
    };
  }

  // Clean up old triggered alerts
  static async cleanupOldAlerts(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.db(this.tableName)
      .where('is_active', false)
      .where('triggered_at', '<', cutoffDate)
      .del();
  }

  // Get alerts that need checking (active alerts with recent price data)
  static async getAlertsForChecking(): Promise<Array<AlertModel & {
    symbol: string;
    currentPrice: number;
  }>> {
    return this.db(this.tableName)
      .select(
        'alerts.*',
        'stocks.symbol',
        'sp.price as currentPrice'
      )
      .join('stocks', 'alerts.stock_id', 'stocks.id')
      .join('stock_prices as sp', function() {
        this.on('sp.stock_id', '=', 'alerts.stock_id')
            .andOn('sp.is_latest', '=', this.db.raw('true'));
      })
      .where('alerts.is_active', true)
      .where('stocks.is_active', true);
  }

  // Reactivate alert
  static async reactivateAlert(alertId: string): Promise<AlertModel | null> {
    return this.updateById<AlertModel>(alertId, {
      is_active: true,
      triggered_at: null
    });
  }

  // Get alerts by stock for user
  static async getUserStockAlerts(userId: string, stockId: string): Promise<AlertModel[]> {
    return this.findAll<AlertModel>({
      user_id: userId,
      stock_id: stockId
    }, {
      orderBy: 'created_at',
      orderDirection: 'desc'
    });
  }
}
