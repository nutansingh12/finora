import request from 'supertest';
import { app } from '@/index';
import jwt from 'jsonwebtoken';
import { config } from '@/config';

describe('Portfolio Integration Tests', () => {
  let testUser: any;
  let testStock: any;
  let authToken: string;

  beforeEach(async () => {
    // Create test user and stock
    testUser = await testUtils.createTestUser({
      email: 'portfolio@test.com',
      first_name: 'Portfolio',
      last_name: 'User'
    });
    
    testStock = await testUtils.createTestStock({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      exchange: 'NASDAQ'
    });

    // Generate real JWT token for integration testing
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Mock Yahoo Finance service
    testUtils.mockYahooFinanceResponse({
      symbol: 'AAPL',
      regularMarketPrice: 150.25,
      regularMarketChange: 2.50,
      regularMarketChangePercent: 1.69
    });
  });

  describe('Complete Portfolio Workflow', () => {
    it('should handle complete portfolio management workflow', async () => {
      // Step 1: Get empty portfolio
      let response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stocks).toHaveLength(0);
      expect(response.body.data.totalValue).toBe(0);

      // Step 2: Add stock to portfolio
      response = await request(app)
        .post('/api/portfolio/stocks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 145.00,
          targetPrice: 160.00,
          notes: 'Long term investment'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('AAPL');
      expect(response.body.data.quantity).toBe(10);
      expect(response.body.data.averagePrice).toBe(145.00);

      const userStockId = response.body.data.id;

      // Step 3: Get updated portfolio
      response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stocks).toHaveLength(1);
      expect(response.body.data.totalValue).toBeGreaterThan(0);
      expect(response.body.data.stocks[0].symbol).toBe('AAPL');

      // Step 4: Update stock in portfolio
      response = await request(app)
        .patch(`/api/portfolio/stocks/${userStockId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 15,
          targetPrice: 165.00,
          notes: 'Increased position'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(15);
      expect(response.body.data.targetPrice).toBe(165.00);

      // Step 5: Create stock group
      response = await request(app)
        .post('/api/portfolio/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tech Stocks',
          description: 'Technology sector investments',
          color: '#1976d2'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Tech Stocks');

      const groupId = response.body.data.id;

      // Step 6: Move stock to group
      response = await request(app)
        .patch(`/api/portfolio/stocks/${userStockId}/group`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ groupId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.groupId).toBe(groupId);

      // Step 7: Get portfolio with groups
      response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.groups).toHaveLength(1);
      expect(response.body.data.groups[0].name).toBe('Tech Stocks');
      expect(response.body.data.groups[0].stocks).toHaveLength(1);

      // Step 8: Get portfolio performance
      response = await request(app)
        .get('/api/portfolio/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: '1Y' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalReturn');
      expect(response.body.data).toHaveProperty('totalReturnPercent');

      // Step 9: Remove stock from portfolio
      response = await request(app)
        .delete(`/api/portfolio/stocks/${userStockId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Step 10: Verify portfolio is empty again
      response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stocks).toHaveLength(0);
    });
  });

  describe('Portfolio Analytics Integration', () => {
    beforeEach(async () => {
      // Add multiple stocks for analytics testing
      const stocks = [
        { symbol: 'AAPL', quantity: 10, averagePrice: 145.00 },
        { symbol: 'MSFT', quantity: 5, averagePrice: 280.00 },
        { symbol: 'GOOGL', quantity: 3, averagePrice: 2500.00 }
      ];

      for (const stock of stocks) {
        await testUtils.createTestStock({ symbol: stock.symbol });
        await request(app)
          .post('/api/portfolio/stocks')
          .set('Authorization', `Bearer ${authToken}`)
          .send(stock);
      }
    });

    it('should calculate portfolio allocation correctly', async () => {
      const response = await request(app)
        .get('/api/portfolio/allocation')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('byStock');
      expect(response.body.data).toHaveProperty('bySector');
      expect(response.body.data.byStock).toHaveLength(3);

      // Verify allocation percentages sum to 100%
      const totalPercentage = response.body.data.byStock.reduce(
        (sum: number, stock: any) => sum + stock.percentage,
        0
      );
      expect(totalPercentage).toBeWithinRange(99, 101); // Allow for rounding
    });

    it('should provide portfolio performance metrics', async () => {
      const response = await request(app)
        .get('/api/portfolio/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: '1Y' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalReturn');
      expect(response.body.data).toHaveProperty('totalReturnPercent');
      expect(response.body.data).toHaveProperty('annualizedReturn');
      expect(response.body.data).toHaveProperty('volatility');
      expect(response.body.data).toHaveProperty('sharpeRatio');
      expect(response.body.data).toHaveProperty('historicalValues');
      expect(response.body.data.historicalValues).toBeInstanceOf(Array);
    });

    it('should generate rebalance suggestions', async () => {
      const response = await request(app)
        .get('/api/portfolio/rebalance-suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('symbol');
        expect(response.body.data[0]).toHaveProperty('currentAllocation');
        expect(response.body.data[0]).toHaveProperty('targetAllocation');
        expect(response.body.data[0]).toHaveProperty('suggestedAction');
      }
    });
  });

  describe('Portfolio Data Export/Import', () => {
    beforeEach(async () => {
      // Add test data for export/import
      await request(app)
        .post('/api/portfolio/stocks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 145.00
        });
    });

    it('should export portfolio data in CSV format', async () => {
      const response = await request(app)
        .get('/api/portfolio/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'CSV' })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should export portfolio data in PDF format', async () => {
      const response = await request(app)
        .get('/api/portfolio/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'PDF' })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should handle stock price updates', async () => {
      // Add stock to portfolio
      const addResponse = await request(app)
        .post('/api/portfolio/stocks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 145.00
        });

      const userStockId = addResponse.body.data.id;

      // Mock price update
      testUtils.mockYahooFinanceResponse({
        symbol: 'AAPL',
        regularMarketPrice: 155.00, // Price increased
        regularMarketChange: 10.00,
        regularMarketChangePercent: 6.90
      });

      // Get updated portfolio
      const portfolioResponse = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(portfolioResponse.body.success).toBe(true);
      expect(portfolioResponse.body.data.stocks[0].currentPrice).toBe(155.00);
      expect(portfolioResponse.body.data.stocks[0].gainLoss).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid stock symbols gracefully', async () => {
      const response = await request(app)
        .post('/api/portfolio/stocks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbol: 'INVALID',
          quantity: 10,
          averagePrice: 100.00
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid stock symbol');
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/portfolio')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = [];
      
      // Create multiple concurrent portfolio requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/portfolio')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle large portfolio data efficiently', async () => {
      // Add many stocks to test performance
      const addPromises = [];
      for (let i = 0; i < 50; i++) {
        const symbol = `STOCK${i.toString().padStart(3, '0')}`;
        await testUtils.createTestStock({ symbol });
        
        addPromises.push(
          request(app)
            .post('/api/portfolio/stocks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              symbol,
              quantity: Math.floor(Math.random() * 100) + 1,
              averagePrice: Math.floor(Math.random() * 1000) + 10
            })
        );
      }

      await Promise.all(addPromises);

      // Measure response time for large portfolio
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.stocks).toHaveLength(50);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});
