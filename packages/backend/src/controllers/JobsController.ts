import { Request, Response } from 'express';
import { BaseModel } from '@/models/BaseModel';
import { AlertService } from '@/services/AlertService';
import { AlphaVantageService } from '@/services/AlphaVantageService';
import { StockPriceService } from '@/services/StockPriceService';

export class JobsController {
  private static alphaVantageService = new AlphaVantageService();
  private static stockPriceService = new StockPriceService();

  // Cron: fetch latest prices for stocks with active alerts and trigger notifications
  static async alertsTick(req: Request, res: Response): Promise<void> {
    try {
      const secret = process.env.CRON_SECRET || process.env.JOBS_CRON_SECRET;
      const headerSecret = req.header('x-cron-secret');
      const querySecret = (req.query.secret as string) || undefined;
      if (secret && headerSecret !== secret && querySecret !== secret) {
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
}

