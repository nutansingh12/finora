import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthController } from '../controllers/AuthController';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateToken } from '../middleware/auth';

const router = Router();
// AuthController methods are static, no need to instantiate

// Register validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
];

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Password reset validation rules
const passwordResetValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

// Reset password validation rules
const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Change password validation rules
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Verification validation
const verifyValidation = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
];

// Resend verification validation
const resendVerificationValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

// Routes
router.post('/register', registerValidation, validateRequest, asyncHandler(AuthController.register));
router.post('/login', loginValidation, validateRequest, asyncHandler(AuthController.login));
router.post('/logout', authenticateToken, asyncHandler(AuthController.logout));
router.post('/refresh', asyncHandler(AuthController.refreshToken));
router.get('/me', authenticateToken, asyncHandler(AuthController.getCurrentUser));

// New routes
router.post('/forgot-password', passwordResetValidation, validateRequest, asyncHandler(AuthController.forgotPassword));
router.post('/reset-password', resetPasswordValidation, validateRequest, asyncHandler(AuthController.resetPassword));
router.post('/change-password', changePasswordValidation, validateRequest, authenticateToken, asyncHandler(AuthController.changePassword));
router.post('/verify-email', verifyValidation, validateRequest, asyncHandler(AuthController.verifyEmail));
router.post('/resend-verification', resendVerificationValidation, validateRequest, asyncHandler(AuthController.resendVerification));


// Sessions management
router.get('/sessions', authenticateToken, asyncHandler(AuthController.listSessions));
router.delete('/sessions/:id', authenticateToken, asyncHandler(AuthController.revokeSession));

export default router;
