import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { StockGroup } from '@/models/StockGroup';
import { UserStock } from '@/models/UserStock';

export class PortfolioController {
  // Get user's portfolio with groups and stocks
  async getPortfolio(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { includeAnalysis, groupId } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // Get user's groups with stock counts
      const groups = await StockGroup.getUserGroups(userId, { includeStockCount: true });

      // Get user's stocks
      const stocks = await UserStock.getUserStocks(userId, {
        groupId: groupId as string | undefined
      });

      // Calculate portfolio summary
      const totalStocks = stocks.length;
      const totalValue = stocks.reduce((sum, stock) => sum + (stock.currentPrice || 0), 0);

      res.json({
        success: true,
        data: {
          portfolio: {
            totalStocks,
            totalValue,
            groups: groups.length,
            lastUpdated: new Date()
          },
          groups,
          stocks
        }
      });
    } catch (error) {
      console.error('Get portfolio error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get portfolio summary
  async getPortfolioSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const stats = await UserStock.getPortfolioStats(userId);

      res.json({
        success: true,
        data: { summary: stats }
      });
    } catch (error) {
      console.error('Get portfolio summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get portfolio performance
  async getPortfolioPerformance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // TODO: Implement performance calculation
      res.json({
        success: true,
        data: {
          performance: {
            totalReturn: 0,
            totalReturnPercent: 0,
            dayChange: 0,
            dayChangePercent: 0
          }
        }
      });
    } catch (error) {
      console.error('Get portfolio performance error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user's stock groups
  async getGroups(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const groups = await StockGroup.getUserGroups(userId, { includeStockCount: true });

      res.json({
        success: true,
        data: { groups }
      });
    } catch (error) {
      console.error('Get groups error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create new stock group
  async createGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { name, description, color } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // Check if group with same name already exists
      const existingGroup = await StockGroup.findOne({
        user_id: userId,
        name: name.trim(),
        is_active: true
      });

      if (existingGroup) {
        res.status(409).json({
          success: false,
          message: 'A group with this name already exists'
        });
        return;
      }

      const newGroup = await StockGroup.createGroup({
        user_id: userId,
        name: name.trim(),
        description,
        color
      });

      res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: newGroup
      });
    } catch (error) {
      console.error('Create group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update stock group
  async updateGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { groupId } = req.params;
      const { name, description, color, sortOrder } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const updatedGroup = await StockGroup.updateGroup(groupId as string, userId, {
        name: name?.trim(),
        description,
        color,
        sort_order: sortOrder
      });

      if (!updatedGroup) {
        res.status(404).json({
          success: false,
          message: 'Group not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Group updated successfully',
        data: updatedGroup
      });
    } catch (error) {
      console.error('Update group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete stock group
  async deleteGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { groupId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const deleted = await StockGroup.deleteGroup(groupId as string, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Group not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Group deleted successfully'
      });
    } catch (error) {
      console.error('Delete group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Reorder groups
  async reorderGroups(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { groupOrders } = req.body; // Array of { groupId, sortOrder }

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      await StockGroup.reorderGroups(userId, groupOrders);

      res.json({
        success: true,
        message: 'Groups reordered successfully'
      });
    } catch (error) {
      console.error('Reorder groups error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Import stocks (placeholder)
  async importStocks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        message: 'Import functionality not yet implemented'
      });
    } catch (error) {
      console.error('Import stocks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Export stocks (placeholder)
  async exportStocks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        message: 'Export functionality not yet implemented'
      });
    } catch (error) {
      console.error('Export stocks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get import template (placeholder)
  async getImportTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        message: 'Import template functionality not yet implemented'
      });
    } catch (error) {
      console.error('Get import template error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get value opportunities (placeholder)
  async getValueOpportunities(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        data: { opportunities: [] }
      });
    } catch (error) {
      console.error('Get value opportunities error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get sector allocation (placeholder)
  async getSectorAllocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        data: { allocation: [] }
      });
    } catch (error) {
      console.error('Get sector allocation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get performance metrics (placeholder)
  async getPerformanceMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        data: { metrics: {} }
      });
    } catch (error) {
      console.error('Get performance metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
