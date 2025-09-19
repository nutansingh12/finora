import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '@/middleware/errorHandler';
import { AlertController } from '@/controllers/AlertController';
import { validateRequest } from '@/middleware/validateRequest';
import { authenticateToken } from '@/middleware/auth';

const router = Router();
const alertController = new AlertController();

// Create alert validation
const createAlertValidation = [
  body('stockId')
    .isUUID()
    .withMessage('Stock ID must be a valid UUID'),
  body('type')
    .isIn(['price_below', 'price_above', 'target_reached', 'cutoff_reached'])
    .withMessage('Invalid alert type'),
  body('targetPrice')
    .isFloat({ min: 0 })
    .withMessage('Target price must be a positive number')
];

// Update alert validation
const updateAlertValidation = [
  param('alertId')
    .isUUID()
    .withMessage('Alert ID must be a valid UUID'),
  body('targetPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Target price must be a positive number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Is active must be a boolean')
];

// Get alerts validation
const getAlertsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('isRead')
    .optional()
    .isBoolean()
    .withMessage('Is read must be a boolean'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('Is active must be a boolean'),
  query('type')
    .optional()
    .isIn(['price_below', 'price_above', 'target_reached', 'cutoff_reached'])
    .withMessage('Invalid alert type'),
  query('stockId')
    .optional()
    .isUUID()
    .withMessage('Stock ID must be a valid UUID')
];

// Bulk operations validation
const bulkOperationValidation = [
  body('alertIds')
    .isArray({ min: 1 })
    .withMessage('Alert IDs array is required'),
  body('alertIds.*')
    .isUUID()
    .withMessage('Each alert ID must be a valid UUID')
];

// All routes require authentication
router.use(authenticateToken);

// Routes
router.get('/', getAlertsValidation, validateRequest, asyncHandler(alertController.getAlerts));
router.post('/', createAlertValidation, validateRequest, asyncHandler(alertController.createAlert));
router.get('/unread-count', asyncHandler(alertController.getUnreadCount));
router.get('/:alertId', param('alertId').isUUID(), validateRequest, asyncHandler(alertController.getAlert));
router.put('/:alertId', updateAlertValidation, validateRequest, asyncHandler(alertController.updateAlert));
router.delete('/:alertId', param('alertId').isUUID(), validateRequest, asyncHandler(alertController.deleteAlert));
router.post('/:alertId/mark-read', param('alertId').isUUID(), validateRequest, asyncHandler(alertController.markAsRead));
router.post('/mark-all-read', asyncHandler(alertController.markAllAsRead));
router.post('/bulk-delete', bulkOperationValidation, validateRequest, asyncHandler(alertController.bulkDeleteAlerts));
router.post('/bulk-mark-read', bulkOperationValidation, validateRequest, asyncHandler(alertController.bulkMarkAsRead));
router.delete('/clear-all', asyncHandler(alertController.clearAllAlerts));

export default router;
