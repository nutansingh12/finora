/**
 * Utility functions for formatting numbers, currencies, and other data
 */

export const formatCurrency = (
  value: number,
  currency: string = 'USD',
  minimumFractionDigits: number = 2,
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercent = (
  value: number,
  minimumFractionDigits: number = 2,
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

export const formatNumber = (
  value: number,
  minimumFractionDigits: number = 0,
  maximumFractionDigits: number = 2,
): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
};

export const formatLargeNumber = (value: number): string => {
  if (value >= 1e12) {
    return `${(value / 1e12).toFixed(1)}T`;
  }
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  return formatNumber(value);
};

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
};

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
};

export const formatTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
};

export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return formatDate(dateObj);
};

export const formatStockSymbol = (symbol: string): string => {
  return symbol.toUpperCase();
};

export const formatCompanyName = (name: string, maxLength: number = 30): string => {
  if (name.length <= maxLength) {
    return name;
  }
  return `${name.substring(0, maxLength - 3)}...`;
};

export const formatShares = (shares: number): string => {
  if (shares % 1 === 0) {
    return formatNumber(shares, 0, 0);
  }
  return formatNumber(shares, 0, 4);
};

export const formatPriceChange = (change: number, changePercent: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${formatCurrency(change)} (${sign}${formatPercent(changePercent)})`;
};

export const formatMarketCap = (marketCap: number): string => {
  return formatLargeNumber(marketCap);
};

export const formatVolume = (volume: number): string => {
  return formatLargeNumber(volume);
};

export const formatPERatio = (peRatio: number): string => {
  if (peRatio <= 0) {
    return 'N/A';
  }
  return formatNumber(peRatio, 1, 2);
};

export const formatDividendYield = (dividendYield: number): string => {
  if (dividendYield <= 0) {
    return 'N/A';
  }
  return formatPercent(dividendYield);
};
