import {ApiService} from './ApiService';
import {API_ENDPOINTS} from '../config/constants';

export interface Stock {
  id: string;
  symbol: string;
  companyName: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  volume?: number;
  avgVolume?: number;
  peRatio?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface UserStock {
  id: string;
  userId: string;
  symbol: string;
  companyName: string;
  shares: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayGain: number;
  dayGainPercent: number;
  targetPrice?: number;
  notes?: string;
  groupId?: string;
  groupName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Portfolio {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayGain: number;
  dayGainPercent: number;
  stocks: UserStock[];
  groups: StockGroup[];
}

export interface StockGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  stockCount: number;
}

export interface AddStockRequest {
  symbol: string;
  shares: number;
  averagePrice: number;
  targetPrice?: number;
  notes?: string;
  groupId?: string;
}

export interface UpdateStockRequest {
  shares?: number;
  averagePrice?: number;
  targetPrice?: number;
  notes?: string;
  groupId?: string;
}

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export interface StockHistory {
  symbol: string;
  period: string;
  data: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

class StockServiceClass {
  async getUserPortfolio(): Promise<Portfolio> {
    try {
      const response = await ApiService.get<Portfolio>(API_ENDPOINTS.STOCKS.USER_STOCKS);
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async getUserStocks(): Promise<UserStock[]> {
    try {
      const response = await ApiService.get<UserStock[]>(API_ENDPOINTS.STOCKS.USER_STOCKS);
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async addUserStock(data: AddStockRequest): Promise<UserStock> {
    try {
      const response = await ApiService.post<UserStock>(API_ENDPOINTS.STOCKS.ADD_STOCK, data);
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async updateUserStock(stockId: string, data: UpdateStockRequest): Promise<UserStock> {
    try {
      const response = await ApiService.put<UserStock>(
        `${API_ENDPOINTS.STOCKS.UPDATE_STOCK}/${stockId}`,
        data,
      );
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async deleteUserStock(stockId: string): Promise<void> {
    try {
      await ApiService.delete(`${API_ENDPOINTS.STOCKS.DELETE_STOCK}/${stockId}`);
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async getStockDetails(symbol: string): Promise<Stock> {
    try {
      const response = await ApiService.get<Stock>(
        `${API_ENDPOINTS.STOCKS.STOCK_DETAILS}/${symbol}`,
      );
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async getStockPrice(symbol: string): Promise<StockPrice> {
    try {
      const response = await ApiService.get<StockPrice>(
        `${API_ENDPOINTS.STOCKS.STOCK_PRICE}/${symbol}`,
      );
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async getStockHistory(symbol: string, period: string = '1D'): Promise<StockHistory> {
    try {
      const response = await ApiService.get<StockHistory>(
        `${API_ENDPOINTS.STOCKS.STOCK_HISTORY}/${symbol}`,
        {
          params: {period},
        },
      );
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async getMultipleStockPrices(symbols: string[]): Promise<StockPrice[]> {
    try {
      const response = await ApiService.post<StockPrice[]>(
        API_ENDPOINTS.STOCKS.STOCK_PRICE,
        {symbols},
      );
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  // Stock Groups
  async getStockGroups(): Promise<StockGroup[]> {
    try {
      const response = await ApiService.get<StockGroup[]>('/stocks/groups');
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async createStockGroup(name: string, description?: string, color?: string): Promise<StockGroup> {
    try {
      const response = await ApiService.post<StockGroup>('/stocks/groups', {
        name,
        description,
        color,
      });
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async updateStockGroup(
    groupId: string,
    data: {name?: string; description?: string; color?: string},
  ): Promise<StockGroup> {
    try {
      const response = await ApiService.put<StockGroup>(`/stocks/groups/${groupId}`, data);
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async deleteStockGroup(groupId: string): Promise<void> {
    try {
      await ApiService.delete(`/stocks/groups/${groupId}`);
    } catch (error) {
      ApiService.handleError(error);
    }
  }
}

export const StockService = new StockServiceClass();
