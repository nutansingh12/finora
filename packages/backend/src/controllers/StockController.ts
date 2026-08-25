import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { Stock } from '../models/Stock';
import { UserStock } from '../models/UserStock';
import { StockPrice } from '../models/StockPrice';
import { RollingAnalysis } from '../models/RollingAnalysis';
import { AlphaVantageService } from '../services/AlphaVantageService';
import { StockPriceService } from '../services/StockPriceService';
import { YahooFinanceIntegrationService } from '../services/YahooFinanceIntegrationService';

// Per-user cooldown for price refreshes (60 seconds)
const refreshCooldowns = new Map<string, number>();
const REFRESH_COOLDOWN_MS = 60 * 1000;

export class StockController {
  private static alphaVantageService = new AlphaVantageService();
  private static stockPriceService = new StockPriceService();
  private static integrationService = new YahooFinanceIntegrationService();

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

      const toBool = (v: any) => {
        const s = String(v ?? '').toLowerCase();
        return s === '1' || s === 'true';
      };

      const options = {
        groupId: groupId as string | undefined,
        sortBy: sortBy as string | undefined,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        onlyWithPrice: toBool(req.query.onlyWithPrice),
        prioritizeWithPrice: toBool(req.query.prioritizeWithPrice ?? 'true')
      } as const;

      let stocks = await UserStock.getUserStocks(userId, options);

      // If client asked for only priced rows but none exist yet (e.g., right after import),
      // fall back to returning unpriced rows so the UI can render immediately.
      if (options.onlyWithPrice && (!stocks || stocks.length === 0)) {
        const fallbackOptions = { ...options, onlyWithPrice: false, prioritizeWithPrice: true as const };
        stocks = await UserStock.getUserStocks(userId, fallbackOptions);
      }

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

      // Fetch live Yahoo quote first — used for both stock creation and price seeding
      const yahooData = await StockController.integrationService.getComprehensiveStockData(symbol);

      // Get or create stock record
      let stock = await Stock.findBySymbol(symbol.toUpperCase());

      if (!stock) {
        if (!yahooData) {
          // Yahoo failed — try Alpha Vantage as last resort
          const avData = await StockController.alphaVantageService.getStockQuote(symbol, { userId: (req as any).user?.id });
          if (!avData) {
            return res.status(404).json({ success: false, message: 'Stock not found' });
          }
          stock = await Stock.upsertStock({ symbol: avData.symbol, name: symbol.toUpperCase(), exchange: 'UNKNOWN' });
          if (!stock) return res.status(500).json({ success: false, message: 'Failed to create stock' });
          await StockController.stockPriceService.updateStockPrice(stock.id, avData);
        } else {
          stock = await Stock.upsertStock({
            symbol: yahooData.symbol || symbol.toUpperCase(),
            name: yahooData.longName || yahooData.shortName || symbol.toUpperCase(),
            exchange: yahooData.exchange || 'UNKNOWN',
            sector: (yahooData as any).sector || undefined,
            industry: (yahooData as any).industry || undefined,
          });
          if (!stock) return res.status(500).json({ success: false, message: 'Failed to create stock' });
          await StockController.stockPriceService.updateStockPrice(stock.id, yahooData);
        }
      } else if (yahooData) {
        // Stock already in DB — seed/refresh price and rolling analysis so the watchlist shows live data
        await StockController.stockPriceService.updateStockPrice(stock.id, yahooData);
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

      // Both target_price and cutoff_price represent the same "cutoff/buy target" concept.
      // Keep them in sync so whichever column the query returns first always reflects the edit.
      const effectivePrice = cutoffPrice ?? targetPrice;
      const updates: Record<string, any> = {};
      if (effectivePrice !== undefined) { updates.target_price = effectivePrice; updates.cutoff_price = effectivePrice; }
      if (groupId !== undefined) updates.group_id = groupId;
      if (notes !== undefined) updates.notes = notes;

      const updatedStock = await UserStock.updateUserStock(userId, stockId, updates);

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


  // Refresh current user's missing or stale prices in small batches and persist to DB
  static async refreshUserPrices(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const limit = Math.min(parseInt(String((req.query.limit as any) ?? '50'), 10) || 50, 100);
      const staleMinutes = parseInt(String((req.query.staleMinutes as any) ?? '2'), 10) || 2;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Enforce per-user cooldown to prevent hammering Yahoo Finance
      const lastRefresh = refreshCooldowns.get(userId) ?? 0;
      const msSinceLast = Date.now() - lastRefresh;
      if (msSinceLast < REFRESH_COOLDOWN_MS) {
        const waitSec = Math.ceil((REFRESH_COOLDOWN_MS - msSinceLast) / 1000);
        return res.json({ success: true, message: `Rate limited — try again in ${waitSec}s`, data: { updated: 0, failed: 0, symbols: [] } });
      }
      refreshCooldowns.set(userId, Date.now());

      const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

      // Find symbols for user's stocks that are missing a latest price or are stale
      const hasUserStocksIsActive = await UserStock.hasIsActiveColumn();

      let baseQuery = UserStock.db('user_stocks')
        .select('user_stocks.stock_id', 'stocks.symbol', 'sp.created_at as last_price_at')
        .leftJoin('stocks', 'user_stocks.stock_id', 'stocks.id')
        .leftJoin('stock_prices as sp', function() {
          this.on('sp.stock_id', '=', 'user_stocks.stock_id')
              .andOn('sp.is_latest', '=', UserStock.db.raw('?', [true]));
        })
        .where('user_stocks.user_id', userId)
        .where(function() {
          this.whereNull('sp.price').orWhere('sp.created_at', '<', cutoff);
        })
        .limit(limit);

      if (hasUserStocksIsActive) {
        baseQuery = baseQuery.where('user_stocks.is_active', true);
      }

      const rows = await baseQuery;

      const symbols = rows.map(r => r.symbol).filter((s: string | null) => !!s) as string[];

      if (symbols.length === 0) {
        return res.json({ success: true, message: 'No missing or stale prices to refresh', data: { updated: 0, failed: 0, symbols: [] } });
      }

      const result = await StockController.integrationService.batchUpdateStockPrices(symbols);

      return res.json({
        success: true,
        message: 'Batch price refresh complete',
        data: { updated: result.success.length, failed: result.failed.length, symbols: result.success }
      });
    } catch (error) {
      console.error('Refresh user prices error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
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
