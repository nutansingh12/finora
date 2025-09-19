import { Router } from 'express';
import { ApiKeyController } from '../controllers/ApiKeyController';
import { authenticateToken } from '../middleware/auth';
import { body, param } from 'express-validator';

const router = Router();

// User API Key Management Routes
// All routes require authentication

// Get user's API keys
router.get(
  '/',
  authenticateToken,
  ApiKeyController.getUserApiKeys
);

// Request new API key
router.post(
  '/request',
  authenticateToken,
  [
    body('provider')
      .optional()
      .isIn(['alpha_vantage', 'yahoo_finance', 'iex_cloud'])
      .withMessage('Invalid provider'),
    body('keyName')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Key name must be between 1 and 100 characters')
  ],
  ApiKeyController.requestApiKey
);

// Get specific API key usage
router.get(
  '/:keyId/usage',
  authenticateToken,
  [
    param('keyId')
      .isUUID()
      .withMessage('Invalid key ID format')
  ],
  ApiKeyController.getApiKeyUsage
);

// Deactivate API key
router.patch(
  '/:keyId/deactivate',
  authenticateToken,
  [
    param('keyId')
      .isUUID()
      .withMessage('Invalid key ID format')
  ],
  ApiKeyController.deactivateApiKey
);

// Request quota increase
router.post(
  '/quota-increase',
  authenticateToken,
  [
    body('currentUsage')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Current usage must be a non-negative integer'),
    body('requestedQuota')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Requested quota must be a positive integer'),
    body('reason')
      .optional()
      .isLength({ min: 10, max: 500 })
      .withMessage('Reason must be between 10 and 500 characters')
  ],
  ApiKeyController.requestQuotaIncrease
);

// Admin Routes (TODO: Add admin middleware)

// Get service status
router.get(
  '/admin/status',
  // TODO: Add admin authentication middleware
  ApiKeyController.getServiceStatus
);

// Validate API keys in pool
router.post(
  '/admin/validate',
  // TODO: Add admin authentication middleware
  ApiKeyController.validateApiKeys
);

// Get pool statistics
router.get(
  '/admin/pool-stats',
  // TODO: Add admin authentication middleware
  ApiKeyController.getPoolStatistics
);

// Get skip list for API key registration
router.get(
  '/admin/skip-list',
  // TODO: Add admin authentication middleware
  ApiKeyController.getSkipList
);

export default router;
