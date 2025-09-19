import { Router } from 'express';
import { AlertController } from '@/controllers/AlertController';
import { authMiddleware } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validateRequest';
import { body, param, query } from 'express-validator';

const router = Router();

// Validation schemas
const createAlertValidation = [
  body('stockId')
    .isUUID()
    .withMessage('Stock ID must be a valid UUID'),
  body('alertType')
    .isIn(['price_below', 'price_above', 'target_reached', 'cutoff_reached'])
    .withMessage('Invalid alert type'),
  body('targetPrice')
    .isFloat({ min: 0.01 })
    .withMessage('Target price must be a positive number'),
  body('message')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Message must be less than 200 characters')
];

const updateAlertValidation = [
  param('alertId')
    .isUUID()
    .withMessage('Alert ID must be a valid UUID'),
  body('alertType')
    .optional()
    .isIn(['price_below', 'price_above', 'target_reached', 'cutoff_reached'])
    .withMessage('Invalid alert type'),
  body('targetPrice')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Target price must be a positive number'),
  body('message')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Message must be less than 200 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const alertIdValidation = [
  param('alertId')
    .isUUID()
    .withMessage('Alert ID must be a valid UUID')
];

const stockIdValidation = [
  param('stockId')
    .isUUID()
    .withMessage('Stock ID must be a valid UUID')
];

const bulkDeleteValidation = [
  body('alertIds')
    .isArray({ min: 1 })
    .withMessage('Alert IDs array is required'),
  body('alertIds.*')
    .isUUID()
    .withMessage('Each alert ID must be a valid UUID')
];

// Routes

// Get user's alerts
router.get(
  '/',
  authMiddleware,
  query('activeOnly')
    .optional()
    .isBoolean()
    .withMessage('activeOnly must be a boolean'),
  query('stockId')
    .optional()
    .isUUID()
    .withMessage('Stock ID must be a valid UUID'),
  query('alertType')
    .optional()
    .isIn(['price_below', 'price_above', 'target_reached', 'cutoff_reached'])
    .withMessage('Invalid alert type'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
  validateRequest,
  AlertController.getUserAlerts
);

// Create new alert
router.post(
  '/',
  authMiddleware,
  createAlertValidation,
  validateRequest,
  AlertController.createAlert
);

// Update alert
router.put(
  '/:alertId',
  authMiddleware,
  updateAlertValidation,
  validateRequest,
  AlertController.updateAlert
);

// Delete alert
router.delete(
  '/:alertId',
  authMiddleware,
  alertIdValidation,
  validateRequest,
  AlertController.deleteAlert
);

// Bulk delete alerts
router.delete(
  '/bulk/delete',
  authMiddleware,
  bulkDeleteValidation,
  validateRequest,
  AlertController.bulkDeleteAlerts
);

// Get alert statistics
router.get(
  '/stats',
  authMiddleware,
  AlertController.getAlertStats
);

// Check user alerts manually
router.post(
  '/check',
  authMiddleware,
  AlertController.checkUserAlerts
);

// Toggle alert status
router.patch(
  '/:alertId/toggle',
  authMiddleware,
  alertIdValidation,
  validateRequest,
  AlertController.toggleAlertStatus
);

// Get alerts for a specific stock
router.get(
  '/stock/:stockId',
  authMiddleware,
  stockIdValidation,
  validateRequest,
  AlertController.getStockAlerts
);

export default router;
