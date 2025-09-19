import { Router } from 'express';
import { StockController } from '../controllers/StockController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { body, param, query } from 'express-validator';

const router = Router();

// Validation schemas
const addStockValidation = [
  body('symbol')
    .isString()
    .isLength({ min: 1, max: 10 })
    .withMessage('Symbol must be 1-10 characters'),
  body('targetPrice')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Target price must be a positive number'),
  body('cutoffPrice')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Cutoff price must be a positive number'),
  body('groupId')
    .optional()
    .isUUID()
    .withMessage('Group ID must be a valid UUID'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

const updateStockValidation = [
  param('stockId')
    .isUUID()
    .withMessage('Stock ID must be a valid UUID'),
  body('targetPrice')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Target price must be a positive number'),
  body('cutoffPrice')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Cutoff price must be a positive number'),
  body('groupId')
    .optional()
    .isUUID()
    .withMessage('Group ID must be a valid UUID'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

const stockIdValidation = [
  param('stockId')
    .isUUID()
    .withMessage('Stock ID must be a valid UUID')
];

const bulkUpdateValidation = [
  body('stockIds')
    .isArray({ min: 1 })
    .withMessage('Stock IDs array is required'),
  body('stockIds.*')
    .isUUID()
    .withMessage('Each stock ID must be a valid UUID'),
  body('updates')
    .isObject()
    .withMessage('Updates object is required')
];

const searchValidation = [
  query('q')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Search query must be 1-50 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Routes

// Get user's stocks
router.get(
  '/',
  authenticateToken,
  query('groupId').optional().isUUID().withMessage('Group ID must be a valid UUID'),
  query('sortBy').optional().isIn(['symbol', 'name', 'addedAt', 'targetPrice', 'currentPrice']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  validateRequest,
  StockController.getUserStocks
);

// Add stock to portfolio
router.post(
  '/',
  authenticateToken,
  addStockValidation,
  validateRequest,
  StockController.addUserStock
);

// Get stock details
router.get(
  '/:stockId',
  stockIdValidation,
  validateRequest,
  StockController.getStockDetails
);

// Update user stock
router.put(
  '/:stockId',
  authenticateToken,
  updateStockValidation,
  validateRequest,
  StockController.updateUserStock
);

// Remove stock from portfolio
router.delete(
  '/:stockId',
  authenticateToken,
  stockIdValidation,
  validateRequest,
  StockController.removeUserStock
);

// Get recently added stocks
router.get(
  '/recent/added',
  authenticateToken,
  StockController.getRecentlyAddedStocks
);

// Bulk update stocks
router.patch(
  '/bulk/update',
  authenticateToken,
  bulkUpdateValidation,
  validateRequest,
  StockController.bulkUpdateStocks
);

// Get portfolio statistics
router.get(
  '/portfolio/stats',
  authenticateToken,
  StockController.getPortfolioStats
);

// Search user's stocks
router.get(
  '/search/mine',
  authenticateToken,
  searchValidation,
  validateRequest,
  StockController.searchUserStocks
);

export default router;
