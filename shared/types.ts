// Shared TypeScript types for Finora application

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultTargetPriceStrategy: 'manual' | '52w_low' | '24w_low' | '12w_low';
  alertsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  currency: string;
  timezone: string;
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStock {
  id: string;
  userId: string;
  stockId: string;
  groupId?: string;
  targetPrice?: number;
  cutoffPrice?: number;
  notes?: string;
  addedAt: Date;
  updatedAt: Date;
  stock: Stock;
  currentPrice?: StockPrice;
  historicalData?: HistoricalData;
}

export interface StockGroup {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  stocks?: UserStock[];
}

export interface StockPrice {
  id: string;
  stockId: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  timestamp: Date;
  source: 'yahoo' | 'manual';
}

export interface HistoricalData {
  id: string;
  stockId: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

export interface RollingAnalysis {
  stockId: string;
  current: number;
  week52Low: number;
  week24Low: number;
  week12Low: number;
  week52High: number;
  week24High: number;
  week12High: number;
  percentAbove52WLow: number;
  percentAbove24WLow: number;
  percentAbove12WLow: number;
  calculatedAt: Date;
}

export interface Alert {
  id: string;
  userId: string;
  stockId: string;
  type: 'price_below' | 'price_above' | 'target_reached' | 'cutoff_reached';
  targetPrice: number;
  currentPrice: number;
  message: string;
  isRead: boolean;
  isActive: boolean;
  createdAt: Date;
  triggeredAt?: Date;
  stock: Stock;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: 'stock' | 'etf' | 'mutual_fund';
  sector?: string;
  industry?: string;
  marketCap?: number;
  price?: number;
}

export interface ChartData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Portfolio {
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  stockCount: number;
  groupCount: number;
  alertCount: number;
  recentlyAddedCount: number;
  topPerformers: UserStock[];
  worstPerformers: UserStock[];
  bestValueOpportunities: UserStock[];
}

export interface SortOption {
  key: 'symbol' | 'name' | 'price' | 'change' | 'changePercent' | 'targetDiff' | 'cutoffDiff' | 'value52w' | 'value24w' | 'value12w' | 'addedAt';
  label: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  groups?: string[];
  sectors?: string[];
  priceRange?: [number, number];
  changeRange?: [number, number];
  hasTarget?: boolean;
  hasCutoff?: boolean;
  recentlyAdded?: boolean;
  belowTarget?: boolean;
  belowCutoff?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  symbol?: string;
  message: string;
}

export interface ExportData {
  symbol: string;
  name: string;
  group?: string;
  targetPrice?: number;
  cutoffPrice?: number;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  notes?: string;
  addedAt: string;
}

export interface WebSocketMessage {
  type: 'price_update' | 'alert' | 'portfolio_update' | 'error';
  data: any;
  timestamp: Date;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  preferences?: Partial<UserPreferences>;
}

export interface AddStockRequest {
  symbol: string;
  groupId?: string;
  targetPrice?: number;
  cutoffPrice?: number;
  notes?: string;
}

export interface UpdateStockRequest {
  groupId?: string;
  targetPrice?: number;
  cutoffPrice?: number;
  notes?: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}

export interface CreateAlertRequest {
  stockId: string;
  type: Alert['type'];
  targetPrice: number;
}

export interface BulkUpdateRequest {
  stockIds: string[];
  updates: Partial<UpdateStockRequest>;
}
