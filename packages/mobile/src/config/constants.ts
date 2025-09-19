// API Configuration
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3001/api' 
  : 'https://api.finora.app/api';

// App Configuration
export const APP_NAME = 'Finora';
export const APP_VERSION = '1.0.0';

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_PREFERENCES: 'userPreferences',
  PORTFOLIO_CACHE: 'portfolioCache',
  WATCHLIST_CACHE: 'watchlistCache',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
  },
  STOCKS: {
    USER_STOCKS: '/stocks/user',
    ADD_STOCK: '/stocks',
    UPDATE_STOCK: '/stocks',
    DELETE_STOCK: '/stocks',
    STOCK_DETAILS: '/stocks',
    STOCK_PRICE: '/stocks/price',
    STOCK_HISTORY: '/stocks/history',
  },
  SEARCH: {
    SYMBOLS: '/search/symbols',
    SUGGESTIONS: '/search/suggestions',
  },
  ALERTS: {
    USER_ALERTS: '/alerts',
    CREATE_ALERT: '/alerts',
    UPDATE_ALERT: '/alerts',
    DELETE_ALERT: '/alerts',
  },
} as const;

// Chart Configuration
export const CHART_CONFIG = {
  DEFAULT_PERIOD: '1D',
  PERIODS: ['1D', '5D', '1M', '3M', '6M', '1Y', '5Y'],
  COLORS: {
    POSITIVE: '#4CAF50',
    NEGATIVE: '#F44336',
    NEUTRAL: '#9E9E9E',
  },
} as const;

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  PRICE_ALERT_CHANNEL: 'price_alerts',
  NEWS_CHANNEL: 'news_updates',
  PORTFOLIO_CHANNEL: 'portfolio_updates',
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL: /^\S+@\S+$/i,
  PASSWORD_MIN_LENGTH: 6,
  STOCK_SYMBOL_MAX_LENGTH: 10,
  TARGET_PRICE_MIN: 0.01,
  TARGET_PRICE_MAX: 999999.99,
} as const;

// Refresh Intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  PORTFOLIO: 30000, // 30 seconds
  STOCK_PRICES: 15000, // 15 seconds
  ALERTS: 60000, // 1 minute
  NEWS: 300000, // 5 minutes
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  PORTFOLIO_TTL: 5 * 60 * 1000, // 5 minutes
  STOCK_DETAILS_TTL: 2 * 60 * 1000, // 2 minutes
  SEARCH_RESULTS_TTL: 10 * 60 * 1000, // 10 minutes
} as const;
