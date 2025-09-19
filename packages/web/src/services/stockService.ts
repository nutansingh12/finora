import apiService from './api';
import { 
  StockData, 
  HistoricalData, 
  ChartData, 
  SearchResult, 
  MarketSummary,
  ApiResponse 
} from '@/types';

class StockService {
  // Get stock data by symbol
  async getStockData(symbol: string): Promise<StockData> {
    const response = await apiService.get<StockData>(`/market/stock/${symbol.toUpperCase()}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || `Failed to get data for ${symbol}`);
  }

  // Get multiple stocks data
  async getMultipleStocks(symbols: string[]): Promise<StockData[]> {
    const symbolsParam = symbols.map(s => s.toUpperCase()).join(',');
    const response = await apiService.get<StockData[]>(`/market/stocks?symbols=${symbolsParam}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get stocks data');
  }

  // Get historical data
  async getHistoricalData(
    symbol: string, 
    period: string = '1Y',
    interval: string = '1d'
  ): Promise<HistoricalData[]> {
    const response = await apiService.get<HistoricalData[]>(
      `/market/historical/${symbol.toUpperCase()}?period=${period}&interval=${interval}`
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || `Failed to get historical data for ${symbol}`);
  }

  // Get chart data with multiple periods
  async getChartData(symbol: string, periods: string[] = ['1D', '1M', '1Y']): Promise<ChartData[]> {
    const chartDataPromises = periods.map(async (period) => {
      const data = await this.getHistoricalData(symbol, period);
      return {
        symbol: symbol.toUpperCase(),
        data,
        period,
      };
    });

    return Promise.all(chartDataPromises);
  }

  // Search stocks
  async searchStocks(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const response = await apiService.get<SearchResult[]>(
      `/market/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to search stocks');
  }

  // Get market summary
  async getMarketSummary(): Promise<MarketSummary[]> {
    const response = await apiService.get<MarketSummary[]>('/market/summary');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get market summary');
  }

  // Get trending stocks
  async getTrendingStocks(region: string = 'US'): Promise<StockData[]> {
    const response = await apiService.get<StockData[]>(`/market/trending?region=${region}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get trending stocks');
  }

  // Get market movers
  async getMarketMovers(type: 'gainers' | 'losers' | 'active' = 'gainers'): Promise<StockData[]> {
    const response = await apiService.get<StockData[]>(`/market/movers?type=${type}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || `Failed to get market ${type}`);
  }

  // Get sector performance
  async getSectorPerformance(): Promise<MarketSummary[]> {
    const response = await apiService.get<MarketSummary[]>('/market/sectors');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get sector performance');
  }

  // Get exchange rates
  async getExchangeRates(base: string = 'USD'): Promise<Record<string, number>> {
    const response = await apiService.get<Record<string, number>>(`/market/exchange-rates?base=${base}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get exchange rates');
  }

  // Validate stock symbols
  async validateSymbols(symbols: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    const response = await apiService.post<{ valid: string[]; invalid: string[] }>(
      '/market/validate-symbols',
      { symbols: symbols.map(s => s.toUpperCase()) }
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to validate symbols');
  }

  // Get market status
  async getMarketStatus(): Promise<{
    isOpen: boolean;
    nextOpen: string;
    nextClose: string;
    timezone: string;
  }> {
    const response = await apiService.get<{
      isOpen: boolean;
      nextOpen: string;
      nextClose: string;
      timezone: string;
    }>('/market/status');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get market status');
  }

  // Get stock news
  async getStockNews(symbol?: string, limit: number = 20): Promise<{
    title: string;
    summary: string;
    url: string;
    source: string;
    publishedAt: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  }[]> {
    const url = symbol 
      ? `/market/news/${symbol.toUpperCase()}?limit=${limit}`
      : `/market/news?limit=${limit}`;
      
    const response = await apiService.get<{
      title: string;
      summary: string;
      url: string;
      source: string;
      publishedAt: string;
      sentiment?: 'positive' | 'negative' | 'neutral';
    }[]>(url);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get stock news');
  }

  // Get earnings calendar
  async getEarningsCalendar(date?: string): Promise<{
    symbol: string;
    name: string;
    date: string;
    time: 'before-market' | 'after-market';
    estimate?: number;
  }[]> {
    const url = date 
      ? `/market/earnings?date=${date}`
      : '/market/earnings';
      
    const response = await apiService.get<{
      symbol: string;
      name: string;
      date: string;
      time: 'before-market' | 'after-market';
      estimate?: number;
    }[]>(url);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get earnings calendar');
  }
}

// Create and export singleton instance
const stockService = new StockService();
export default stockService;
