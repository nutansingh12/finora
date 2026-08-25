import apiService from './api';
import { 
  Portfolio, 
  UserStock, 
  StockGroup, 
  AddStockForm, 
  CreateGroupForm,
  ApiResponse,
  PaginatedResponse 
} from '@/types';

class PortfolioService {
  // Get user's complete portfolio
  async getPortfolio(): Promise<Portfolio> {
    const response = await apiService.get<Portfolio>('/portfolio');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to get portfolio');
  }

  // Get user's stocks with pagination (priced-first)
  async getUserStocks(
    page: number = 1,
    limit: number = 100,
    opts?: { onlyWithPrice?: boolean; prioritizeWithPrice?: boolean }
  ): Promise<PaginatedResponse<UserStock>> {
    const offset = Math.max(0, (page - 1) * limit);
    const prioritize = opts?.prioritizeWithPrice !== false; // default true
    const only = opts?.onlyWithPrice ? '&onlyWithPrice=true' : '';
    const url = `/stocks?limit=${limit}&offset=${offset}&prioritizeWithPrice=${prioritize}${only}`;

    const response = await apiService.get<{ stocks: UserStock[] }>(url);

    if (response.success && response.data) {
      const stocks = (response.data as any).stocks ?? [];
      // Wrap in a PaginatedResponse-like shape for store compatibility
      const data = Array.isArray(stocks) ? stocks : [];
      const pageTotal = data.length;
      const estimatedTotal = offset + pageTotal; // best effort without a count endpoint
      return {
        data,
        total: estimatedTotal,
        page,
        limit,
        totalPages: pageTotal < limit ? page : page + 1,
      };
    }
    
    throw new Error(response.message || 'Failed to get user stocks');
  }

  // Kick a background price refresh for missing/stale quotes
  async refreshPrices(limit: number = 50, staleMinutes: number = 2): Promise<void> {
    try {
      await apiService.post(`/stocks/prices/refresh?limit=${Math.min(limit, 100)}&staleMinutes=${staleMinutes}`);
    } catch {
      // non-fatal; ignore
    }
  }

  // Add stock to watchlist
  async addStock(stockData: AddStockForm): Promise<UserStock> {
    const payload: any = { symbol: stockData.symbol };
    if (stockData.targetPrice) payload.targetPrice = stockData.targetPrice;
    if (stockData.notes) payload.notes = stockData.notes;
    if (stockData.groupId) payload.groupId = stockData.groupId;

    const response = await apiService.post<any>('/stocks', payload);

    if (response.success && response.data) {
      // Backend returns { userStock: {...} } — normalize to UserStock shape
      const raw = response.data.userStock || response.data;
      return {
        id: raw.id,
        userId: raw.user_id,
        symbol: stockData.symbol.toUpperCase(),
        quantity: 0,
        averagePrice: 0,
        currentPrice: 0,
        totalValue: 0,
        gainLoss: 0,
        gainLossPercent: 0,
        targetPrice: raw.target_price ?? stockData.targetPrice,
        notes: raw.notes,
        groupId: raw.group_id,
        createdAt: raw.added_at || raw.created_at,
        updatedAt: raw.updated_at,
        stock: { symbol: stockData.symbol.toUpperCase() } as any,
      } as UserStock;
    }

    throw new Error(response.message || 'Failed to add stock to watchlist');
  }

  // Update stock
  async updateStock(stockId: string, updates: Partial<AddStockForm>): Promise<UserStock> {
    const payload: any = { ...updates };
    if ('quantity' in payload) { payload.shares = payload.quantity; delete payload.quantity; }
    const response = await apiService.put<UserStock>(`/stocks/${stockId}`, payload);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to update stock');
  }

  // Remove stock from watchlist
  async removeStock(stockId: string): Promise<void> {
    const response = await apiService.delete(`/stocks/${stockId}`);

    if (!response.success) {
      throw new Error(response.message || 'Failed to remove stock');
    }
  }

  // Get stock groups
  async getGroups(): Promise<StockGroup[]> {
    const response = await apiService.get<StockGroup[]>('/stocks/groups');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to get stock groups');
  }

  // Create stock group
  async createGroup(groupData: CreateGroupForm): Promise<StockGroup> {
    const response = await apiService.post<StockGroup>('/stocks/groups', groupData);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to create group');
  }

