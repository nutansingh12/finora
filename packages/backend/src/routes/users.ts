import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateToken } from '../middleware/auth';
import { UsersController } from '../controllers/UsersController';

const router = Router();

// All user routes require auth
router.use(authenticateToken);

router.get('/profile', asyncHandler(UsersController.getProfile));

router.put(
  '/profile',
  [
    body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 2, max: 50 })
  ],
  validateRequest,
  asyncHandler(UsersController.updateProfile)
);

router.put('/preferences', validateRequest, asyncHandler(UsersController.updatePreferences));

export default router;

