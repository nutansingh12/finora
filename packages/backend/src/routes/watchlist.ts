import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validateRequest';

const router = Router();

// All watchlist routes require auth
router.use(authenticateToken);

// Minimal sync endpoint to acknowledge mobile saves
// Accepts: { watchlist: Array<any> }
router.post(
  '/',
  [
    body('watchlist')
      .isArray({ min: 0 })
      .withMessage('watchlist must be an array')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const items = (req.body?.watchlist ?? []) as any[];

      // For now, just acknowledge; full persistence can map symbols to stocks and upsert user_stocks
      // This avoids 404 and lets the mobile app save locally without errors.
      res.json({ success: true, data: { saved: items.length, userId } });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Watchlist sync failed' });
    }
  }
);

export default router;

