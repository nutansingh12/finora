import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';

import { BaseModel } from '../models/BaseModel';
import { Stock } from '../models/Stock';
import { UserStock } from '../models/UserStock';
import { StockGroup } from '../models/StockGroup';
import { YahooFinanceService } from './YahooFinanceService';

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: Array<{
    row: number;
    symbol?: string;
    error: string;
  }>;
  duplicates: Array<{
    row: number;
    symbol: string;
    message: string;
  }>;
}

export interface ExportData {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  industry?: string;
  currentPrice?: number;
  targetPrice?: number;
  cutoffPrice?: number;
  groupName?: string;
  notes?: string;
  addedAt: string;
  percentAbove52WLow?: number;
  percentAbove24WLow?: number;
  percentAbove12WLow?: number;
  change?: number;
  changePercent?: number;
}

export interface ImportRow {
  symbol: string;
  targetPrice?: number;
  cutoffPrice?: number;
  groupName?: string;
  notes?: string;
}

export class ImportExportService {
  private static yahooFinanceService = new YahooFinanceService();

  // Import stocks from CSV
  static async importStocksFromCSV(
    userId: string,
    csvContent: string | Buffer,
    options: {
      skipDuplicates?: boolean;
      createGroups?: boolean;
      validateSymbols?: boolean;
    } = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      totalRows: 0,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
      duplicates: []
    };

    try {
      const rows = await this.parseCSV(csvContent);
      result.totalRows = rows.length;

      if (rows.length === 0) {
        result.errors.push({
          row: 0,
          error: 'CSV file is empty or invalid format'
        });
        return result;
      }

      // Validate CSV headers
      const requiredHeaders = ['symbol'];
      const headers = Object.keys(rows[0]);
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        result.errors.push({
          row: 0,
          error: `Missing required headers: ${missingHeaders.join(', ')}`
        });
        return result;
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // Account for header row

        try {
          await this.processImportRow(userId, row, rowNumber, result, options);
        } catch (error) {
          result.errors.push({
            row: rowNumber,
            symbol: row.symbol,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          result.failedImports++;
        }
      }

      result.success = result.successfulImports > 0;
      return result;
    } catch (error) {
      result.errors.push({
        row: 0,
        error: error instanceof Error ? error.message : 'Failed to parse CSV'
      });
      return result;
    }
  }

