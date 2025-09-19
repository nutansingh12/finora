import { Router } from 'express';
import { MarketDataController } from '../controllers/MarketDataController';
import { authenticateToken } from '../middleware/auth';
import { body, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for market data endpoints
const marketDataRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    message: 'Too many market data requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiting for search and batch operations
const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    message: 'Too many search requests, please try again later'
  }
});

const batchRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes
  message: {
    success: false,
    message: 'Too many batch requests, please try again later'
  }
});

// Validation middleware
const validateSymbol = [
  param('symbol')
    .isString()
    .isLength({ min: 1, max: 10 })
    .matches(/^[A-Za-z0-9.-]+$/)
    .withMessage('Invalid stock symbol format')
];

const validateHistoricalParams = [
  ...validateSymbol,
  query('period')
    .optional()
    .isIn(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'])
    .withMessage('Invalid period parameter'),
  query('interval')
    .optional()
    .isIn(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'])
    .withMessage('Invalid interval parameter')
];

const validateSearchQuery = [
  query('q')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Search query must be between 1 and 50 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

const validateSymbolsArray = [
  body('symbols')
    .isArray({ min: 1, max: 50 })
    .withMessage('Symbols must be an array with 1-50 items'),
  body('symbols.*')
    .isString()
    .isLength({ min: 1, max: 10 })
    .matches(/^[A-Za-z0-9.-]+$/)
    .withMessage('Invalid symbol format')
];

const validateBatchSymbols = [
  body('symbols')
    .isArray({ min: 1, max: 100 })
    .withMessage('Symbols must be an array with 1-100 items'),
  body('symbols.*')
    .isString()
    .isLength({ min: 1, max: 10 })
    .matches(/^[A-Za-z0-9.-]+$/)
    .withMessage('Invalid symbol format')
];

// Public endpoints (with rate limiting)
router.get('/stock/:symbol', 
  marketDataRateLimit,
  validateSymbol,
  MarketDataController.getStockData
);

router.get('/stock/:symbol/historical',
  marketDataRateLimit,
  validateHistoricalParams,
  MarketDataController.getHistoricalData
);

router.get('/market/summary',
  marketDataRateLimit,
  MarketDataController.getMarketSummary
);

router.get('/market/trending',
  marketDataRateLimit,
  query('region')
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Invalid region parameter'),
  MarketDataController.getTrendingStocks
);

router.get('/search',
  searchRateLimit,
  validateSearchQuery,
  MarketDataController.searchStocks
);

router.get('/exchange-rates',
  marketDataRateLimit,
  query('base')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Base currency must be 3 characters'),
  MarketDataController.getExchangeRates
);

router.get('/health',
  MarketDataController.getServiceHealth
);

// Protected endpoints (require authentication)
router.post('/validate-symbols',
  authenticateToken,
  marketDataRateLimit,
  validateSymbolsArray,
  MarketDataController.validateSymbols
);

// Admin endpoints (require authentication and admin role)
router.post('/admin/clear-caches',
  authenticateToken,
  // TODO: Add admin role middleware
  MarketDataController.clearCaches
);

router.post('/admin/batch-update',
  authenticateToken,
  batchRateLimit,
  // TODO: Add admin role middleware
  validateBatchSymbols,
  MarketDataController.batchUpdatePrices
);

export default router;
