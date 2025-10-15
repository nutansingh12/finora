import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { AlphaVantageService } from '../services/AlphaVantageService';
import { validationResult } from 'express-validator';
import { YahooFinanceIntegrationService } from '../services/YahooFinanceIntegrationService';
import { YahooFinanceService } from '../services/YahooFinanceService';

export class MarketDataController {
  private static alphaVantageService = new AlphaVantageService();
  private static integrationService = new YahooFinanceIntegrationService();
  private static yahooService = new YahooFinanceService();


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

      // Hybrid: try Yahoo first for richer data; fallback to Alpha Vantage
      const yahooData = await MarketDataController.integrationService.getComprehensiveStockData(symbol.toUpperCase());
      if (yahooData) {
        res.json({ success: true, data: yahooData });
        return;
      }

      const avData = await MarketDataController.alphaVantageService.getStockQuote(symbol.toUpperCase());
      if (!avData) {
        res.status(404).json({ success: false, message: 'Stock not found' });
        return;
      }

      res.json({ success: true, data: avData });
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
      const { period = '1y', interval = '1d' } = req.query as { period?: string; interval?: string };

      if (!symbol) {
        res.status(400).json({
          success: false,
          message: 'Stock symbol is required'
        });
        return;
      }

      let prices: any[] = [];

      // Hybrid: prefer Yahoo for historical (better coverage and no key), fallback to Alpha
      const s = symbol.toUpperCase();
      const p = String(period);
      const i = String(interval);

      // Map to Yahoo-friendly range/interval
      let yahooRange = '1y';
      let yahooInterval = '1d';
      if (p === 'intraday') {
        // Map common intraday intervals
        yahooRange = '1d';
        yahooInterval = i === '1min' ? '1m' : i === '5min' ? '5m' : i === '15min' ? '15m' : i === '30min' ? '30m' : '60m';
      } else if (p === 'weekly') {
        yahooRange = '5y';
        yahooInterval = '1wk';
      } else if (p === 'monthly') {
        yahooRange = '10y';
        yahooInterval = '1mo';
      } else {
        yahooRange = '1y';
        yahooInterval = '1d';
      }

      // Try Yahoo first
      const yahooData = await MarketDataController.yahooService.getHistoricalData(s, yahooRange, yahooInterval);
      if (yahooData && yahooData.length) {
        prices = yahooData.map(d => ({ date: d.date, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume }));
      } else {
        // Fallback to Alpha Vantage
        if (p === 'intraday') {
          const allowed: any = new Set(['1min','5min','15min','30min','60min']);
          const intradayInterval = allowed.has(i) ? (i as any) : '5min';
          prices = await MarketDataController.alphaVantageService.getIntradayData(
            s,
            intradayInterval,
            { userId: (req as any).user?.id }
          );
        } else {
          const alphaVantagePeriod = p === 'weekly' ? 'weekly' : p === 'monthly' ? 'monthly' : 'daily';
          prices = await MarketDataController.alphaVantageService.getHistoricalData(
            s,
            alphaVantagePeriod as 'daily' | 'weekly' | 'monthly',
            { userId: (req as any).user?.id }
          );
        }
      }

      res.json({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          period,
          interval,
          prices
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

  // Get trending stocks (from DB latest most active)
  static async getTrendingStocks(req: Request, res: Response): Promise<void> {
    try {
      const { region = 'US', limit = 20 } = req.query;

      const mostActive = await (await import('@/models/StockPrice')).StockPrice.getMostActiveStocks(
        Math.min(parseInt(limit as string) || 20, 50)
      );

      const trendingStocks = mostActive.map((row) => ({
        symbol: row.symbol,
        name: row.name,
        price: row.price,
        change: row.change,
        changePercent: row.change_percent,
        volume: row.volume,
        region
      }));

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

      const searchLimit = Math.min(parseInt(String(limit)) || 10, 50);

      // Hybrid: prefer Yahoo symbol search; fallback to Alpha Vantage and exact symbol lookup
      let results: any[] = [];
      try {
        const yahoo = await MarketDataController.yahooService.searchSymbols(String(query), searchLimit);
        results = (yahoo || []).map((r: any) => ({
          symbol: r.symbol,
          name: r.longName || r.shortName || r.symbol,
          type: r.quoteType || 'Equity',
          region: r.exchange || '\u2014',
          currency: 'USD'
        }));
      } catch (e) {
        console.warn('Yahoo search failed, will fallback to Alpha Vantage');
      }

      if (!results.length) {
        results = await MarketDataController.alphaVantageService.searchStocks(String(query), { userId: (req as any).user?.id });
      }

      if ((!results || results.length === 0) && /^[A-Za-z0-9.-]{1,10}$/.test(String(query))) {
        // Exact-lookup fallback: try Yahoo first, then Alpha
        try {
          const yq = await MarketDataController.yahooService.getStockQuote(String(query));
          if (yq) {
            results = [{ symbol: yq.symbol, name: yq.longName || yq.shortName || yq.symbol, type: 'Equity', region: yq.exchange || '\u2014', currency: 'USD' }];
          } else {
            const aq = await MarketDataController.alphaVantageService.getStockQuote(String(query), { userId: (req as any).user?.id });
            if (aq) {
              results = [{ symbol: aq.symbol, name: String(query).toUpperCase(), type: 'Equity', region: '\u2014', currency: 'USD' }];
            }
          }
        } catch {}
      }

      res.json({
        success: true,
        data: { query, results, count: results?.length || 0 }
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
