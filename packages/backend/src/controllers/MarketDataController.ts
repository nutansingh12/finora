import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { AlphaVantageService } from '../services/AlphaVantageService';
import { validationResult } from 'express-validator';

export class MarketDataController {
  private static alphaVantageService = new AlphaVantageService();

  // Get comprehensive stock data
  static async getStockData(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { symbol } = req.params;
      
      if (!symbol) {
        res.status(400).json({
          success: false,
          message: 'Stock symbol is required'
        });
        return;
      }

      const stockData = await MarketDataController.alphaVantageService.getStockQuote(symbol.toUpperCase());
      
      if (!stockData) {
        res.status(404).json({
          success: false,
          message: 'Stock not found'
        });
        return;
      }

      res.json({
        success: true,
        data: stockData
      });
    } catch (error) {
      console.error('Get stock data error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get historical data
  static async getHistoricalData(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const { period = '1y', interval = '1d' } = req.query;

      if (!symbol) {
        res.status(400).json({
          success: false,
          message: 'Stock symbol is required'
        });
        return;
      }

      // Map period to Alpha Vantage format
      const alphaVantagePeriod = period === 'weekly' ? 'weekly' :
                                period === 'monthly' ? 'monthly' : 'daily';

      const historicalData = await MarketDataController.alphaVantageService.getHistoricalData(
        symbol.toUpperCase(),
        alphaVantagePeriod as 'daily' | 'weekly' | 'monthly'
      );

      res.json({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          period,
          interval,
          prices: historicalData
        }
      });
    } catch (error) {
      console.error('Get historical data error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get market summary
  static async getMarketSummary(req: Request, res: Response): Promise<void> {
    try {
      const marketSummary = await MarketDataController.integrationService.getMarketSummary();

      res.json({
        success: true,
        data: {
          indices: marketSummary,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get market summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get trending stocks
  static async getTrendingStocks(req: Request, res: Response): Promise<void> {
    try {
      const { region = 'US' } = req.query;
      
      const trendingStocks = await MarketDataController.integrationService.getTrendingStocks(region as string);

      res.json({
        success: true,
        data: {
          region,
          trending: trendingStocks,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get trending stocks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Search stocks with enhanced results
  static async searchStocks(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, limit = 10 } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }

      if (query.length < 1) {
        res.json({
          success: true,
          data: { results: [] }
        });
        return;
      }

      const searchResults = await MarketDataController.alphaVantageService.searchStocks(query);

      res.json({
        success: true,
        data: {
          query,
          results: searchResults,
          count: searchResults.length
        }
      });
    } catch (error) {
      console.error('Search stocks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Validate stock symbols
  static async validateSymbols(req: Request, res: Response): Promise<void> {
    try {
      const { symbols } = req.body;

      if (!symbols || !Array.isArray(symbols)) {
        res.status(400).json({
          success: false,
          message: 'Symbols array is required'
        });
        return;
      }

      if (symbols.length > 50) {
        res.status(400).json({
          success: false,
          message: 'Maximum 50 symbols allowed per request'
        });
        return;
      }

      const validationResults = await MarketDataController.integrationService.validateSymbols(symbols);

      res.json({
        success: true,
        data: validationResults
      });
    } catch (error) {
      console.error('Validate symbols error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get exchange rates
  static async getExchangeRates(req: Request, res: Response): Promise<void> {
    try {
      const { base = 'USD' } = req.query;
      
      const exchangeRates = await MarketDataController.integrationService.getExchangeRates(base as string);

      res.json({
        success: true,
        data: {
          base,
          rates: exchangeRates,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get exchange rates error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get service health
  static async getServiceHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = MarketDataController.alphaVantageService.getServiceStatus();

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Get service health error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Clear caches (admin only)
  static async clearCaches(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // TODO: Add admin role check
      MarketDataController.integrationService.clearCaches();

      res.json({
        success: true,
        message: 'Caches cleared successfully'
      });
    } catch (error) {
      console.error('Clear caches error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Batch update stock prices (admin only)
  static async batchUpdatePrices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { symbols } = req.body;

      if (!symbols || !Array.isArray(symbols)) {
        res.status(400).json({
          success: false,
          message: 'Symbols array is required'
        });
        return;
      }

      if (symbols.length > 100) {
        res.status(400).json({
          success: false,
          message: 'Maximum 100 symbols allowed per batch update'
        });
        return;
      }

      const updateResults = await MarketDataController.integrationService.batchUpdateStockPrices(symbols);

      res.json({
        success: true,
        data: updateResults
      });
    } catch (error) {
      console.error('Batch update prices error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
