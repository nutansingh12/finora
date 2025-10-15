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

// Maintenance endpoints (guarded by x-cron-secret or ?secret=)
router.get('/maintenance/fix-orphans', cronRateLimit, JobsController.fixOrphans);

export default router;

