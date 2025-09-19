import { AnalyticsService } from '../../../src/services/AnalyticsService';
import { UserStock } from '../../../src/models/UserStock';
import { StockPrice } from '../../../src/models/StockPrice';
import { RollingAnalysis } from '../../../src/models/RollingAnalysis';

describe('AnalyticsService', () => {
  let testUser: any;
  let testStock: any;
  let testUserStock: any;

  beforeEach(async () => {
    testUser = await testUtils.createTestUser();
    testStock = await testUtils.createTestStock();
    testUserStock = await testUtils.createTestUserStock(testUser.id, testStock.id);
  });

  describe('calculatePortfolioAnalytics', () => {
    it('should calculate basic portfolio analytics', async () => {
      // Create test data
      await testUtils.createTestStockPrice(testStock.id, {
        price: 150.00,
        change: 5.00,
        change_percent: 3.45
      });

      // Mock rolling analysis
      await global.testUtils.cleanDatabase();
      await testUtils.createTestUser();
      await testUtils.createTestStock();
      await testUtils.createTestUserStock(testUser.id, testStock.id);
      
      // Create rolling analysis
      const analysisData = {
        stock_id: testStock.id,
        percent_above_52w_low: 15.5,
        percent_above_24w_low: 12.3,
        percent_above_12w_low: 8.7,
        low_52w: 120.00,
        high_52w: 180.00,
        low_24w: 125.00,
        high_24w: 175.00,
        low_12w: 130.00,
        high_12w: 170.00,
        is_latest: true
      };
      
      await global.BaseModel.db('rolling_analysis').insert(analysisData);

      const analytics = await AnalyticsService.calculatePortfolioAnalytics(testUser.id);

      expect(analytics).toHaveProperty('totalValue');
      expect(analytics).toHaveProperty('totalChange');
      expect(analytics).toHaveProperty('totalChangePercent');
      expect(analytics).toHaveProperty('stockCount');
      expect(analytics).toHaveProperty('valueDistribution');
      expect(analytics).toHaveProperty('topPerformers');
      expect(analytics).toHaveProperty('worstPerformers');
      expect(analytics).toHaveProperty('sectorDistribution');
      expect(analytics).toHaveProperty('riskMetrics');

      expect(analytics.stockCount).toBe(1);
      expect(analytics.valueDistribution).toHaveProperty('excellent');
      expect(analytics.valueDistribution).toHaveProperty('good');
      expect(analytics.valueDistribution).toHaveProperty('fair');
      expect(analytics.valueDistribution).toHaveProperty('poor');
    });

    it('should handle empty portfolio', async () => {
      // Remove test user stock
      await global.BaseModel.db('user_stocks').where('user_id', testUser.id).del();

      const analytics = await AnalyticsService.calculatePortfolioAnalytics(testUser.id);

      expect(analytics.stockCount).toBe(0);
      expect(analytics.totalValue).toBe(0);
      expect(analytics.totalChange).toBe(0);
      expect(analytics.topPerformers).toHaveLength(0);
      expect(analytics.worstPerformers).toHaveLength(0);
    });

    it('should categorize stocks by value distribution correctly', async () => {
      // Create multiple stocks with different percentages above 52W low
      const stocks = [
        { symbol: 'STOCK1', percentAbove52WLow: 5 },   // excellent
        { symbol: 'STOCK2', percentAbove52WLow: 15 },  // good
        { symbol: 'STOCK3', percentAbove52WLow: 35 },  // fair
        { symbol: 'STOCK4', percentAbove52WLow: 65 }   // poor
      ];

      for (const stockData of stocks) {
        const stock = await testUtils.createTestStock({ symbol: stockData.symbol });
        await testUtils.createTestUserStock(testUser.id, stock.id);
        await testUtils.createTestStockPrice(stock.id);
        
        await global.BaseModel.db('rolling_analysis').insert({
          stock_id: stock.id,
          percent_above_52w_low: stockData.percentAbove52WLow,
          percent_above_24w_low: stockData.percentAbove52WLow,
          percent_above_12w_low: stockData.percentAbove52WLow,
          low_52w: 100.00,
          high_52w: 200.00,
          is_latest: true
        });
      }

      const analytics = await AnalyticsService.calculatePortfolioAnalytics(testUser.id);

      expect(analytics.valueDistribution.excellent).toBe(1);
      expect(analytics.valueDistribution.good).toBe(1);
      expect(analytics.valueDistribution.fair).toBe(1);
      expect(analytics.valueDistribution.poor).toBe(1);
    });
  });

  describe('identifyValueOpportunities', () => {
    it('should identify value opportunities correctly', async () => {
      await testUtils.createTestStockPrice(testStock.id, { price: 145.00 });
      
      await global.BaseModel.db('rolling_analysis').insert({
        stock_id: testStock.id,
        percent_above_52w_low: 8.5,
        percent_above_24w_low: 6.2,
        percent_above_12w_low: 4.1,
        low_52w: 120.00,
        high_52w: 180.00,
        is_latest: true
      });

      const opportunities = await AnalyticsService.identifyValueOpportunities(testUser.id, 10);

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0]).toHaveProperty('stockId');
      expect(opportunities[0]).toHaveProperty('symbol');
      expect(opportunities[0]).toHaveProperty('valueScore');
      expect(opportunities[0]).toHaveProperty('recommendation');
      expect(opportunities[0].recommendation).toBe('excellent');
      expect(opportunities[0].valueScore).toBeGreaterThan(90);
    });

    it('should sort opportunities by value score', async () => {
      // Create multiple stocks with different value scores
      const stocksData = [
        { symbol: 'GOOD1', percentAbove52WLow: 5 },
        { symbol: 'FAIR1', percentAbove52WLow: 30 },
        { symbol: 'EXCELLENT1', percentAbove52WLow: 2 }
      ];

      for (const stockData of stocksData) {
        const stock = await testUtils.createTestStock({ symbol: stockData.symbol });
        await testUtils.createTestUserStock(testUser.id, stock.id);
        await testUtils.createTestStockPrice(stock.id);
        
        await global.BaseModel.db('rolling_analysis').insert({
          stock_id: stock.id,
          percent_above_52w_low: stockData.percentAbove52WLow,
          percent_above_24w_low: stockData.percentAbove52WLow,
          percent_above_12w_low: stockData.percentAbove52WLow,
          low_52w: 100.00,
          high_52w: 200.00,
          is_latest: true
        });
      }

      const opportunities = await AnalyticsService.identifyValueOpportunities(testUser.id, 10);

      expect(opportunities).toHaveLength(3);
      // Should be sorted by percent_above_52w_low ASC (best opportunities first)
      expect(opportunities[0].symbol).toBe('EXCELLENT1');
      expect(opportunities[1].symbol).toBe('GOOD1');
      expect(opportunities[2].symbol).toBe('FAIR1');
    });
  });

  describe('performTrendAnalysis', () => {
    beforeEach(async () => {
      // Create historical data for trend analysis
      const historicalData = [];
      const basePrice = 100;
      
      for (let i = 0; i < 50; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (49 - i));
        
        // Create trending up data
        const price = basePrice + (i * 0.5) + (Math.random() * 2 - 1);
        
        historicalData.push({
          stock_id: testStock.id,
          date: date,
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000 + Math.random() * 500000
        });
      }
      
      await global.BaseModel.db('historical_data').insert(historicalData);
    });

    it('should perform trend analysis with sufficient data', async () => {
      const analysis = await AnalyticsService.performTrendAnalysis(testStock.id, '1M');

      expect(analysis).toHaveProperty('period');
      expect(analysis).toHaveProperty('trend');
      expect(analysis).toHaveProperty('strength');
      expect(analysis).toHaveProperty('support');
      expect(analysis).toHaveProperty('resistance');
      expect(analysis).toHaveProperty('momentum');
      expect(analysis).toHaveProperty('rsi');
      expect(analysis).toHaveProperty('macd');

      expect(analysis.period).toBe('1M');
      expect(['bullish', 'bearish', 'neutral']).toContain(analysis.trend);
      expect(analysis.strength).toBeWithinRange(0, 100);
      expect(analysis.rsi).toBeWithinRange(0, 100);
    });

    it('should throw error with insufficient data', async () => {
      // Clear historical data
      await global.BaseModel.db('historical_data').where('stock_id', testStock.id).del();

      await expect(
        AnalyticsService.performTrendAnalysis(testStock.id, '1M')
      ).rejects.toThrow('Insufficient data for trend analysis');
    });

    it('should handle different time periods', async () => {
      const periods: Array<'1D' | '1W' | '1M' | '3M' | '6M' | '1Y'> = ['1D', '1W', '1M'];

      for (const period of periods) {
        const analysis = await AnalyticsService.performTrendAnalysis(testStock.id, period);
        expect(analysis.period).toBe(period);
      }
    });
  });

  describe('value score calculation', () => {
    it('should calculate value score correctly', async () => {
      // Test the private method through public interface
      const testCases = [
        { percent52W: 5, percent24W: 4, percent12W: 3, expectedRange: [95, 100] },
        { percent52W: 25, percent24W: 20, percent12W: 15, expectedRange: [75, 85] },
        { percent52W: 50, percent24W: 45, percent12W: 40, expectedRange: [50, 60] },
        { percent52W: 80, percent24W: 75, percent12W: 70, expectedRange: [20, 30] }
      ];

      for (const testCase of testCases) {
        await global.BaseModel.db('rolling_analysis').where('stock_id', testStock.id).del();
        await global.BaseModel.db('rolling_analysis').insert({
          stock_id: testStock.id,
          percent_above_52w_low: testCase.percent52W,
          percent_above_24w_low: testCase.percent24W,
          percent_above_12w_low: testCase.percent12W,
          low_52w: 100.00,
          high_52w: 200.00,
          is_latest: true
        });

        await testUtils.createTestStockPrice(testStock.id);

        const opportunities = await AnalyticsService.identifyValueOpportunities(testUser.id, 1);
        expect(opportunities).toHaveLength(1);
        expect(opportunities[0].valueScore).toBeWithinRange(
          testCase.expectedRange[0],
          testCase.expectedRange[1]
        );
      }
    });
  });

  describe('recommendation categories', () => {
    it('should categorize recommendations correctly', async () => {
      const testCases = [
        { percentAbove52WLow: 5, expectedRecommendation: 'excellent' },
        { percentAbove52WLow: 15, expectedRecommendation: 'good' },
        { percentAbove52WLow: 35, expectedRecommendation: 'fair' },
        { percentAbove52WLow: 65, expectedRecommendation: 'poor' }
      ];

      for (const testCase of testCases) {
        await global.BaseModel.db('rolling_analysis').where('stock_id', testStock.id).del();
        await global.BaseModel.db('rolling_analysis').insert({
          stock_id: testStock.id,
          percent_above_52w_low: testCase.percentAbove52WLow,
          percent_above_24w_low: testCase.percentAbove52WLow,
          percent_above_12w_low: testCase.percentAbove52WLow,
          low_52w: 100.00,
          high_52w: 200.00,
          is_latest: true
        });

        await testUtils.createTestStockPrice(testStock.id);

        const opportunities = await AnalyticsService.identifyValueOpportunities(testUser.id, 1);
        expect(opportunities).toHaveLength(1);
        expect(opportunities[0].recommendation).toBe(testCase.expectedRecommendation);
      }
    });
  });
});
