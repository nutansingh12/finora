import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { JobsController } from '@/controllers/JobsController';

const router = Router();

const cronRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 4, // allow up to 4 calls per minute from Vercel Cron
  standardHeaders: true,
  legacyHeaders: false
});

// Alerts tick endpoint for scheduled execution
router.get('/alerts-tick', cronRateLimit, JobsController.alertsTick);

export default router;

