import { Request, Response } from 'express';
import { Stock } from '@/models/Stock';
import { AlphaVantageService } from '@/services/AlphaVantageService';

export class SearchController {
  private static alphaVantageService = new AlphaVantageService();

  // Search stocks with autocomplete
  static async searchStocks(req: Request, res: Response): Promise<any> {
    try {
      const { q: query, limit = 10 } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      if (query.length < 1) {
        return res.json({
          success: true,
          data: { suggestions: [] }
        });
      }

      const searchLimit = Math.min(parseInt(limit as string) || 10, 50);

      // First, search in our local database (best-effort; continue if unavailable)
      let localResults: any[] = [];
      try {
        localResults = await Stock.searchStocks(query, Math.ceil(searchLimit / 2));
      } catch (e: any) {
        const code = e?.code || e?.name || 'unknown';
        console.warn('Local search unavailable; continuing with Alpha Vantage only. Code:', code);
        localResults = [];
      }

      // Then search Alpha Vantage for additional results
      const alphaResults = await SearchController.alphaVantageService.searchStocks(
        query as string,
        { userId: (req as any).user?.id }
      );

      // Combine and deduplicate results
      const combinedResults = SearchController.combineSearchResults(localResults, alphaResults);

      // Limit final results
      const suggestions = combinedResults.slice(0, searchLimit);

      res.json({
        success: true,
        data: { suggestions }
      });
    } catch (error) {
      console.error('Search stocks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get stock quote
  static async getStockQuote(req: Request, res: Response): Promise<any> {
    try {
      const { symbol } = req.params;

      if (!symbol) {
        return res.status(400).json({
          success: false,
          message: 'Stock symbol is required'
        });
      }

      // First check local database
      let stock = await Stock.findBySymbol(symbol.toUpperCase());

      // If not found locally, fetch from Alpha Vantage
      if (!stock) {
        const avData = await SearchController.alphaVantageService.getStockQuote(symbol);

        if (!avData) {
          return res.status(404).json({
            success: false,
            message: 'Stock not found'
          });
        }

        // Create stock in database for future reference
        stock = await Stock.createStock({
          symbol: avData.symbol,
          name: symbol.toUpperCase(),
          exchange: 'UNKNOWN',
          sector: undefined,
          industry: undefined
        });
      }

      // Get latest quote from Alpha Vantage (prefer per-user key if available)
      const quote = await SearchController.alphaVantageService.getStockQuote(symbol, {
        userId: (req as any).user?.id
      });

      if (!quote) {
        return res.status(404).json({
          success: false,
          message: 'Unable to fetch current quote'
        });
      }

      res.json({
        success: true,
        data: {
          stock: {
            id: stock.id,
            symbol: stock.symbol,
            name: stock.name,
            exchange: stock.exchange,
            sector: stock.sector,
            industry: stock.industry
          },
          quote: {
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume,
            marketCap: quote.marketCap,
            peRatio: quote.peRatio,
            fiftyTwoWeekLow: null,
            fiftyTwoWeekHigh: null,
            lastUpdated: quote.timestamp
          }
        }
      });
    } catch (error) {
      console.error('Get stock quote error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get multiple stock quotes
  static async getMultipleQuotes(req: Request, res: Response): Promise<any> {
    try {
      const { symbols } = req.body;

      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Symbols array is required'
        });
      }

      if (symbols.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 50 symbols allowed per request'
        });
      }

      const results: any[] = [];
      for (const sym of symbols) {
        const q = await SearchController.alphaVantageService.getStockQuote(sym, {
          userId: (req as any).user?.id
        });
        if (q) {
          results.push({
            symbol: q.symbol,
            name: sym,
            price: q.price,
            change: q.change,
            changePercent: q.changePercent,
            volume: q.volume,
            marketCap: q.marketCap,
            lastUpdated: q.timestamp
          });
        }
        // small delay to be gentle with rate limits across keys
        await new Promise(r => setTimeout(r, 250));
      }

      const formattedQuotes = results;

      res.json({
        success: true,
        data: { quotes: formattedQuotes }
      });
    } catch (error) {
      console.error('Get multiple quotes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get trending stocks
  static async getTrendingStocks(req: Request, res: Response): Promise<any> {
    try {
      const { limit = 20 } = req.query;
      const searchLimit = Math.min(parseInt(limit as string) || 20, 50);

      // Trending from our DB: most active by volume among latest prices
      const mostActive = await (await import('@/models/StockPrice')).StockPrice.getMostActiveStocks(searchLimit);
      const stocks = mostActive.map((row) => ({
        symbol: row.symbol,
        name: row.name,
        price: row.price,
        change: row.change,
        changePercent: row.change_percent,
        volume: row.volume,
        source: 'db'
      }));

      res.json({
        success: true,
        data: { stocks }
      });
    } catch (error) {
      console.error('Get trending stocks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get popular stocks by sector
  static async getPopularStocksBySector(req: Request, res: Response): Promise<any> {
    try {
      const { sector, limit = 10 } = req.query;

      if (!sector) {
        return res.status(400).json({
          success: false,
          message: 'Sector is required'
        });
      }

      const searchLimit = Math.min(parseInt(limit as string) || 10, 30);

      // Get popular stocks in sector from local database
      const popularStocks = await Stock.getPopularStocksBySector(
        sector as string,
        searchLimit
      );

      res.json({
        success: true,
        data: { stocks: popularStocks }
      });
    } catch (error) {
      console.error('Get popular stocks by sector error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get stock suggestions based on user's portfolio
  static async getStockSuggestions(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const { limit = 10 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const searchLimit = Math.min(parseInt(limit as string) || 10, 20);

      // Get suggestions based on user's current portfolio
      const suggestions = await Stock.getStockSuggestions(userId, searchLimit);

      res.json({
        success: true,
        data: { suggestions }
      });
    } catch (error) {
      console.error('Get stock suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Private helper methods
  private static combineSearchResults(localResults: any[], alphaResults: any[]): any[] {
    const symbolSet = new Set();
    const combined: any[] = [];

    // Add local results first (they're more relevant)
    for (const result of localResults) {
      if (!symbolSet.has(result.symbol)) {
        symbolSet.add(result.symbol);
        combined.push({
          symbol: result.symbol,
          name: result.name,
          exchange: result.exchange,
          sector: result.sector,
          industry: result.industry,
          type: 'stock',
          source: 'local'
        });
      }
    }

    // Add Alpha Vantage results that aren't already included
    for (const result of alphaResults) {
      if (!symbolSet.has(result.symbol)) {
        symbolSet.add(result.symbol);
        combined.push({
          symbol: result.symbol,
          name: result.name,
          exchange: result.region,
          sector: undefined,
          industry: undefined,
          type: (result.type || 'stock').toLowerCase(),
          source: 'alpha_vantage'
        });
      }
    }

    return combined;
  }
}