  // Update stock group
  async updateGroup(groupId: string, updates: Partial<CreateGroupForm>): Promise<StockGroup> {
    const response = await apiService.put<StockGroup>(`/stocks/groups/${groupId}`, updates);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to update group');
  }

  // Delete stock group
  async deleteGroup(groupId: string): Promise<void> {
    const response = await apiService.delete(`/stocks/groups/${groupId}`);

    if (!response.success) {
      throw new Error(response.message || 'Failed to delete group');
    }
  }

  // Move stock to group
  async moveStockToGroup(stockId: string, groupId: string | null): Promise<UserStock> {
    const response = await apiService.put<UserStock>(`/stocks/${stockId}`, { groupId });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to move stock to group');
  }

  // Get portfolio performance
  async getPerformance(period: string = '1Y'): Promise<{
    totalReturn: number;
    totalReturnPercent: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    historicalValues: Array<{
      date: string;
      value: number;
      change: number;
      changePercent: number;
    }>;
  }> {
    const response = await apiService.get<{
      totalReturn: number;
      totalReturnPercent: number;
      annualizedReturn: number;
      volatility: number;
      sharpeRatio: number;
      maxDrawdown: number;
      historicalValues: Array<{
        date: string;
        value: number;
        change: number;
        changePercent: number;
      }>;
    }>(`/portfolio/performance?period=${period}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get portfolio performance');
  }

  // Get portfolio allocation
  async getAllocation(): Promise<{
    byStock: Array<{
      symbol: string;
      name: string;
      value: number;
      percentage: number;
    }>;
    byGroup: Array<{
      groupName: string;
      value: number;
      percentage: number;
    }>;
    bySector: Array<{
      sector: string;
      value: number;
      percentage: number;
    }>;
  }> {
    const response = await apiService.get<{
      byStock: Array<{
        symbol: string;
        name: string;
        value: number;
        percentage: number;
      }>;
      byGroup: Array<{
        groupName: string;
        value: number;
        percentage: number;
      }>;
      bySector: Array<{
        sector: string;
        value: number;
        percentage: number;
      }>;
    }>('/portfolio/allocation');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get portfolio allocation');
  }

  // Export portfolio data
  async exportPortfolio(format: 'CSV' | 'PDF' | 'XLSX' = 'CSV'): Promise<void> {
    await apiService.downloadFile(`/portfolio/export?format=${format}`, `portfolio.${format.toLowerCase()}`);
  }

  // Import portfolio data
  async importPortfolio(file: File): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const response = await apiService.uploadFile<{
      imported: number;
      skipped: number;
      errors: string[];
    }>('/portfolio/import', file);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to import portfolio');
  }

  // Get portfolio summary
  async getSummary(): Promise<{
    totalValue: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    dayChange: number;
    dayChangePercent: number;
    stockCount: number;
    groupCount: number;
    topPerformer: {
      symbol: string;
      gainLossPercent: number;
    };
    worstPerformer: {
      symbol: string;
      gainLossPercent: number;
    };
  }> {
    const response = await apiService.get<{
      totalValue: number;
      totalGainLoss: number;
      totalGainLossPercent: number;
      dayChange: number;
      dayChangePercent: number;
      stockCount: number;
      groupCount: number;
      topPerformer: {
        symbol: string;
        gainLossPercent: number;
      };
      worstPerformer: {
        symbol: string;
        gainLossPercent: number;
      };
    }>('/portfolio/summary');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get portfolio summary');
  }

  // Bulk update stocks
  async bulkUpdateStocks(updates: Array<{
    stockId: string;
    updates: Partial<AddStockForm>;
  }>): Promise<UserStock[]> {
    const response = await apiService.patch<UserStock[]>('/portfolio/stocks/bulk', { updates });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to bulk update stocks');
  }

  // Rebalance portfolio suggestions
  async getRebalanceSuggestions(): Promise<Array<{
    symbol: string;
    currentAllocation: number;
    targetAllocation: number;
    suggestedAction: 'buy' | 'sell';
    suggestedQuantity: number;
    reason: string;
  }>> {
    const response = await apiService.get<Array<{
      symbol: string;
      currentAllocation: number;
      targetAllocation: number;
      suggestedAction: 'buy' | 'sell';
      suggestedQuantity: number;
      reason: string;
    }>>('/portfolio/rebalance-suggestions');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get rebalance suggestions');
  }
}

// Create and export singleton instance
const portfolioService = new PortfolioService();
export default portfolioService;
