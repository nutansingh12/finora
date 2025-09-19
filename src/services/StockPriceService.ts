import { YahooFinanceService, YahooStockData } from './YahooFinanceService';
import { Stock, StockModel } from '@/models/Stock';
import { StockPrice } from '@/models/StockPrice';
import { HistoricalData } from '@/models/HistoricalData';
import { RollingAnalysis } from '@/models/RollingAnalysis';
import { UserStock } from '@/models/UserStock';
import { CustomError } from '@/middleware/errorHandler';

export class StockPriceService {
  private yahooService: YahooFinanceService;

  constructor() {
    this.yahooService = new YahooFinanceService();
  }

  // Update price for a single stock
  async updateStockPrice(stockId: string): Promise<void> {
    const stock = await Stock.findById<StockModel>(stockId);
    if (!stock) {
      throw new CustomError('Stock not found', 404);
    }

    const yahooData = await this.yahooService.getStockQuote(stock.symbol);
    if (!yahooData) {
      console.warn(`No price data available for ${stock.symbol}`);
      return;
    }

    // Update stock metadata if needed
    await this.updateStockMetadata(stock, yahooData);

    // Save current price
    await StockPrice.createPrice({
      stock_id: stockId,
      price: yahooData.price,
      change: yahooData.change,
      change_percent: yahooData.changePercent,
      volume: yahooData.volume,
      market_cap: yahooData.marketCap,
      day_high: yahooData.dayHigh,
      day_low: yahooData.dayLow,
      week_52_high: yahooData.week52High,
      week_52_low: yahooData.week52Low,
      previous_close: yahooData.previousClose,
      source: 'yahoo',
      timestamp: new Date()
    });

    console.log(`Updated price for ${stock.symbol}: $${yahooData.price}`);
  }

  // Update prices for multiple stocks
  async updateMultipleStockPrices(stockIds: string[]): Promise<void> {
    const stocks = await Stock.findAll<StockModel>({ 
      id: stockIds, 
      is_active: true 
    });

    if (stocks.length === 0) {
      return;
    }

    const symbols = stocks.map(stock => stock.symbol);
    const yahooDataList = await this.yahooService.getMultipleQuotes(symbols);

    // Create a map for quick lookup
    const yahooDataMap = new Map(
      yahooDataList.map(data => [data.symbol, data])
    );

    // Update each stock
    for (const stock of stocks) {
      const yahooData = yahooDataMap.get(stock.symbol);
      if (yahooData) {
        try {
          await this.updateStockMetadata(stock, yahooData);
          
          await StockPrice.createPrice({
            stock_id: stock.id,
            price: yahooData.price,
            change: yahooData.change,
            change_percent: yahooData.changePercent,
            volume: yahooData.volume,
            market_cap: yahooData.marketCap,
            day_high: yahooData.dayHigh,
            day_low: yahooData.dayLow,
            week_52_high: yahooData.week52High,
            week_52_low: yahooData.week52Low,
            previous_close: yahooData.previousClose,
            source: 'yahoo',
            timestamp: new Date()
          });
        } catch (error) {
          console.error(`Error updating price for ${stock.symbol}:`, error);
        }
      }
    }

    console.log(`Updated prices for ${yahooDataList.length} stocks`);
  }

  // Update all tracked stocks
  async updateAllTrackedStocks(): Promise<void> {
    // Get all stocks that are being tracked by users
    const trackedStocks = await UserStock.getTrackedStocks();
    
    if (trackedStocks.length === 0) {
      console.log('No stocks to update');
      return;
    }

    const stockIds = trackedStocks.map(stock => stock.stock_id);
    await this.updateMultipleStockPrices(stockIds);
  }

  // Sync historical data for a stock
  async syncHistoricalData(
    stockId: string, 
    period: '1y' | '2y' | '5y' = '1y'
  ): Promise<void> {
    const stock = await Stock.findById<StockModel>(stockId);
    if (!stock) {
      throw new CustomError('Stock not found', 404);
    }

    const historicalData = await this.yahooService.getHistoricalData(
      stock.symbol, 
      period, 
      '1d'
    );

    if (historicalData.length === 0) {
      console.warn(`No historical data available for ${stock.symbol}`);
      return;
    }

    // Save historical data
    for (const data of historicalData) {
      try {
        await HistoricalData.upsertHistoricalData({
          stock_id: stockId,
          date: new Date(data.date),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          adjusted_close: data.adjClose,
          volume: data.volume,
          source: 'yahoo'
        });
      } catch (error) {
        // Skip duplicate entries
        if (!error.message?.includes('duplicate')) {
          console.error(`Error saving historical data for ${stock.symbol} on ${data.date}:`, error);
        }
      }
    }

    console.log(`Synced ${historicalData.length} historical records for ${stock.symbol}`);
  }

  // Calculate rolling analysis for a stock
  async calculateRollingAnalysis(stockId: string): Promise<void> {
    const stock = await Stock.findById<StockModel>(stockId);
    if (!stock) {
      throw new CustomError('Stock not found', 404);
    }

    // Get current price
    const currentPrice = await StockPrice.getLatestPrice(stockId);
    if (!currentPrice) {
      console.warn(`No current price available for ${stock.symbol}`);
      return;
    }

    // Get historical data for calculations
    const historicalData = await HistoricalData.getHistoricalData(stockId, 365); // 1 year

    if (historicalData.length === 0) {
      console.warn(`No historical data available for ${stock.symbol}`);
      return;
    }

    // Calculate rolling lows and highs
    const now = new Date();
    const week52Ago = new Date(now.getTime() - 52 * 7 * 24 * 60 * 60 * 1000);
    const week24Ago = new Date(now.getTime() - 24 * 7 * 24 * 60 * 60 * 1000);
    const week12Ago = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);

