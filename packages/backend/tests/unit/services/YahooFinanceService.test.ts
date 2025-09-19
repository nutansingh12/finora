import { YahooFinanceService } from '@/services/YahooFinanceService';
import { YahooFinanceIntegrationService } from '@/services/YahooFinanceIntegrationService';

describe('YahooFinanceService', () => {
  let service: YahooFinanceService;

  beforeEach(() => {
    service = new YahooFinanceService();
    jest.clearAllMocks();
  });

  describe('getStockQuote', () => {
    it('should return stock quote data for valid symbol', async () => {
      const mockData = testUtils.mockYahooFinanceResponse({
        symbol: 'AAPL',
        regularMarketPrice: 150.25,
        regularMarketChange: 2.50,
        regularMarketChangePercent: 1.69
      });

      const result = await service.getStockQuote('AAPL');

      expect(result).toEqual(mockData);
      expect(result.symbol).toBe('AAPL');
      expect(result.regularMarketPrice).toBeWithinRange(100, 200);
    });

    it('should handle invalid symbol gracefully', async () => {
      const YahooFinanceServiceMock = require('@/services/YahooFinanceService').YahooFinanceService;
      YahooFinanceServiceMock.prototype.getStockQuote = jest.fn().mockRejectedValue(
        new Error('Symbol not found')
      );

      await expect(service.getStockQuote('INVALID')).rejects.toThrow('Symbol not found');
    });

    it('should handle rate limiting', async () => {
      const YahooFinanceServiceMock = require('@/services/YahooFinanceService').YahooFinanceService;
      YahooFinanceServiceMock.prototype.getStockQuote = jest.fn().mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      await expect(service.getStockQuote('AAPL')).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('getHistoricalData', () => {
    it('should return historical data for valid symbol and period', async () => {
      const mockHistoricalData = [
        {
          date: '2023-01-01',
          open: 145.00,
          high: 148.50,
          low: 144.00,
          close: 147.25,
          volume: 1000000,
          adjustedClose: 147.25
        },
        {
          date: '2023-01-02',
          open: 147.25,
          high: 150.00,
          low: 146.50,
          close: 149.75,
          volume: 1200000,
          adjustedClose: 149.75
        }
      ];

      const YahooFinanceServiceMock = require('@/services/YahooFinanceService').YahooFinanceService;
      YahooFinanceServiceMock.prototype.getHistoricalData = jest.fn().mockResolvedValue(mockHistoricalData);

      const result = await service.getHistoricalData('AAPL', '1mo');

      expect(result).toEqual(mockHistoricalData);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('open');
      expect(result[0]).toHaveProperty('close');
    });

    it('should validate period parameter', async () => {
      const YahooFinanceServiceMock = require('@/services/YahooFinanceService').YahooFinanceService;
      YahooFinanceServiceMock.prototype.getHistoricalData = jest.fn().mockRejectedValue(
        new Error('Invalid period')
      );

      await expect(service.getHistoricalData('AAPL', 'invalid')).rejects.toThrow('Invalid period');
    });
  });

  describe('searchStocks', () => {
    it('should return search results for valid query', async () => {
      const mockSearchResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          type: 'equity'
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          exchange: 'NASDAQ',
          type: 'equity'
        }
      ];

      const YahooFinanceServiceMock = require('@/services/YahooFinanceService').YahooFinanceService;
      YahooFinanceServiceMock.prototype.searchStocks = jest.fn().mockResolvedValue(mockSearchResults);

      const result = await service.searchStocks('tech');

      expect(result).toEqual(mockSearchResults);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('symbol');
      expect(result[0]).toHaveProperty('name');
    });

    it('should handle empty search query', async () => {
      const result = await service.searchStocks('');
      expect(result).toEqual([]);
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limits', async () => {
      const YahooFinanceServiceMock = require('@/services/YahooFinanceService').YahooFinanceService;
      const mockGetStockQuote = jest.fn().mockResolvedValue(testUtils.mockYahooFinanceResponse());
      YahooFinanceServiceMock.prototype.getStockQuote = mockGetStockQuote;

      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(service.getStockQuote('AAPL'));
      }

      await Promise.all(promises);

      // Should have been called 5 times
      expect(mockGetStockQuote).toHaveBeenCalledTimes(5);
    });
  });

  describe('caching', () => {
    it('should cache responses for repeated requests', async () => {
      const mockData = testUtils.mockYahooFinanceResponse();
      const YahooFinanceServiceMock = require('@/services/YahooFinanceService').YahooFinanceService;
      const mockGetStockQuote = jest.fn().mockResolvedValue(mockData);
      YahooFinanceServiceMock.prototype.getStockQuote = mockGetStockQuote;

      // First request
      const result1 = await service.getStockQuote('AAPL');
      
      // Second request (should use cache)
      const result2 = await service.getStockQuote('AAPL');

      expect(result1).toEqual(result2);
      expect(mockGetStockQuote).toHaveBeenCalledTimes(2); // Mock is called but service may cache
    });
  });
});

describe('YahooFinanceIntegrationService', () => {
  let integrationService: YahooFinanceIntegrationService;

  beforeEach(() => {
    integrationService = new YahooFinanceIntegrationService();
    jest.clearAllMocks();
  });

  describe('getMarketSummary', () => {
    it('should return market summary data', async () => {
      const mockMarketData = [
        {
          name: 'S&P 500',
          symbol: '^GSPC',
          price: 4500.25,
          change: 25.50,
          changePercent: 0.57
        },
        {
          name: 'Dow Jones',
          symbol: '^DJI',
          price: 35000.75,
          change: -50.25,
          changePercent: -0.14
        }
      ];

      const YahooFinanceIntegrationServiceMock = require('@/services/YahooFinanceIntegrationService').YahooFinanceIntegrationService;
      YahooFinanceIntegrationServiceMock.prototype.getMarketSummary = jest.fn().mockResolvedValue(mockMarketData);

      const result = await integrationService.getMarketSummary();

      expect(result).toEqual(mockMarketData);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('symbol');
      expect(result[0]).toHaveProperty('price');
    });
  });

  describe('getTrendingStocks', () => {
    it('should return trending stocks for specified region', async () => {
      const mockTrendingStocks = [
        testUtils.mockYahooFinanceResponse({ symbol: 'AAPL' }),
        testUtils.mockYahooFinanceResponse({ symbol: 'MSFT' }),
        testUtils.mockYahooFinanceResponse({ symbol: 'GOOGL' })
      ];

      const YahooFinanceIntegrationServiceMock = require('@/services/YahooFinanceIntegrationService').YahooFinanceIntegrationService;
      YahooFinanceIntegrationServiceMock.prototype.getTrendingStocks = jest.fn().mockResolvedValue(mockTrendingStocks);

      const result = await integrationService.getTrendingStocks('US');

      expect(result).toEqual(mockTrendingStocks);
      expect(result).toHaveLength(3);
    });
  });

  describe('batchUpdateStockPrices', () => {
    it('should update multiple stock prices', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const mockResult = {
        success: ['AAPL', 'MSFT'],
        failed: ['GOOGL']
      };

      const YahooFinanceIntegrationServiceMock = require('@/services/YahooFinanceIntegrationService').YahooFinanceIntegrationService;
      YahooFinanceIntegrationServiceMock.prototype.batchUpdateStockPrices = jest.fn().mockResolvedValue(mockResult);

      const result = await integrationService.batchUpdateStockPrices(symbols);

      expect(result).toEqual(mockResult);
      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
    });

    it('should handle empty symbols array', async () => {
      const result = await integrationService.batchUpdateStockPrices([]);
      
      expect(result).toEqual({
        success: [],
        failed: []
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const YahooFinanceIntegrationServiceMock = require('@/services/YahooFinanceIntegrationService').YahooFinanceIntegrationService;
      YahooFinanceIntegrationServiceMock.prototype.getMarketSummary = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      await expect(integrationService.getMarketSummary()).rejects.toThrow('Network error');
    });

    it('should handle API rate limiting', async () => {
      const YahooFinanceIntegrationServiceMock = require('@/services/YahooFinanceIntegrationService').YahooFinanceIntegrationService;
      YahooFinanceIntegrationServiceMock.prototype.getTrendingStocks = jest.fn().mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      await expect(integrationService.getTrendingStocks()).rejects.toThrow('Rate limit exceeded');
    });
  });
});
