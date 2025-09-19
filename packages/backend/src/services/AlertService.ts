import { BaseModel } from '../models/BaseModel';
import { Alert } from '../models/Alert';
import { StockPrice } from '../models/StockPrice';
import { UserStock } from '../models/UserStock';
import { NotificationService } from './NotificationService';
import { EmailService } from './EmailService';

export interface AlertTrigger {
  alertId: string;
  userId: string;
  stockId: string;
  symbol: string;
  alertType: 'price_below' | 'price_above' | 'target_reached' | 'cutoff_reached';
  targetPrice: number;
  currentPrice: number;
  message: string;
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  triggeredToday: number;
  byType: {
    price_below: number;
    price_above: number;
    target_reached: number;
    cutoff_reached: number;
  };
}

export class AlertService {
  private static notificationService = new NotificationService();
  private static emailService = new EmailService();

  // Check all active alerts and trigger notifications
  static async checkAllAlerts(): Promise<AlertTrigger[]> {
    const activeAlerts = await Alert.getActiveAlerts();
    const triggeredAlerts: AlertTrigger[] = [];

    for (const alert of activeAlerts) {
      const currentPrice = await StockPrice.getLatestPrice(alert.stock_id);
      
      if (!currentPrice) continue;

      const shouldTrigger = this.shouldTriggerAlert(alert, currentPrice.price);
      
      if (shouldTrigger) {
        const trigger = await this.triggerAlert(alert, currentPrice.price);
        if (trigger) {
          triggeredAlerts.push(trigger);
        }
      }
    }

    return triggeredAlerts;
  }

  // Check alerts for a specific user
  static async checkUserAlerts(userId: string): Promise<AlertTrigger[]> {
    const userAlerts = await Alert.getUserAlerts(userId, { activeOnly: true });
    const triggeredAlerts: AlertTrigger[] = [];

    for (const alert of userAlerts) {
      const currentPrice = await StockPrice.getLatestPrice(alert.stock_id);
      
      if (!currentPrice) continue;

      const shouldTrigger = this.shouldTriggerAlert(alert, currentPrice.price);
      
      if (shouldTrigger) {
        const trigger = await this.triggerAlert(alert, currentPrice.price);
        if (trigger) {
          triggeredAlerts.push(trigger);
        }
      }
    }

    return triggeredAlerts;
  }

  // Check alerts for a specific stock
  static async checkStockAlerts(stockId: string): Promise<AlertTrigger[]> {
    const stockAlerts = await Alert.getStockAlerts(stockId);
    const triggeredAlerts: AlertTrigger[] = [];
    
    const currentPrice = await StockPrice.getLatestPrice(stockId);
    if (!currentPrice) return triggeredAlerts;

    for (const alert of stockAlerts) {
      const shouldTrigger = this.shouldTriggerAlert(alert, currentPrice.price);
      
      if (shouldTrigger) {
        const trigger = await this.triggerAlert(alert, currentPrice.price);
        if (trigger) {
          triggeredAlerts.push(trigger);
        }
      }
    }

    return triggeredAlerts;
  }

  // Create automatic alerts based on user stock settings
  static async createAutomaticAlerts(userId: string, stockId: string): Promise<void> {
    const userStock = await UserStock.findOne({
      user_id: userId,
      stock_id: stockId,
      is_active: true
    });

    if (!userStock) return;

    // Create target price alert if target price is set
    if (userStock.target_price) {
      await Alert.createAlert({
        user_id: userId,
        stock_id: stockId,
        alert_type: 'target_reached',
        target_price: userStock.target_price,
        is_active: true
      });
    }

    // Create cutoff price alert if cutoff price is set
    if (userStock.cutoff_price) {
      await Alert.createAlert({
        user_id: userId,
        stock_id: stockId,
        alert_type: 'cutoff_reached',
        target_price: userStock.cutoff_price,
        is_active: true
      });
    }
  }

  // Update cutoff prices based on 52-week low
  static async updateCutoffPrices(): Promise<number> {
    const query = `
      UPDATE user_stocks 
      SET cutoff_price = (
        SELECT ra.low_52w * 1.1 
        FROM rolling_analysis ra 
        WHERE ra.stock_id = user_stocks.stock_id 
          AND ra.is_latest = true
      )
      WHERE cutoff_price IS NULL 
        AND is_active = true
        AND EXISTS (
          SELECT 1 FROM rolling_analysis ra 
          WHERE ra.stock_id = user_stocks.stock_id 
            AND ra.is_latest = true
        )
    `;

    const result = await BaseModel.db.raw(query);
    return result.affectedRows || 0;
  }