    const data52w = historicalData.filter(d => d.date >= week52Ago);
    const data24w = historicalData.filter(d => d.date >= week24Ago);
    const data12w = historicalData.filter(d => d.date >= week12Ago);

    const week52Low = Math.min(...data52w.map(d => d.low));
    const week24Low = Math.min(...data24w.map(d => d.low));
    const week12Low = Math.min(...data12w.map(d => d.low));

    const week52High = Math.max(...data52w.map(d => d.high));
    const week24High = Math.max(...data24w.map(d => d.high));
    const week12High = Math.max(...data12w.map(d => d.high));

    // Calculate percentages
    const percentAbove52WLow = ((currentPrice.price - week52Low) / currentPrice.price) * 100;
    const percentAbove24WLow = ((currentPrice.price - week24Low) / currentPrice.price) * 100;
    const percentAbove12WLow = ((currentPrice.price - week12Low) / currentPrice.price) * 100;

    const percentBelow52WHigh = ((week52High - currentPrice.price) / currentPrice.price) * 100;
    const percentBelow24WHigh = ((week24High - currentPrice.price) / currentPrice.price) * 100;
    const percentBelow12WHigh = ((week12High - currentPrice.price) / currentPrice.price) * 100;

    // Save rolling analysis
    await RollingAnalysis.upsertAnalysis({
      stock_id: stockId,
      current_price: currentPrice.price,
      week_52_low: week52Low,
      week_24_low: week24Low,
      week_12_low: week12Low,
      week_52_high: week52High,
      week_24_high: week24High,
      week_12_high: week12High,
      percent_above_52w_low: percentAbove52WLow,
      percent_above_24w_low: percentAbove24WLow,
      percent_above_12w_low: percentAbove12WLow,
      percent_below_52w_high: percentBelow52WHigh,
      percent_below_24w_high: percentBelow24WHigh,
      percent_below_12w_high: percentBelow12WHigh,
      calculated_at: new Date()
    });

    console.log(`Calculated rolling analysis for ${stock.symbol}`);
  }

  // Search and add new stock
  async searchAndAddStock(symbol: string): Promise<StockModel> {
    // Check if stock already exists
    let stock = await Stock.findBySymbol(symbol);
    if (stock) {
      return stock;
    }

    // Fetch stock data from Yahoo Finance
    const yahooData = await this.yahooService.getStockQuote(symbol);
    if (!yahooData) {
      throw new CustomError(`Stock symbol "${symbol}" not found`, 404);
    }

    // Create new stock
    stock = await Stock.upsertStock({
      symbol: yahooData.symbol,
      name: yahooData.name,
      exchange: yahooData.exchange,
      type: 'stock',
      sector: yahooData.sector,
      industry: yahooData.industry,
      market_cap: yahooData.marketCap,
      currency: yahooData.currency
    });

    // Save initial price
    await StockPrice.createPrice({
      stock_id: stock.id,
      price: yahooData.price,
      change: yahooData.change,
      change_percent: yahooData.changePercent,
      volume: yahooData.volume,
      market_cap: yahooData.marketCap,
      day_high: yahooData.dayHigh,
      day_low: yahooData.dayLow,
      week_52_high: yahooData.week52High,
      week_52_low: yahooData.week52Low,
      previous_close: yahooData.previousClose,
      source: 'yahoo',
      timestamp: new Date()
    });

    // Sync historical data in background
    this.syncHistoricalData(stock.id, '1y').catch(error => {
      console.error(`Error syncing historical data for ${stock.symbol}:`, error);
    });

    return stock;
  }

  // Update stock metadata
  private async updateStockMetadata(stock: StockModel, yahooData: YahooStockData): Promise<void> {
    const updates: Partial<StockModel> = {};
    let hasUpdates = false;

    if (stock.name !== yahooData.name && yahooData.name) {
      updates.name = yahooData.name;
      hasUpdates = true;
    }

    if (stock.sector !== yahooData.sector && yahooData.sector) {
      updates.sector = yahooData.sector;
      hasUpdates = true;
    }

    if (stock.industry !== yahooData.industry && yahooData.industry) {
      updates.industry = yahooData.industry;
      hasUpdates = true;
    }

    if (stock.market_cap !== yahooData.marketCap && yahooData.marketCap) {
      updates.market_cap = yahooData.marketCap;
      hasUpdates = true;
    }

    if (hasUpdates) {
      updates.last_updated = new Date();
      await Stock.updateById(stock.id, updates);
    }
  }

  // Get current price for a stock
  async getCurrentPrice(stockId: string): Promise<number | null> {
    const price = await StockPrice.getLatestPrice(stockId);
    return price?.price || null;
  }

  // Get price history for a stock
  async getPriceHistory(
    stockId: string, 
    days: number = 30
  ): Promise<Array<{ date: Date; price: number; volume: number }>> {
    return StockPrice.getPriceHistory(stockId, days);
  }
}
