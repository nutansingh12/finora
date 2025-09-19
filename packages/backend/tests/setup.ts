import { config } from '../src/config';
import { BaseModel } from '../src/models/BaseModel';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'finora_test';

// Mock external services
jest.mock('../src/services/YahooFinanceService');
jest.mock('../src/services/NotificationService');
jest.mock('../src/services/EmailService');

// Global test setup
beforeAll(async () => {
  // Initialize test database connection
  await BaseModel.initializeDatabase();
  
  // Run migrations
  await BaseModel.db.migrate.latest();
});

afterAll(async () => {
  // Clean up database connection
  await BaseModel.db.destroy();
});

beforeEach(async () => {
  // Clean up database before each test
  await cleanDatabase();
});

afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});

// Helper function to clean database
async function cleanDatabase() {
  const tables = [
    'notification_logs',
    'user_fcm_tokens',
    'user_notification_preferences',
    'import_export_logs',
    'alerts',
    'rolling_analysis',
    'historical_data',
    'stock_prices',
    'user_stocks',
    'stock_groups',
    'stocks',
    'sessions',
    'users'
  ];

  // Disable foreign key checks
  await BaseModel.db.raw('SET FOREIGN_KEY_CHECKS = 0');
  
  // Truncate all tables
  for (const table of tables) {
    await BaseModel.db(table).truncate();
  }
  
  // Re-enable foreign key checks
  await BaseModel.db.raw('SET FOREIGN_KEY_CHECKS = 1');
}

// Global test utilities
global.testUtils = {
  cleanDatabase,
  
  // Create test user
  createTestUser: async (overrides = {}) => {
    const userData = {
      email: 'test@example.com',
      password_hash: '$2b$10$test.hash.here',
      first_name: 'Test',
      last_name: 'User',
      is_verified: true,
      ...overrides
    };
    
    const [userId] = await BaseModel.db('users').insert(userData);
    return { id: userId, ...userData };
  },
  
  // Create test stock
  createTestStock: async (overrides = {}) => {
    const stockData = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      is_active: true,
      ...overrides
    };
    
    const [stockId] = await BaseModel.db('stocks').insert(stockData);
    return { id: stockId, ...stockData };
  },
  
  // Create test user stock
  createTestUserStock: async (userId: string, stockId: string, overrides = {}) => {
    const userStockData = {
      user_id: userId,
      stock_id: stockId,
      target_price: 150.00,
      cutoff_price: 120.00,
      is_active: true,
      added_at: new Date(),
      ...overrides
    };
    
    const [userStockId] = await BaseModel.db('user_stocks').insert(userStockData);
    return { id: userStockId, ...userStockData };
  },
  
  // Create test stock price
  createTestStockPrice: async (stockId: string, overrides = {}) => {
    const priceData = {
      stock_id: stockId,
      price: 145.50,
      change: 2.50,
      change_percent: 1.75,
      volume: 1000000,
      is_latest: true,
      ...overrides
    };
    
    const [priceId] = await BaseModel.db('stock_prices').insert(priceData);
    return { id: priceId, ...priceData };
  },
  
  // Create test alert
  createTestAlert: async (userId: string, stockId: string, overrides = {}) => {
    const alertData = {
      user_id: userId,
      stock_id: stockId,
      alert_type: 'price_below',
      target_price: 140.00,
      is_active: true,
      ...overrides
    };
    
    const [alertId] = await BaseModel.db('alerts').insert(alertData);
    return { id: alertId, ...alertData };
  },
  
  // Mock Yahoo Finance response
  mockYahooFinanceResponse: (data = {}) => {
    const mockResponse = {
      symbol: 'AAPL',
      longName: 'Apple Inc.',
      shortName: 'Apple',
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      regularMarketPrice: 145.50,
      regularMarketChange: 2.50,
      regularMarketChangePercent: 1.75,
      regularMarketVolume: 1000000,
      fiftyTwoWeekLow: 120.00,
      fiftyTwoWeekHigh: 180.00,
      ...data
    };
    
    const YahooFinanceService = require('../src/services/YahooFinanceService').YahooFinanceService;
    YahooFinanceService.prototype.getStockQuote = jest.fn().mockResolvedValue(mockResponse);
    
    return mockResponse;
  },
  
  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate random test data
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  randomEmail: () => `test${Math.random().toString(36).substr(2, 9)}@example.com`,
  
  randomPrice: (min = 10, max = 1000) => Math.round((Math.random() * (max - min) + min) * 100) / 100
};

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  }
});

// Type declarations for global utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toBeValidDate(): R;
      toBeValidEmail(): R;
    }
  }
  
  var testUtils: {
    cleanDatabase: () => Promise<void>;
    createTestUser: (overrides?: any) => Promise<any>;
    createTestStock: (overrides?: any) => Promise<any>;
    createTestUserStock: (userId: string, stockId: string, overrides?: any) => Promise<any>;
    createTestStockPrice: (stockId: string, overrides?: any) => Promise<any>;
    createTestAlert: (userId: string, stockId: string, overrides?: any) => Promise<any>;
    mockYahooFinanceResponse: (data?: any) => any;
    waitFor: (ms: number) => Promise<void>;
    randomString: (length?: number) => string;
    randomEmail: () => string;
    randomPrice: (min?: number, max?: number) => number;
  };
}
