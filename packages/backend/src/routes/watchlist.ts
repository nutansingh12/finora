import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validateRequest';
import { Stock } from '@/models/Stock';
import { UserStock } from '@/models/UserStock';
import { StockGroup } from '@/models/StockGroup';

const router = Router();

// All watchlist routes require auth
router.use(authenticateToken);

// Persist mobile watchlist to backend user_stocks
// Accepts: { watchlist: Array<{ symbol: string; group?: string; target?: number; targetPrice?: number; cutoffPrice?: number; notes?: string }> }
// Optional: ?replace=true to deactivate stocks not present in payload
router.post(
  '/',
  [
    body('watchlist')
      .isArray({ min: 0 })
      .withMessage('watchlist must be an array'),
    body('watchlist.*.symbol').optional().isString().withMessage('symbol must be a string')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id as string;
      const items = Array.isArray(req.body?.watchlist) ? (req.body.watchlist as any[]) : [];
      const replaceMissing = (String(req.query.replace || '') === 'true') || (req.body?.replace === true);

      let created = 0;
      let updated = 0;
      let groupsCreated = 0;
      const processedSymbols = new Set<string>();

      // Helper to find or create group by name
      const getGroupId = async (name?: string): Promise<string | undefined> => {
        const groupName = (name || 'Watchlist').trim();
        if (!groupName) return undefined;
        let group = await StockGroup.findOne({ user_id: userId, name: groupName } as any);
        if (!group) {
          group = await StockGroup.createGroup({ user_id: userId, name: groupName });
          groupsCreated++;
        }
        return group.id;
      };

      for (const raw of items) {
        const symbol = String(raw?.symbol || '').toUpperCase().trim();
        if (!symbol || processedSymbols.has(symbol)) continue;
        processedSymbols.add(symbol);

        // Ensure stock exists
        let stock = await Stock.findBySymbol(symbol);
        if (!stock) {
          stock = await Stock.createStock({ symbol, name: symbol, exchange: 'UNKNOWN' });
        }

        // Resolve group
        const groupId = await getGroupId(raw?.group || raw?.groupName);

        // Normalize prices
        const target = raw?.target ?? raw?.targetPrice;
        const cutoff = raw?.cutoffPrice;
        const updates = {
          target_price: isFinite(Number(target)) ? Number(target) : undefined,
          cutoff_price: isFinite(Number(cutoff)) ? Number(cutoff) : undefined,
          group_id: groupId,
          notes: typeof raw?.notes === 'string' ? raw.notes : undefined,
        } as any;

        // Update if exists, else add
        const result = await UserStock.updateUserStock(userId, stock.id, updates);
        if (result) {
          updated++;
        } else {
          await UserStock.addUserStock({
            user_id: userId,
            stock_id: stock.id,
            ...updates,
          });
          created++;
        }
      }

      let deactivated = 0;
      if (replaceMissing) {
        // Deactivate user_stocks not in payload
        const existing = await UserStock.db('user_stocks')
          .join('stocks', 'user_stocks.stock_id', 'stocks.id')
          .select('user_stocks.id', 'stocks.symbol')
          .where('user_stocks.user_id', userId)
          .andWhere('user_stocks.is_active', true);
        const toDeactivate = existing
          .filter((r: any) => !processedSymbols.has(String(r.symbol).toUpperCase()))
          .map((r: any) => r.id);
        if (toDeactivate.length > 0) {
          deactivated = await UserStock.db('user_stocks')
            .whereIn('id', toDeactivate)
            .update({ is_active: false, updated_at: new Date() });
        }
      }

      return res.json({
        success: true,
        data: {
          saved: processedSymbols.size,
          created,
          updated,
          deactivated,
          groupsCreated,
        }
      });
    } catch (e) {
      console.error('Watchlist sync failed:', e);
      return res.status(500).json({ success: false, message: 'Watchlist sync failed' });
    }
  }
);

export default router;

