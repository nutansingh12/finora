import { Router } from 'express';
import { query } from 'express-validator';
import { asyncHandler } from '@/middleware/errorHandler';
import { SearchController } from '@/controllers/SearchController';
import { validateRequest } from '@/middleware/validateRequest';
import { optionalAuth } from '@/middleware/auth';

const router = Router();
const searchController = new SearchController();

// Search stocks validation
const searchStocksValidation = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Search query is required and must be less than 50 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('exchange')
    .optional()
    .isLength({ min: 1, max: 10 })
    .withMessage('Exchange must be less than 10 characters'),
  query('type')
    .optional()
    .isIn(['stock', 'etf', 'mutual_fund'])
    .withMessage('Invalid stock type')
];

// Get stock info validation
const getStockInfoValidation = [
  query('symbol')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Stock symbol is required and must be 1-10 characters')
];

// Routes (some require optional auth for personalized results)
router.get('/stocks', optionalAuth, searchStocksValidation, validateRequest, asyncHandler(searchController.searchStocks));
router.get('/stock-info', getStockInfoValidation, validateRequest, asyncHandler(searchController.getStockInfo));
router.get('/popular', optionalAuth, asyncHandler(searchController.getPopularStocks));
router.get('/trending', optionalAuth, asyncHandler(searchController.getTrendingStocks));
router.get('/sectors', asyncHandler(searchController.getSectors));
router.get('/exchanges', asyncHandler(searchController.getExchanges));

export default router;
