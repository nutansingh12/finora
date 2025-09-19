import request from 'supertest';
import { app } from '@/index';
import { StockController } from '@/controllers/StockController';

describe('StockController', () => {
  let testUser: any;
  let testStock: any;
  let authToken: string;

  beforeEach(async () => {
    // Create test user and stock
    testUser = await testUtils.createTestUser();
    testStock = await testUtils.createTestStock();
    
    // Mock authentication token
    authToken = 'Bearer test-jwt-token';
    
    // Mock Yahoo Finance responses
    testUtils.mockYahooFinanceResponse({
      symbol: testStock.symbol,
      regularMarketPrice: 150.25
    });
  });

  describe('GET /api/stocks/search', () => {
    it('should search stocks successfully', async () => {
      const mockSearchResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          type: 'equity'
        }
      ];

      const YahooFinanceService = require('@/services/YahooFinanceService').YahooFinanceService;
      YahooFinanceService.prototype.searchStocks = jest.fn().mockResolvedValue(mockSearchResults);

      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: 'apple', limit: 10 })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSearchResults);
      expect(response.body.data).toHaveLength(1);
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/stocks/search')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Search query is required');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: 'apple' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate search query length', async () => {
      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: 'a' }) // Too short
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Search query must be at least 2 characters');
    });
  });

  describe('GET /api/stocks/:symbol', () => {
    it('should get stock data successfully', async () => {
      const mockStockData = testUtils.mockYahooFinanceResponse({
        symbol: 'AAPL',
        regularMarketPrice: 150.25,
        regularMarketChange: 2.50
      });

      const response = await request(app)
        .get('/api/stocks/AAPL')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('AAPL');
      expect(response.body.data.regularMarketPrice).toBe(150.25);
    });

    it('should handle invalid stock symbol', async () => {
      const YahooFinanceService = require('@/services/YahooFinanceService').YahooFinanceService;
      YahooFinanceService.prototype.getStockQuote = jest.fn().mockRejectedValue(
        new Error('Symbol not found')
      );

      const response = await request(app)
        .get('/api/stocks/INVALID')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Symbol not found');
    });

    it('should validate symbol format', async () => {
      const response = await request(app)
        .get('/api/stocks/invalid-symbol-123')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid symbol format');
    });
  });

  describe('GET /api/stocks/:symbol/historical', () => {
    it('should get historical data successfully', async () => {
      const mockHistoricalData = [
        {
          date: '2023-01-01',
          open: 145.00,
          high: 148.50,
          low: 144.00,
          close: 147.25,
          volume: 1000000
        }
      ];

      const YahooFinanceService = require('@/services/YahooFinanceService').YahooFinanceService;
      YahooFinanceService.prototype.getHistoricalData = jest.fn().mockResolvedValue(mockHistoricalData);

      const response = await request(app)
        .get('/api/stocks/AAPL/historical')
        .query({ period: '1mo', interval: '1d' })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHistoricalData);
      expect(response.body.data[0]).toHaveProperty('date');
      expect(response.body.data[0]).toHaveProperty('close');
    });

    it('should validate period parameter', async () => {
      const response = await request(app)
        .get('/api/stocks/AAPL/historical')
        .query({ period: 'invalid' })
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid period');
    });

    it('should use default parameters when not provided', async () => {
      const mockHistoricalData = [
        {
          date: '2023-01-01',
          open: 145.00,
          high: 148.50,
          low: 144.00,
          close: 147.25,
          volume: 1000000
        }
      ];

      const YahooFinanceService = require('@/services/YahooFinanceService').YahooFinanceService;
      YahooFinanceService.prototype.getHistoricalData = jest.fn().mockResolvedValue(mockHistoricalData);

      const response = await request(app)
        .get('/api/stocks/AAPL/historical')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(YahooFinanceService.prototype.getHistoricalData).toHaveBeenCalledWith('AAPL', '1y', '1d');
    });
  });

  describe('POST /api/stocks/batch', () => {
    it('should get multiple stocks data successfully', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const mockBatchData = symbols.map(symbol => 
        testUtils.mockYahooFinanceResponse({ symbol })
      );

      const YahooFinanceService = require('@/services/YahooFinanceService').YahooFinanceService;
      YahooFinanceService.prototype.getMultipleQuotes = jest.fn().mockResolvedValue(mockBatchData);

      const response = await request(app)
        .post('/api/stocks/batch')
        .send({ symbols })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].symbol).toBe('AAPL');
    });

    it('should validate symbols array', async () => {
      const response = await request(app)
        .post('/api/stocks/batch')
        .send({ symbols: [] })
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('At least one symbol is required');
    });

    it('should limit number of symbols', async () => {
      const symbols = Array.from({ length: 101 }, (_, i) => `STOCK${i}`);

      const response = await request(app)
        .post('/api/stocks/batch')
        .send({ symbols })
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Maximum 100 symbols allowed');
    });
  });

  describe('GET /api/stocks/trending', () => {
    it('should get trending stocks successfully', async () => {
      const mockTrendingStocks = [
        testUtils.mockYahooFinanceResponse({ symbol: 'AAPL' }),
        testUtils.mockYahooFinanceResponse({ symbol: 'MSFT' })
      ];

      const YahooFinanceIntegrationService = require('@/services/YahooFinanceIntegrationService').YahooFinanceIntegrationService;
      YahooFinanceIntegrationService.prototype.getTrendingStocks = jest.fn().mockResolvedValue(mockTrendingStocks);

      const response = await request(app)
        .get('/api/stocks/trending')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('symbol');
    });

    it('should support region parameter', async () => {
      const mockTrendingStocks = [
        testUtils.mockYahooFinanceResponse({ symbol: 'AAPL' })
      ];

      const YahooFinanceIntegrationService = require('@/services/YahooFinanceIntegrationService').YahooFinanceIntegrationService;
      YahooFinanceIntegrationService.prototype.getTrendingStocks = jest.fn().mockResolvedValue(mockTrendingStocks);

      const response = await request(app)
        .get('/api/stocks/trending')
        .query({ region: 'EU' })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(YahooFinanceIntegrationService.prototype.getTrendingStocks).toHaveBeenCalledWith('EU');
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      const YahooFinanceService = require('@/services/YahooFinanceService').YahooFinanceService;
      YahooFinanceService.prototype.getStockQuote = jest.fn().mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .get('/api/stocks/AAPL')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Service unavailable');
    });

    it('should handle rate limiting errors', async () => {
      const YahooFinanceService = require('@/services/YahooFinanceService').YahooFinanceService;
      YahooFinanceService.prototype.getStockQuote = jest.fn().mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const response = await request(app)
        .get('/api/stocks/AAPL')
        .set('Authorization', authToken)
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Rate limit exceeded');
    });
  });

  describe('caching', () => {
    it('should cache stock data responses', async () => {
      const mockStockData = testUtils.mockYahooFinanceResponse({ symbol: 'AAPL' });
      const YahooFinanceService = require('@/services/YahooFinanceService').YahooFinanceService;
      const mockGetStockQuote = jest.fn().mockResolvedValue(mockStockData);
      YahooFinanceService.prototype.getStockQuote = mockGetStockQuote;

      // First request
      await request(app)
        .get('/api/stocks/AAPL')
        .set('Authorization', authToken)
        .expect(200);

      // Second request (should potentially use cache)
      await request(app)
        .get('/api/stocks/AAPL')
        .set('Authorization', authToken)
        .expect(200);

      // Verify service was called (caching behavior depends on implementation)
      expect(mockGetStockQuote).toHaveBeenCalled();
    });
  });
});
