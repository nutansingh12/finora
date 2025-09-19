import { create } from 'zustand';
import { 
  Portfolio, 
  UserStock, 
  StockGroup, 
  AddStockForm, 
  CreateGroupForm 
} from '@/types';
import portfolioService from '@/services/portfolioService';

interface PortfolioStore {
  // State
  portfolio: Portfolio | null;
  stocks: UserStock[];
  groups: StockGroup[];
  isLoading: boolean;
  error: string | null;
  
  // Performance data
  performance: {
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
  } | null;
  
  // Allocation data
  allocation: {
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
  } | null;

  // Actions
  fetchPortfolio: () => Promise<void>;
  fetchStocks: (page?: number, limit?: number) => Promise<void>;
  fetchGroups: () => Promise<void>;
  fetchPerformance: (period?: string) => Promise<void>;
  fetchAllocation: () => Promise<void>;
  
  addStock: (stockData: AddStockForm) => Promise<UserStock>;
  updateStock: (stockId: string, updates: Partial<AddStockForm>) => Promise<UserStock>;
  removeStock: (stockId: string) => Promise<void>;
  
  createGroup: (groupData: CreateGroupForm) => Promise<StockGroup>;
  updateGroup: (groupId: string, updates: Partial<CreateGroupForm>) => Promise<StockGroup>;
  deleteGroup: (groupId: string) => Promise<void>;
  
  moveStockToGroup: (stockId: string, groupId: string | null) => Promise<UserStock>;
  
  // State setters
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearPortfolio: () => void;
  
  // Utility actions
  refreshAll: () => Promise<void>;
  getStockById: (stockId: string) => UserStock | undefined;
  getGroupById: (groupId: string) => StockGroup | undefined;
  getStocksByGroup: (groupId: string | null) => UserStock[];
}

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  // Initial state
  portfolio: null,
  stocks: [],
  groups: [],
  isLoading: false,
  error: null,
  performance: null,
  allocation: null,

  // Actions
  fetchPortfolio: async () => {
    set({ isLoading: true, error: null });
    try {
      const portfolio = await portfolioService.getPortfolio();
      set({ 
        portfolio, 
        stocks: portfolio.stocks,
        groups: portfolio.groups,
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch portfolio', 
        isLoading: false 
      });
      throw error;
    }
  },

  fetchStocks: async (page = 1, limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      const response = await portfolioService.getUserStocks(page, limit);
      set({ 
        stocks: response.data, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch stocks', 
        isLoading: false 
      });
      throw error;
    }
  },

  fetchGroups: async () => {
    set({ isLoading: true, error: null });
    try {
      const groups = await portfolioService.getGroups();
      set({ groups, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch groups', 
        isLoading: false 
      });
      throw error;
    }
  },

  fetchPerformance: async (period = '1Y') => {
    set({ isLoading: true, error: null });
    try {
      const performance = await portfolioService.getPerformance(period);
      set({ performance, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch performance', 
        isLoading: false 
      });
      throw error;
    }
  },

  fetchAllocation: async () => {
    set({ isLoading: true, error: null });
    try {
      const allocation = await portfolioService.getAllocation();
      set({ allocation, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch allocation', 
        isLoading: false 
      });
      throw error;
    }
  },

  addStock: async (stockData: AddStockForm) => {
    set({ isLoading: true, error: null });
    try {
      const newStock = await portfolioService.addStock(stockData);
      
      // Update local state
      set(state => ({
        stocks: [...state.stocks, newStock],
        isLoading: false
      }));
      
      // Refresh portfolio to get updated totals
      get().fetchPortfolio();
      
      return newStock;
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to add stock', 
        isLoading: false 
      });
      throw error;
    }
  },

  updateStock: async (stockId: string, updates: Partial<AddStockForm>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedStock = await portfolioService.updateStock(stockId, updates);
      
      // Update local state
      set(state => ({
        stocks: state.stocks.map(stock => 
          stock.id === stockId ? updatedStock : stock
        ),
        isLoading: false
      }));
      
      // Refresh portfolio to get updated totals
      get().fetchPortfolio();
      
      return updatedStock;
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to update stock', 
        isLoading: false 
      });
      throw error;
    }
  },

  removeStock: async (stockId: string) => {
    set({ isLoading: true, error: null });
    try {
      await portfolioService.removeStock(stockId);
      
      // Update local state
      set(state => ({
        stocks: state.stocks.filter(stock => stock.id !== stockId),
        isLoading: false
      }));
      
      // Refresh portfolio to get updated totals
      get().fetchPortfolio();
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to remove stock', 
        isLoading: false 
      });
      throw error;
    }
  },

  createGroup: async (groupData: CreateGroupForm) => {
    set({ isLoading: true, error: null });
    try {
      const newGroup = await portfolioService.createGroup(groupData);
      
      // Update local state
      set(state => ({
        groups: [...state.groups, newGroup],
        isLoading: false
      }));
      
      return newGroup;
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to create group', 
        isLoading: false 
      });
      throw error;
    }
  },

  updateGroup: async (groupId: string, updates: Partial<CreateGroupForm>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedGroup = await portfolioService.updateGroup(groupId, updates);
      
      // Update local state
      set(state => ({
        groups: state.groups.map(group => 
          group.id === groupId ? updatedGroup : group
        ),
        isLoading: false
      }));
      
      return updatedGroup;
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to update group', 
        isLoading: false 
      });
      throw error;
    }
  },

  deleteGroup: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      await portfolioService.deleteGroup(groupId);
      
      // Update local state
      set(state => ({
        groups: state.groups.filter(group => group.id !== groupId),
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to delete group', 
        isLoading: false 
      });
      throw error;
    }
  },

  moveStockToGroup: async (stockId: string, groupId: string | null) => {
    set({ isLoading: true, error: null });
    try {
      const updatedStock = await portfolioService.moveStockToGroup(stockId, groupId);
      
      // Update local state
      set(state => ({
        stocks: state.stocks.map(stock => 
          stock.id === stockId ? updatedStock : stock
        ),
        isLoading: false
      }));
      
      return updatedStock;
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to move stock', 
        isLoading: false 
      });
      throw error;
    }
  },

  // State setters
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearPortfolio: () => {
    set({
      portfolio: null,
      stocks: [],
      groups: [],
      performance: null,
      allocation: null,
      error: null,
    });
  },

  // Utility actions
  refreshAll: async () => {
    await Promise.all([
      get().fetchPortfolio(),
      get().fetchPerformance(),
      get().fetchAllocation(),
    ]);
  },

  getStockById: (stockId: string) => {
    return get().stocks.find(stock => stock.id === stockId);
  },

  getGroupById: (groupId: string) => {
    return get().groups.find(group => group.id === groupId);
  },

  getStocksByGroup: (groupId: string | null) => {
    return get().stocks.filter(stock => stock.groupId === groupId);
  },
}));
