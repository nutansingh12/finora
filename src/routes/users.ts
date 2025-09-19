import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '@/middleware/errorHandler';
import { UserController } from '@/controllers/UserController';
import { validateRequest } from '@/middleware/validateRequest';
import { authenticateToken } from '@/middleware/auth';

const router = Router();
const userController = new UserController();

// Update user profile validation
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
];

// Update preferences validation
const updatePreferencesValidation = [
  body('defaultTargetPriceStrategy')
    .optional()
    .isIn(['manual', '52w_low', '24w_low', '12w_low'])
    .withMessage('Invalid target price strategy'),
  body('alertsEnabled')
    .optional()
    .isBoolean()
    .withMessage('Alerts enabled must be a boolean'),
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be a boolean'),
  body('pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be a boolean'),
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Invalid theme'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters'),
  body('timezone')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid timezone')
];

// All routes require authentication
router.use(authenticateToken);

// Routes
router.get('/profile', asyncHandler(userController.getProfile));
router.put('/profile', updateProfileValidation, validateRequest, asyncHandler(userController.updateProfile));
router.put('/preferences', updatePreferencesValidation, validateRequest, asyncHandler(userController.updatePreferences));
router.delete('/account', asyncHandler(userController.deleteAccount));
router.get('/stats', asyncHandler(userController.getUserStats));

export default router;
