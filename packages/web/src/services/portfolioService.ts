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

  // Get user's stocks with pagination
  async getUserStocks(page: number = 1, limit: number = 50): Promise<PaginatedResponse<UserStock>> {
    const response = await apiService.get<PaginatedResponse<UserStock>>(
      `/portfolio/stocks?page=${page}&limit=${limit}`
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get user stocks');
  }

  // Add stock to portfolio
  async addStock(stockData: AddStockForm): Promise<UserStock> {
    const response = await apiService.post<UserStock>('/portfolio/stocks', stockData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to add stock to portfolio');
  }

  // Update stock in portfolio
  async updateStock(stockId: string, updates: Partial<AddStockForm>): Promise<UserStock> {
    const response = await apiService.patch<UserStock>(`/portfolio/stocks/${stockId}`, updates);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update stock');
  }

  // Remove stock from portfolio
  async removeStock(stockId: string): Promise<void> {
    const response = await apiService.delete(`/portfolio/stocks/${stockId}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to remove stock');
    }
  }

  // Get stock groups
  async getGroups(): Promise<StockGroup[]> {
    const response = await apiService.get<StockGroup[]>('/portfolio/groups');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get stock groups');
  }

  // Create stock group
  async createGroup(groupData: CreateGroupForm): Promise<StockGroup> {
    const response = await apiService.post<StockGroup>('/portfolio/groups', groupData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to create group');
  }

  // Update stock group
  async updateGroup(groupId: string, updates: Partial<CreateGroupForm>): Promise<StockGroup> {
    const response = await apiService.patch<StockGroup>(`/portfolio/groups/${groupId}`, updates);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update group');
  }

  // Delete stock group
  async deleteGroup(groupId: string): Promise<void> {
    const response = await apiService.delete(`/portfolio/groups/${groupId}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete group');
    }
  }

  // Move stock to group
  async moveStockToGroup(stockId: string, groupId: string | null): Promise<UserStock> {
    const response = await apiService.patch<UserStock>(`/portfolio/stocks/${stockId}/group`, {
      groupId,
    });
    
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
