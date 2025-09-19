import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '@/middleware/errorHandler';
import { StockController } from '@/controllers/StockController';
import { validateRequest } from '@/middleware/validateRequest';
import { authenticateToken } from '@/middleware/auth';

const router = Router();
const stockController = new StockController();

// Add stock validation
const addStockValidation = [
  body('symbol')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Stock symbol is required and must be 1-10 characters'),
  body('groupId')
    .optional()
    .isUUID()
    .withMessage('Group ID must be a valid UUID'),
  body('targetPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Target price must be a positive number'),
  body('cutoffPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cutoff price must be a positive number'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

// Update stock validation
const updateStockValidation = [
  param('stockId')
    .isUUID()
    .withMessage('Stock ID must be a valid UUID'),
  body('groupId')
    .optional()
    .isUUID()
    .withMessage('Group ID must be a valid UUID'),
  body('targetPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Target price must be a positive number'),
  body('cutoffPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cutoff price must be a positive number'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

// Bulk update validation
const bulkUpdateValidation = [
  body('stockIds')
    .isArray({ min: 1 })
    .withMessage('Stock IDs array is required'),
  body('stockIds.*')
    .isUUID()
    .withMessage('Each stock ID must be a valid UUID'),
  body('updates.groupId')
    .optional()
    .isUUID()
    .withMessage('Group ID must be a valid UUID'),
  body('updates.targetPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Target price must be a positive number'),
  body('updates.cutoffPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cutoff price must be a positive number')
];

// Get stocks validation
const getStocksValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['symbol', 'name', 'price', 'change', 'changePercent', 'targetDiff', 'cutoffDiff', 'value52w', 'value24w', 'value12w', 'addedAt'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('groupId')
    .optional()
    .isUUID()
    .withMessage('Group ID must be a valid UUID')
];

// All routes require authentication
router.use(authenticateToken);

// Routes
router.get('/', getStocksValidation, validateRequest, asyncHandler(stockController.getUserStocks));
router.post('/', addStockValidation, validateRequest, asyncHandler(stockController.addStock));
router.get('/:stockId', param('stockId').isUUID(), validateRequest, asyncHandler(stockController.getStock));
router.put('/:stockId', updateStockValidation, validateRequest, asyncHandler(stockController.updateStock));
router.delete('/:stockId', param('stockId').isUUID(), validateRequest, asyncHandler(stockController.removeStock));
router.post('/bulk-update', bulkUpdateValidation, validateRequest, asyncHandler(stockController.bulkUpdateStocks));
router.get('/:stockId/price-history', param('stockId').isUUID(), validateRequest, asyncHandler(stockController.getPriceHistory));
router.get('/:stockId/analysis', param('stockId').isUUID(), validateRequest, asyncHandler(stockController.getStockAnalysis));

export default router;
