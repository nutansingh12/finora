// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Stock and Market Data Types
export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  dividendYield?: number;
  earningsPerShare?: number;
  priceToBook?: number;
  returnOnEquity?: number;
  debtToEquity?: number;
  currency: string;
  exchange: string;
  lastUpdated: string;
}

export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

export interface ChartData {
  symbol: string;
  data: HistoricalData[];
  period: string;
}

// Portfolio Types
export interface UserStock {
  id: string;
  userId: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
  groupId?: string;
  targetPrice?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  stock: StockData;
}

export interface StockGroup {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  stocks: UserStock[];
}

export interface Portfolio {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  groups: StockGroup[];
  stocks: UserStock[];
}

// Alert Types
export interface Alert {
  id: string;
  userId: string;
  symbol: string;
  type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'PERCENT_CHANGE' | 'VOLUME';
  condition: number;
  isActive: boolean;
  message?: string;
  createdAt: string;
  updatedAt: string;
  stock: StockData;
}

// Market Summary Types
export interface MarketSummary {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Chart Configuration Types
export interface ChartConfig {
  type: 'line' | 'candlestick' | 'area';
  period: '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'MAX';
  indicators: string[];
  showVolume: boolean;
}

// Theme Types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// Search Types
export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  currency: string;
}

// Export Types
export interface ExportConfig {
  format: 'CSV' | 'PDF' | 'XLSX';
  dateRange: {
    start: string;
    end: string;
  };
  includeMetrics: boolean;
  includeCharts: boolean;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'PRICE_UPDATE' | 'ALERT_TRIGGERED' | 'PORTFOLIO_UPDATE';
  data: any;
  timestamp: string;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AddStockForm {
  symbol: string;
  quantity: number;
  averagePrice: number;
  groupId?: string;
  targetPrice?: number;
  notes?: string;
}

export interface CreateGroupForm {
  name: string;
  description?: string;
  color?: string;
}

export interface CreateAlertForm {
  symbol: string;
  type: Alert['type'];
  condition: number;
  message?: string;
}
