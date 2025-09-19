import { Router } from 'express';
import { SearchController } from '@/controllers/SearchController';
import { authMiddleware } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validateRequest';
import { query, param, body } from 'express-validator';

const router = Router();

// Validation schemas
const searchValidation = [
  query('q')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Search query must be 1-50 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

const symbolValidation = [
  param('symbol')
    .isString()
    .isLength({ min: 1, max: 10 })
    .matches(/^[A-Z0-9.-]+$/i)
    .withMessage('Invalid stock symbol format')
];

const multipleQuotesValidation = [
  body('symbols')
    .isArray({ min: 1, max: 50 })
    .withMessage('Symbols array must contain 1-50 symbols'),
  body('symbols.*')
    .isString()
    .isLength({ min: 1, max: 10 })
    .matches(/^[A-Z0-9.-]+$/i)
    .withMessage('Each symbol must be valid format')
];

const sectorValidation = [
  query('sector')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Sector must be 1-50 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Limit must be between 1 and 30')
];

// Routes

// Search stocks with autocomplete
router.get(
  '/stocks',
  searchValidation,
  validateRequest,
  SearchController.searchStocks
);

// Get stock quote by symbol
router.get(
  '/quote/:symbol',
  symbolValidation,
  validateRequest,
  SearchController.getStockQuote
);

// Get multiple stock quotes
router.post(
  '/quotes',
  multipleQuotesValidation,
  validateRequest,
  SearchController.getMultipleQuotes
);

// Get trending stocks
router.get(
  '/trending',
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  validateRequest,
  SearchController.getTrendingStocks
);

// Get popular stocks by sector
router.get(
  '/popular/sector',
  sectorValidation,
  validateRequest,
  SearchController.getPopularStocksBySector
);

// Get stock suggestions based on user's portfolio (requires auth)
router.get(
  '/suggestions',
  authMiddleware,
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20'),
  validateRequest,
  SearchController.getStockSuggestions
);

export default router;