  // Get alert statistics for a user
  static async getAlertStats(userId: string): Promise<AlertStats> {
    const stats = await BaseModel.db('alerts')
      .select(
        BaseModel.db.raw('COUNT(*) as total_alerts'),
        BaseModel.db.raw('COUNT(CASE WHEN is_active = true THEN 1 END) as active_alerts'),
        BaseModel.db.raw('COUNT(CASE WHEN DATE(triggered_at) = CURDATE() THEN 1 END) as triggered_today'),
        BaseModel.db.raw('COUNT(CASE WHEN alert_type = "price_below" THEN 1 END) as price_below'),
        BaseModel.db.raw('COUNT(CASE WHEN alert_type = "price_above" THEN 1 END) as price_above'),
        BaseModel.db.raw('COUNT(CASE WHEN alert_type = "target_reached" THEN 1 END) as target_reached'),
        BaseModel.db.raw('COUNT(CASE WHEN alert_type = "cutoff_reached" THEN 1 END) as cutoff_reached')
      )
      .where('user_id', userId)
      .first();

    return {
      totalAlerts: parseInt(stats?.total_alerts) || 0,
      activeAlerts: parseInt(stats?.active_alerts) || 0,
      triggeredToday: parseInt(stats?.triggered_today) || 0,
      byType: {
        price_below: parseInt(stats?.price_below) || 0,
        price_above: parseInt(stats?.price_above) || 0,
        target_reached: parseInt(stats?.target_reached) || 0,
        cutoff_reached: parseInt(stats?.cutoff_reached) || 0
      }
    };
  }

  // Bulk create alerts
  static async bulkCreateAlerts(alerts: Array<{
    user_id: string;
    stock_id: string;
    alert_type: string;
    target_price: number;
    message?: string;
  }>): Promise<number> {
    const validAlerts = alerts.filter(alert => 
      alert.user_id && alert.stock_id && alert.target_price > 0
    );

    if (validAlerts.length === 0) return 0;

    await BaseModel.db('alerts').insert(
      validAlerts.map(alert => ({
        ...alert,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }))
    );

    return validAlerts.length;
  }

  // Clean up old triggered alerts
  static async cleanupOldAlerts(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await BaseModel.db('alerts')
      .where('is_active', false)
      .where('triggered_at', '<', cutoffDate)
      .del();

    return result;
  }

  // Private helper methods
  private static shouldTriggerAlert(alert: any, currentPrice: number): boolean {
    // Prevent triggering the same alert multiple times within a short period
    if (alert.triggered_at) {
      const timeSinceLastTrigger = Date.now() - new Date(alert.triggered_at).getTime();
      const cooldownPeriod = 60 * 60 * 1000; // 1 hour
      
      if (timeSinceLastTrigger < cooldownPeriod) {
        return false;
      }
    }

    switch (alert.alert_type) {
      case 'price_below':
        return currentPrice <= alert.target_price;
      
      case 'price_above':
        return currentPrice >= alert.target_price;
      
      case 'target_reached':
        return currentPrice >= alert.target_price;
      
      case 'cutoff_reached':
        return currentPrice <= alert.target_price;
      
      default:
        return false;
    }
  }

  private static async triggerAlert(alert: any, currentPrice: number): Promise<AlertTrigger | null> {
    try {
      // Update alert as triggered
      await Alert.updateById(alert.id, {
        triggered_at: new Date(),
        is_active: false // Deactivate after triggering
      });

      // Get stock information
      const stock = await BaseModel.db('stocks')
        .select('symbol', 'name')
        .where('id', alert.stock_id)
        .first();

      if (!stock) return null;

      const message = this.generateAlertMessage(
        alert.alert_type,
        stock.symbol,
        stock.name,
        alert.target_price,
        currentPrice
      );

      const trigger: AlertTrigger = {
        alertId: alert.id,
        userId: alert.user_id,
        stockId: alert.stock_id,
        symbol: stock.symbol,
        alertType: alert.alert_type,
        targetPrice: alert.target_price,
        currentPrice,
        message
      };

      // Send notifications
      await this.sendNotifications(trigger);

      return trigger;
    } catch (error) {
      console.error('Error triggering alert:', error);
      return null;
    }
  }

  private static generateAlertMessage(
    alertType: string,
    symbol: string,
    name: string,
    targetPrice: number,
    currentPrice: number
  ): string {
    const formatPrice = (price: number) => `$${price.toFixed(2)}`;

    switch (alertType) {
      case 'price_below':
        return `${symbol} (${name}) has dropped to ${formatPrice(currentPrice)}, below your alert price of ${formatPrice(targetPrice)}`;
      
      case 'price_above':
        return `${symbol} (${name}) has risen to ${formatPrice(currentPrice)}, above your alert price of ${formatPrice(targetPrice)}`;
      
      case 'target_reached':
        return `🎯 Target reached! ${symbol} (${name}) has reached ${formatPrice(currentPrice)}, meeting your target of ${formatPrice(targetPrice)}`;
      
      case 'cutoff_reached':
        return `⚠️ Cutoff alert: ${symbol} (${name}) has dropped to ${formatPrice(currentPrice)}, reaching your cutoff price of ${formatPrice(targetPrice)}`;
      
      default:
        return `Price alert for ${symbol}: ${formatPrice(currentPrice)}`;
    }
  }

  private static async sendNotifications(trigger: AlertTrigger): Promise<void> {
    try {
      // Send push notification
      await this.notificationService.sendPushNotification(trigger.userId, {
        title: 'Price Alert',
        body: trigger.message,
        data: {
          type: 'price_alert',
          stockId: trigger.stockId,
          symbol: trigger.symbol,
          alertId: trigger.alertId
        }
      });

      // Send email notification (if user has email notifications enabled)
      const user = await BaseModel.db('users')
        .select('email', 'email_notifications')
        .where('id', trigger.userId)
        .first();

      if (user && user.email_notifications) {
        await this.emailService.sendAlertEmail(
          user.email,
          trigger.symbol,
          trigger.message
        );
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }
}
