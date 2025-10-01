import { Request, Response } from 'express';
import { Alert } from '@/models/Alert';
import { AlertService } from '@/services/AlertService';

export class AlertController {
  // Get user's alerts
  static async getUserAlerts(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const { activeOnly, stockId, alertType, limit, offset } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const options = {
        activeOnly: activeOnly === 'true',
        stockId: stockId as string,
        alertType: alertType as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      };

      const alerts = await Alert.getUserAlerts(userId, options);

      res.json({
        success: true,
        data: { alerts }
      });
    } catch (error) {
      console.error('Get user alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create new alert
  static async createAlert(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const { stockId, alertType, targetPrice, message } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Validate required fields
      if (!stockId || !alertType || !targetPrice) {
        return res.status(400).json({
          success: false,
          message: 'Stock ID, alert type, and target price are required'
        });
      }

      // Validate alert type
      const validAlertTypes = ['price_below', 'price_above', 'target_reached', 'cutoff_reached'];
      if (!validAlertTypes.includes(alertType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid alert type'
        });
      }

      // Validate target price
      if (isNaN(targetPrice) || targetPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Target price must be a positive number'
        });
      }

      const alert = await Alert.createAlert({
        user_id: userId,
        stock_id: stockId,
        alert_type: alertType,
        target_price: parseFloat(targetPrice),
        message,
        is_active: true
      });

      res.status(201).json({
        success: true,
        message: 'Alert created successfully',
        data: { alert }
      });
    } catch (error) {
      console.error('Create alert error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update alert
  static async updateAlert(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const { alertId } = req.params;
      const { alertType, targetPrice, message, isActive } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Check if alert belongs to user
      const existingAlert = await Alert.findOne({
        id: alertId,
        user_id: userId
      });

      if (!existingAlert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found'
        });
      }

      const updates: any = {};
      
      if (alertType !== undefined) {
        const validAlertTypes = ['price_below', 'price_above', 'target_reached', 'cutoff_reached'];
        if (!validAlertTypes.includes(alertType)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid alert type'
          });
        }
        updates.alert_type = alertType;
      }

      if (targetPrice !== undefined) {
        if (isNaN(targetPrice) || targetPrice <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Target price must be a positive number'
          });
        }
        updates.target_price = parseFloat(targetPrice);
      }

      if (message !== undefined) {
        updates.message = message;
      }

      if (isActive !== undefined) {
        updates.is_active = Boolean(isActive);
      }

      const updatedAlert = await Alert.updateById(alertId as string, updates);

      res.json({
        success: true,
        message: 'Alert updated successfully',
        data: { alert: updatedAlert }
      });
    } catch (error) {
      console.error('Update alert error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete alert
  static async deleteAlert(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const { alertId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Check if alert belongs to user
      const existingAlert = await Alert.findOne({
        id: alertId,
        user_id: userId
      });

      if (!existingAlert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found'
        });
      }

      await Alert.deleteById(alertId as string);

      res.json({
        success: true,
        message: 'Alert deleted successfully'
      });
    } catch (error) {
      console.error('Delete alert error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Bulk delete alerts
  static async bulkDeleteAlerts(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const { alertIds } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Alert IDs are required'
        });
      }

      const deletedCount = await Alert.bulkDeleteUserAlerts(userId, alertIds);

      res.json({
        success: true,
        message: `${deletedCount} alerts deleted successfully`,
        data: { deletedCount }
      });
    } catch (error) {
      console.error('Bulk delete alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get alert statistics
  static async getAlertStats(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const stats = await AlertService.getAlertStats(userId);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get alert stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Check user alerts manually
  static async checkUserAlerts(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const triggeredAlerts = await AlertService.checkUserAlerts(userId);

      res.json({
        success: true,
        message: `Checked alerts, ${triggeredAlerts.length} alerts triggered`,
        data: { triggeredAlerts }
      });
    } catch (error) {
      console.error('Check user alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Toggle alert status
  static async toggleAlertStatus(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const { alertId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Check if alert belongs to user
      const existingAlert = await Alert.findOne({
        id: alertId,
        user_id: userId
      });

      if (!existingAlert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found'
        });
      }

      const updatedAlert = await Alert.updateById(alertId as string, {
        is_active: !existingAlert.is_active
      });

      res.json({
        success: true,
        message: `Alert ${(updatedAlert && updatedAlert.is_active) ? 'activated' : 'deactivated'} successfully`,
        data: { alert: updatedAlert }
      });
    } catch (error) {
      console.error('Toggle alert status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get alerts for a specific stock
  static async getStockAlerts(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const { stockId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const alerts = await Alert.getUserAlerts(userId, {
        stockId,
        activeOnly: false
      });

      res.json({
        success: true,
        data: { alerts }
      });
    } catch (error) {
      console.error('Get stock alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
