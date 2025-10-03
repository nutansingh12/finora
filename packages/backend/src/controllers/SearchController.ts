import { Request, Response } from 'express';
import { Stock } from '@/models/Stock';
import { YahooFinanceService } from '@/services/YahooFinanceService';

export class SearchController {
  private static yahooFinanceService = new YahooFinanceService();

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
        console.warn('Local search unavailable; continuing with Yahoo only. Code:', code);
        localResults = [];
      }

      // Then search Yahoo Finance for additional results
      const yahooResults = await SearchController.yahooFinanceService.searchSymbols(
        query,
        searchLimit - localResults.length
      );

      // Combine and deduplicate results
      const combinedResults = SearchController.combineSearchResults(localResults, yahooResults);

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
      
      // If not found locally, fetch from Yahoo Finance
      if (!stock) {
        const yahooData = await SearchController.yahooFinanceService.getStockQuote(symbol);
        
        if (!yahooData) {
          return res.status(404).json({
            success: false,
            message: 'Stock not found'
          });
        }

        // Create stock in database for future reference
        stock = await Stock.createStock({
          symbol: yahooData.symbol,
          name: yahooData.longName || yahooData.shortName || symbol,
          exchange: yahooData.exchange || 'UNKNOWN',
          sector: yahooData.sector,
          industry: yahooData.industry
        });
      }

      // Get latest quote from Yahoo Finance
      const quote = await SearchController.yahooFinanceService.getStockQuote(symbol);

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
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            volume: quote.regularMarketVolume,
            marketCap: quote.marketCap,
            peRatio: quote.trailingPE,
            dividendYield: quote.dividendYield,
            fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
            fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
            lastUpdated: new Date().toISOString()
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

      const quotes = await SearchController.yahooFinanceService.getMultipleQuotes(symbols);

      const formattedQuotes = quotes.map(quote => ({
        symbol: quote.symbol,
        name: quote.longName || quote.shortName,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        volume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
        lastUpdated: new Date().toISOString()
      }));

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

      // Get trending stocks from Yahoo Finance
      const trendingStocks = await SearchController.yahooFinanceService.getTrendingStocks(searchLimit);

      res.json({
        success: true,
        data: { stocks: trendingStocks }
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
  private static combineSearchResults(localResults: any[], yahooResults: any[]): any[] {
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

    // Add Yahoo results that aren't already included
    for (const result of yahooResults) {
      if (!symbolSet.has(result.symbol)) {
        symbolSet.add(result.symbol);
        combined.push({
          symbol: result.symbol,
          name: result.longName || result.shortName,
          exchange: result.exchange,
          sector: result.sector,
          industry: result.industry,
          type: result.quoteType?.toLowerCase() || 'stock',
          source: 'yahoo'
        });
      }
    }

    return combined;
  }
}
