import { Request, Response } from 'express';
import { BaseModel } from '@/models/BaseModel';
import { AlertService } from '@/services/AlertService';
import { AlphaVantageService } from '@/services/AlphaVantageService';
import { StockPriceService } from '@/services/StockPriceService';

export class JobsController {
  private static alphaVantageService = new AlphaVantageService();
  private static stockPriceService = new StockPriceService();

  private static authorizeCron(req: Request): boolean {
    const secret = process.env.CRON_SECRET || process.env.JOBS_CRON_SECRET;
    const headerSecret = req.header('x-cron-secret');
    const querySecret = (req.query.secret as string) || undefined;
    return !secret || headerSecret === secret || querySecret === secret;
  }

  // Cron: fetch latest prices for stocks with active alerts and trigger notifications
  static async alertsTick(req: Request, res: Response): Promise<void> {
    try {
      if (!JobsController.authorizeCron(req)) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // Find distinct stocks with active alerts
      const rows = await BaseModel.db('alerts')
        .distinct('alerts.stock_id')
        .join('stocks', 'alerts.stock_id', 'stocks.id')
        .select('alerts.stock_id', 'stocks.symbol')
        .where('alerts.is_active', true);

      let updated = 0;
      let triggered = 0;

      for (const row of rows) {
        const symbol: string = row.symbol;
        const stockId: string = row.stock_id;

        // Get latest quote
        const quote = await JobsController.alphaVantageService.getStockQuote(symbol);
        if (!quote) continue;

        // Persist price
        await JobsController.stockPriceService.updateStockPrice(stockId, quote);
        updated++;

        // Evaluate alerts for this stock
        const triggers = await AlertService.checkStockAlerts(stockId);
        triggered += triggers.length;

        // be gentle with rate limits
        await new Promise((r) => setTimeout(r, 250));
      }

      res.json({
        success: true,
        message: 'Alerts tick completed',
        data: {
          stocksChecked: rows.length,
          pricesUpdated: updated,
          alertsTriggered: triggered,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('alertsTick error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Maintenance: find and optionally fix orphaned user_stocks (no matching stocks row)
  static async fixOrphans(req: Request, res: Response): Promise<void> {
    try {
      if (!JobsController.authorizeCron(req)) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const action = (req.query.action as string) || 'dryRun'; // 'dryRun' | 'deactivate' | 'delete'
      const orphans = await BaseModel.db('user_stocks')
        .leftJoin('stocks', 'user_stocks.stock_id', 'stocks.id')
        .whereNull('stocks.id')
        .select('user_stocks.id', 'user_stocks.user_id', 'user_stocks.stock_id', 'user_stocks.is_active') as Array<any>;

      let affected = 0;
      if (action === 'deactivate' && orphans.length > 0) {
        affected = await BaseModel.db('user_stocks')
          .whereIn('id', orphans.map(o => o.id))
          .update({ is_active: false, updated_at: new Date() });
      } else if (action === 'delete' && orphans.length > 0) {
        affected = await BaseModel.db('user_stocks')
          .whereIn('id', orphans.map(o => o.id))
          .del();
      }

      res.json({
        success: true,
        data: {
          totalOrphans: orphans.length,
          action,
          affected,
          sample: orphans.slice(0, 10)
        }
      });
    } catch (error) {
      console.error('fixOrphans error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