  // Export user's portfolio to CSV
  static async exportPortfolioToCSV(
    userId: string,
    options: {
      includeAnalysis?: boolean;
      includeCurrentPrices?: boolean;
      groupId?: string;
    } = {}
  ): Promise<string> {
    try {
      const userStocks = await UserStock.getUserStocks(userId, {
        groupId: options.groupId
      });

      const exportData: ExportData[] = [];

      for (const userStock of userStocks) {
        const data: ExportData = {
          symbol: userStock.stock.symbol,
          name: userStock.stock.name,
          exchange: userStock.stock.exchange,
          sector: userStock.stock.sector,
          industry: userStock.stock.industry,
          targetPrice: userStock.target_price,
          cutoffPrice: userStock.cutoff_price,
          groupName: undefined,
          notes: userStock.notes,
          addedAt: ((userStock.added_at ?? new Date()).toISOString().split('T')[0]) as string
        };

        // Include current prices if requested
        if (options.includeCurrentPrices) {
          const currentPrice = await BaseModel.db('stock_prices')
            .select('price', 'change', 'change_percent')
            .where('stock_id', userStock.stock_id)
            .where('is_latest', true)
            .first();

          if (currentPrice) {
            data.currentPrice = currentPrice.price;
            data.change = currentPrice.change;
            data.changePercent = currentPrice.change_percent;
          }
        }

        // Include analysis if requested
        if (options.includeAnalysis) {
          const analysis = await BaseModel.db('rolling_analysis')
            .select('percent_above_52w_low', 'percent_above_24w_low', 'percent_above_12w_low')
            .where('stock_id', userStock.stock_id)
            .where('is_latest', true)
            .first();

          if (analysis) {
            data.percentAbove52WLow = analysis.percent_above_52w_low;
            data.percentAbove24WLow = analysis.percent_above_24w_low;
            data.percentAbove12WLow = analysis.percent_above_12w_low;
          }
        }

        exportData.push(data);
      }

      return this.generateCSV(exportData);
    } catch (error) {
      throw new Error(`Failed to export portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Export portfolio template
  static async exportTemplate(): Promise<string> {
    const templateData = [
      {
        symbol: 'AAPL',
        targetPrice: 150.00,
        cutoffPrice: 120.00,
        groupName: 'Tech Stocks',
        notes: 'Example stock entry'
      },
      {
        symbol: 'GOOGL',
        targetPrice: 2500.00,
        cutoffPrice: 2000.00,
        groupName: 'Tech Stocks',
        notes: 'Another example'
      }
    ];

    return this.generateCSV(templateData);
  }

  // Validate import data
  static async validateImportData(csvContent: string | Buffer): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    previewData: ImportRow[];
  }> {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      previewData: [] as ImportRow[]
    };

    try {
      const rows = await this.parseCSV(csvContent);
      
      if (rows.length === 0) {
        result.isValid = false;
        result.errors.push('CSV file is empty');
        return result;
      }

      // Check headers
      const headers = Object.keys(rows[0]);
      if (!headers.includes('symbol')) {
        result.isValid = false;
        result.errors.push('Missing required "symbol" column');
      }

      // Validate first few rows
      const previewRows = rows.slice(0, 5);
      for (let i = 0; i < previewRows.length; i++) {
        const row = previewRows[i];
        
        if (!row.symbol || row.symbol.trim() === '') {
          result.warnings.push(`Row ${i + 2}: Empty symbol`);
          continue;
        }

        // Validate symbol format
        if (!/^[A-Z]{1,5}$/.test(row.symbol.toUpperCase())) {
          result.warnings.push(`Row ${i + 2}: Invalid symbol format "${row.symbol}"`);
        }

        // Validate prices
        if (row.targetPrice && (isNaN(Number(row.targetPrice)) || Number(row.targetPrice) <= 0)) {
          result.warnings.push(`Row ${i + 2}: Invalid target price "${row.targetPrice}"`);
        }

        if (row.cutoffPrice && (isNaN(Number(row.cutoffPrice)) || Number(row.cutoffPrice) <= 0)) {
          result.warnings.push(`Row ${i + 2}: Invalid cutoff price "${row.cutoffPrice}"`);
        }

        result.previewData.push({
          symbol: row.symbol.toUpperCase(),
          targetPrice: row.targetPrice ? Number(row.targetPrice) : undefined,
          cutoffPrice: row.cutoffPrice ? Number(row.cutoffPrice) : undefined,
          groupName: row.groupName,
          notes: row.notes
        });
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : 'Failed to parse CSV');
      return result;
    }
  }

  // Get import/export statistics
  static async getImportExportStats(userId: string): Promise<{
    totalImports: number;
    totalExports: number;
    lastImportDate?: Date;
    lastExportDate?: Date;
    importSuccessRate: number;
  }> {
    const stats = await BaseModel.db('import_export_logs')
      .select(
        BaseModel.db.raw('COUNT(CASE WHEN operation_type = "import" THEN 1 END) as total_imports'),
        BaseModel.db.raw('COUNT(CASE WHEN operation_type = "export" THEN 1 END) as total_exports'),
        BaseModel.db.raw('MAX(CASE WHEN operation_type = "import" THEN created_at END) as last_import_date'),
        BaseModel.db.raw('MAX(CASE WHEN operation_type = "export" THEN created_at END) as last_export_date'),
        BaseModel.db.raw('AVG(CASE WHEN operation_type = "import" THEN success_rate END) as import_success_rate')
      )
      .where('user_id', userId)
      .first();

    return {
      totalImports: parseInt(stats?.total_imports) || 0,
      totalExports: parseInt(stats?.total_exports) || 0,
      lastImportDate: stats?.last_import_date ? new Date(stats.last_import_date) : undefined,
      lastExportDate: stats?.last_export_date ? new Date(stats.last_export_date) : undefined,
      importSuccessRate: parseFloat(stats?.import_success_rate) || 0
    };
  }

  // Private helper methods
  private static async parseCSV(csvContent: string | Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(csvContent.toString());

      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  private static async processImportRow(
    userId: string,
    row: any,
    rowNumber: number,
    result: ImportResult,
    options: any
  ): Promise<void> {
    const symbol = row.symbol?.toUpperCase()?.trim();
    
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    // Check for duplicates
    const existingUserStock = await UserStock.findOne({
      user_id: userId,
      stock_id: await this.getStockIdBySymbol(symbol)
    });

    if (existingUserStock && !options.skipDuplicates) {
      result.duplicates.push({
        row: rowNumber,
        symbol,
        message: 'Stock already exists in portfolio'
      });
      return;
    }

    // Validate symbol if requested
    if (options.validateSymbols) {
      const stockData = await this.yahooFinanceService.getStockQuote(symbol);
      if (!stockData) {
        throw new Error(`Invalid or unknown stock symbol: ${symbol}`);
      }
    }

    // Get or create stock
    let stock = await Stock.findBySymbol(symbol);
    if (!stock) {
      // Fetch stock data from Yahoo Finance
      const stockData = await this.yahooFinanceService.getStockQuote(symbol);
      if (!stockData) {
        throw new Error(`Could not fetch data for symbol: ${symbol}`);
      }

      stock = await Stock.createStock({
        symbol: stockData.symbol,
        name: stockData.longName || stockData.shortName || symbol,
        exchange: stockData.exchange || 'UNKNOWN',
        sector: stockData.sector,
        industry: stockData.industry
      });
    }

    // Get or create group if specified
    let groupId: string | undefined;
    if (row.groupName && options.createGroups) {
      let group = await StockGroup.findOne({
        user_id: userId,
        name: row.groupName
      });

      if (!group) {
        group = await StockGroup.createGroup({
          user_id: userId,
          name: row.groupName,
          color: this.generateRandomColor()
        });
      }

      groupId = group.id;
    }

    // Add stock to user's portfolio
    await UserStock.addUserStock({
      user_id: userId,
      stock_id: stock.id,
      group_id: groupId,
      target_price: row.targetPrice ? Number(row.targetPrice) : undefined,
      cutoff_price: row.cutoffPrice ? Number(row.cutoffPrice) : undefined,
      notes: row.notes
    });

    result.successfulImports++;
  }

  private static async getStockIdBySymbol(symbol: string): Promise<string | null> {
    const stock = await Stock.findBySymbol(symbol);
    return stock?.id || null;
  }

  private static generateCSV(data: any[]): string {
    if (data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape commas and quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  private static generateRandomColor(): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    return colors[Math.floor(Math.random() * colors.length)] as string;
  }
}
