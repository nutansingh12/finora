import { Router } from 'express';
import { FeedbackController } from '../controllers/FeedbackController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Submit feedback (authenticated users)
router.post(
  '/',
  authenticateToken,
  FeedbackController.submitFeedback
);

// Get user's feedback history (authenticated users)
router.get(
  '/my-feedback',
  authenticateToken,
  FeedbackController.getUserFeedback
);

// Admin routes (TODO: Add admin authentication middleware)

// Get feedback statistics
router.get(
  '/admin/statistics',
  // TODO: Add admin authentication middleware
  FeedbackController.getFeedbackStatistics
);

// Get recent feedback
router.get(
  '/admin/recent',
  // TODO: Add admin authentication middleware
  FeedbackController.getRecentFeedback
);

// Get feedback by rating
router.get(
  '/admin/rating/:rating',
  // TODO: Add admin authentication middleware
  FeedbackController.getFeedbackByRating
);

// Resend failed feedback emails
router.post(
  '/admin/resend-failed',
  // TODO: Add admin authentication middleware
  FeedbackController.resendFailedEmails
);

export default router;
