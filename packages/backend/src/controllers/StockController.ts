import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { Stock } from '../models/Stock';
import { UserStock } from '../models/UserStock';
import { StockPrice } from '../models/StockPrice';
import { RollingAnalysis } from '../models/RollingAnalysis';
import { YahooFinanceService } from '../services/YahooFinanceService';
import { StockPriceService } from '../services/StockPriceService';

export class StockController {
  private static yahooFinanceService = new YahooFinanceService();
  private static stockPriceService = new StockPriceService();

  // Get user's stocks
  static async getUserStocks(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const { groupId, sortBy, sortOrder, limit, offset } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const options = {
        groupId: groupId as string | undefined,
        sortBy: sortBy as string | undefined,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      };

      const stocks = await UserStock.getUserStocks(userId, options);

      res.json({
        success: true,
        data: { stocks }
      });
    } catch (error) {
      console.error('Get user stocks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Add stock to user's portfolio
  static async addUserStock(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const { symbol, targetPrice, cutoffPrice, groupId, notes } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      if (!symbol) {
        return res.status(400).json({
          success: false,
          message: 'Stock symbol is required'
        });
      }

      // Get or create stock
      let stock = await Stock.findBySymbol(symbol.toUpperCase());
      
      if (!stock) {
        // Fetch stock data from Yahoo Finance
        const stockData = await StockController.yahooFinanceService.getStockQuote(symbol);
        
        if (!stockData) {
          return res.status(404).json({
            success: false,
            message: 'Stock not found'
          });
        }

        stock = await Stock.upsertStock({
          symbol: stockData.symbol,
          name: stockData.longName || stockData.shortName || symbol,
          exchange: stockData.exchange || 'UNKNOWN',
          sector: stockData.sector,
          industry: stockData.industry
        });

        if (!stock) {
          res.status(500).json({
            success: false,
            message: 'Failed to create stock'
          });
          return;
        }

        // Initialize stock price data
        await StockController.stockPriceService.updateStockPrice(stock.id, stockData);
      }

      // Add to user's portfolio
      const userStock = await UserStock.addUserStock({
        user_id: userId,
        stock_id: stock.id,
        target_price: targetPrice,
        cutoff_price: cutoffPrice,
        group_id: groupId,
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Stock added to portfolio',
        data: { userStock }
      });
    } catch (error) {
      console.error('Add user stock error:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: 'Stock already exists in your portfolio'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update user stock
  static async updateUserStock(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const { stockId } = req.params;
      const { targetPrice, cutoffPrice, groupId, notes } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      if (!stockId) {
        res.status(400).json({
          success: false,
          message: 'Stock ID is required'
        });
        return;
      }

      const updatedStock = await UserStock.updateUserStock(userId, stockId, {
        target_price: targetPrice,
        cutoff_price: cutoffPrice,
        group_id: groupId,
        notes
      });

      if (!updatedStock) {
        return res.status(404).json({
          success: false,
          message: 'Stock not found in your portfolio'
        });
      }

      res.json({
        success: true,
        message: 'Stock updated successfully',
        data: { stock: updatedStock }
      });
    } catch (error) {
      console.error('Update user stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Remove stock from user's portfolio
  static async removeUserStock(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const { stockId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      if (!stockId) {
        res.status(400).json({
          success: false,
          message: 'Stock ID is required'
        });
        return;
      }

      const removed = await UserStock.removeUserStock(userId, stockId);

      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'Stock not found in your portfolio'
        });
      }

      res.json({
        success: true,
        message: 'Stock removed from portfolio'
      });
    } catch (error) {
      console.error('Remove user stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get stock details
  static async getStockDetails(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const { stockId } = req.params;
      const userId = req.user?.id;

      // Get stock info
      if (!stockId) {
        res.status(400).json({
          success: false,
          message: 'Stock ID is required'
        });
        return;
      }

      const stock = await Stock.findById(stockId);
      if (!stock) {
        res.status(404).json({
          success: false,
          message: 'Stock not found'
        });
        return;
      }

      // Get current price
      const currentPrice = await StockPrice.getLatestPrice(stockId);

      // Get rolling analysis
      const analysis = await RollingAnalysis.getLatestAnalysis(stockId);

      // Get user stock info if user is authenticated
      let userStock = null;
      if (userId) {
        userStock = await UserStock.findOne({
          user_id: userId,
          stock_id: stockId,
          is_active: true
        });
      }

      res.json({
        success: true,
        data: {
          stock,
          currentPrice,
          analysis,
          userStock
        }
      });
    } catch (error) {
      console.error('Get stock details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get recently added stocks
  static async getRecentlyAddedStocks(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const recentStocks = await UserStock.getRecentlyAddedStocks(userId);

      res.json({
        success: true,
        data: { stocks: recentStocks }
      });
    } catch (error) {
      console.error('Get recently added stocks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Bulk update stocks
  static async bulkUpdateStocks(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const { stockIds, updates } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      if (!stockIds || !Array.isArray(stockIds) || stockIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock IDs are required'
        });
      }

      const updatedCount = await UserStock.bulkUpdateUserStocks(userId, stockIds, updates);

      res.json({
        success: true,
        message: `${updatedCount} stocks updated successfully`,
        data: { updatedCount }
      });
    } catch (error) {
      console.error('Bulk update stocks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get portfolio statistics
  static async getPortfolioStats(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const stats = await UserStock.getPortfolioStats(userId);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get portfolio stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Search user's stocks
  static async searchUserStocks(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const { q: searchTerm, limit } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          message: 'Search term is required'
        });
      }

      const stocks = await UserStock.searchUserStocks(
        userId,
        searchTerm as string,
        limit ? parseInt(limit as string) : 20
      );

      res.json({
        success: true,
        data: { stocks }
      });
    } catch (error) {
      console.error('Search user stocks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
