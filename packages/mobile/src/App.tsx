import React, { useState, useEffect } from 'react';
import { FeedbackModal } from './components/feedback/FeedbackModal';
import {View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, FlatList} from 'react-native';
import { StockChartModal } from './components/StockChartModal';
import { StockService } from './services/StockService';
import { ApiService } from './services/ApiService';
import { PortfolioService } from './services/PortfolioService';


import { API_BASE_URL } from './config/constants';


console.log('🌐 API_BASE_URL configured as:', API_BASE_URL);

// Simple historical data service to prevent crashes
// Robust AsyncStorage import with fallback polyfill to avoid native crash if autolink fails
let AsyncStorage: any;
// Note: do not require '@react-native-async-storage/async-storage' in this build to avoid native crashes
console.warn('[@RNC/AsyncStorage] not linked; using in-memory polyfill');
const __mem = new Map<string, string>();
AsyncStorage = {
  async getItem(key: string) { return __mem.has(key) ? (__mem.get(key) as string) : null; },
  async setItem(key: string, value: string) { __mem.set(key, value); },
  async removeItem(key: string) { __mem.delete(key); },
  async clear() { __mem.clear(); },
} as const;

const historicalDataService = {
  async fetchHistoricalData(symbol: string, period: string) {
    try {
      const token = ApiService.getAuthToken?.() || '';
      const mapped = period === '1y' ? 'daily' : period;
      const resp = await fetch(`${API_BASE_URL}/market/stock/${encodeURIComponent(symbol)}/historical?period=${mapped}&interval=1d`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = await resp.json();
      const prices = Array.isArray(json?.data?.prices) ? json.data.prices : [];
      return { data: prices };
    } catch (e) {
      console.warn('historicalDataService.fetchHistoricalData failed', e);
      return { data: [] };
    }
  },
  calculatePriceMetrics(data: any[], currentPrice: number) {
    const series: number[] = (Array.isArray(data) ? data : [])
      .map((d: any) => Number(d.close ?? d.price))
      .filter((n: number) => Number.isFinite(n) && n > 0);

    if (series.length === 0) {
      return {
        week52Low: currentPrice * 0.8,
        week24Low: currentPrice * 0.85,
        week12Low: currentPrice * 0.9,
        week52High: currentPrice * 1.2,
        week24High: currentPrice * 1.15,
        week12High: currentPrice * 1.1,
        week52LowDistance: 20,
        week24LowDistance: 15,
        week12LowDistance: 10,
      };
    }

    const take = (n: number) => series.slice(-n);
    const lastClose = Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : series[series.length - 1];
    const minMax = (arr: number[]) => [Math.min(...arr), Math.max(...arr)];
    const [l52, h52] = minMax(take(252));
    const [l24, h24] = minMax(take(120));
    const [l12, h12] = minMax(take(60));
    const dist = (low: number) => ((lastClose - low) / low) * 100;

    return {
      week52Low: l52,
      week24Low: l24,
      week12Low: l12,
      week52High: h52,
      week24High: h24,
      week12High: h12,
      week52LowDistance: dist(l52),
      week24LowDistance: dist(l24),
      week12LowDistance: dist(l12),
    };
  },
};

// No local stock database - using internet search APIs

// Sorting options with fancy names (moved outside component for stability)
const SORTING_OPTIONS = [
  { key: '🎯 Opportunity Hunter', name: '🎯 Opportunity Hunter', description: '52W Low Distance %' },
  { key: '💰 Value Seeker', name: '💰 Value Seeker', description: 'Cutoff Distance %' },
  { key: '💎 Blue Chip Elite', name: '💎 Blue Chip Elite', description: 'Market Cap Stability' },
  { key: '📝 Alphabetical', name: '📝 Alphabetical', description: 'Symbol A-Z' },
  { key: '⏰ Fresh Additions', name: '⏰ Fresh Additions', description: 'Recently Added' },
  { key: '📈 Price Action', name: '📈 Price Action', description: 'Current Price' },
  { key: '🔥 Hot Movers', name: '🔥 Hot Movers', description: 'Daily Change %' }
];

// Safe storage wrapper with fallback
const SafeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('Storage getItem failed, using fallback:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
      console.log('✅ Storage saved:', key, `${value.length} chars`);
    } catch (error) {
      console.warn('Storage setItem failed, using fallback:', error);
    }
  }
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [userType, setUserType] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any | null>(null);
  const [cutoffPrice, setCutoffPrice] = useState('');
  const [shares, setShares] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('All Stocks');
  const [sortBy, setSortBy] = useState('🎯 Opportunity Hunter');
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [customGroups, setCustomGroups] = useState<Array<{id: string, name: string, description: string, color: string}>>([]);
  const [showChartModal, setShowChartModal] = useState(false);
  const [selectedChartStock, setSelectedChartStock] = useState<any | null>(null);
  const [editingStock, setEditingStock] = useState<any | null>(null);
  const [editTargetPrice, setEditTargetPrice] = useState('');
  const [editGroup, setEditGroup] = useState('Watchlist');
  const [showEditModal, setShowEditModal] = useState(false);

  // Initialize app and check for stored authentication
  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check for stored auth token
        const storedToken = await SafeStorage.getItem('finora_auth_token');
        if (storedToken) {
          ApiService.setAuthToken(storedToken);
          setIsAuthenticated(true);
          await loadUserGroups();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();

    const updatedWatchlist = watchlist.map(stock => ({
      ...stock,
      alerts: updateStockAlerts(stock)
    }));
    setWatchlist(updatedWatchlist);
  }, []); // Only run once on mount

  // Load groups when user becomes authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      loadUserGroups();
      // Now that we have auth, load server stocks
      loadUserStocksFromBackend();
    }
  }, [isAuthenticated]);

  // Function to handle stock symbol click
  const handleStockSymbolClick = (stock: any) => {
    setSelectedChartStock(stock);
    setShowChartModal(true);
  };

  // Function to handle edit stock
  const handleEditStock = (stock: any) => {
    setEditingStock(stock);
    setEditTargetPrice(stock.target.toString());
    setEditGroup(stock.group);
    setShowEditModal(true);
  };

  // Function to save stock edits
  const handleSaveEdit = () => {
    if (!editingStock) return;

    const updatedWatchlist = watchlist.map(stock => {
      if (stock.symbol === editingStock.symbol) {
        const oldAlerts = stock.alerts || [];
        const updatedStock = {
          ...stock,
          target: parseFloat(editTargetPrice) || stock.target,
          group: editGroup,
        };
        // Recalculate alerts with new target price
        updatedStock.alerts = updateStockAlerts(updatedStock);

        // Check if editing target price created a new alert
        const hasNewAlert =
          updatedStock.alerts.includes('Alert') &&
          !oldAlerts.includes('Alert') &&
          updatedStock.price <= updatedStock.target &&
          updatedStock.target > 0;

        // Send notification for new alert
        if (hasNewAlert) {
          setTimeout(() => sendInvestmentNotification(updatedStock), 500);
        }

        return updatedStock;
      }
      return stock;
    });

    setWatchlist(updatedWatchlist);
    setShowEditModal(false);
    setEditingStock(null);
    setEditTargetPrice('');
    setEditGroup('Watchlist');
  };

  // Function to cancel edit
  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingStock(null);
    setEditTargetPrice('');
    setEditGroup('Watchlist');
  };

  // Function to update alerts based on cutoff price vs current price
  const updateStockAlerts = (stock: any) => {
    const alerts: string[] = [];


    const price = Number(stock.price);
    const cutoff = Number(stock.cutoffPrice ?? stock.target);
    if (Number.isFinite(price) && Number.isFinite(cutoff) && cutoff > 0 && price <= cutoff) {
      alerts.push('Alert');
    }
    return alerts;
  };

  // Function to send investment opportunity notification
  const sendInvestmentNotification = (stock: any) => {
    const catchyMessages = [
      `🚀 ${stock.symbol} is on sale! Current $${stock.price.toFixed(2)} vs Target $${stock.target.toFixed(2)} - Time to buy the dip!`,
      `💎 ${stock.symbol} opportunity alert! Price dropped to $${stock.price.toFixed(2)} - Your target was $${stock.target.toFixed(2)}!`,
      `🎯 ${stock.symbol} investment window open! $${stock.price.toFixed(2)} is below your $${stock.target.toFixed(2)} target!`,
      `⚡ ${stock.symbol} flash sale! Down to $${stock.price.toFixed(2)} from your $${stock.target.toFixed(2)} target - Don't miss out!`,
      `🔥 ${stock.symbol} buying opportunity! Current $${stock.price.toFixed(2)} vs Target $${stock.target.toFixed(2)} - Strike while it's hot!`
    ];

    const randomMessage = catchyMessages[Math.floor(Math.random() * catchyMessages.length)];

    Alert.alert(
      '🎯 Investment Opportunity!',
      randomMessage,
      [
        { text: 'View Chart', onPress: () => handleStockSymbolClick(stock) },
        { text: 'Later', style: 'cancel' }
      ]
    );
  };

  // Function to refresh stock prices by reloading from backend
  const refreshStockData = async () => {
    try {
      await loadUserStocksFromBackend();
    } catch (e) {
      console.error('Failed to refresh stock data from backend:', e);
    }
  };

  // Function to close chart modal
  const handleCloseChart = () => {
    setShowChartModal(false);
    setSelectedChartStock(null);
  };

  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);


  // Function to update stock with real historical data
  const updateStockWithHistoricalData = async (stock: any) => {
    try {
      const historicalData = await historicalDataService.fetchHistoricalData(stock.symbol, '1y');
      const priceMetrics = historicalDataService.calculatePriceMetrics(historicalData.data, stock.price);

      return {
        ...stock,
        week52Low: priceMetrics.week52Low,
        week24Low: priceMetrics.week24Low,
        week12Low: priceMetrics.week12Low,
        week52High: priceMetrics.week52High,
        week24High: priceMetrics.week24High,
        week12High: priceMetrics.week12High,
        week52LowDistance: priceMetrics.week52LowDistance,
        week24LowDistance: priceMetrics.week24LowDistance,
        week12LowDistance: priceMetrics.week12LowDistance,
      };
    } catch (error) {
      console.error(`Error updating historical data for ${stock.symbol}:`, error);
      return stock; // Return original stock if update fails
    }
  };


  const [watchlist, setWatchlist] = useState<Array<any & {
    cutoffPrice: number;
    shares?: number;
    group: string;
    target: number;
    alerts: string[];
    week52Low: number;
    week52High: number;
    week24Low: number;
    week12Low: number;
    volume: string;
    marketCap: string;
    lastUpdated: string;
  }>>([]);

  // Database persistence
  useEffect(() => {
    console.log('Finora app started successfully!');
    loadWatchlistFromStorage();
    loadCustomGroupsFromStorage();
    // Set token if present, but defer server fetch until authenticated
    (async () => {
      try {
        const token = await SafeStorage.getItem('finora_auth_token');
        if (token) {
          ApiService.setAuthToken(token);
          setIsAuthenticated(true);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    saveWatchlistToStorage();
  }, [watchlist]);

  useEffect(() => {
    saveCustomGroupsToStorage();
  }, [customGroups]);


  // Ensure loaded/sourced stocks have all required fields to render safely
  const sanitizeStock = (s: any) => ({
    ...s,
    alerts: Array.isArray(s?.alerts) ? s.alerts : [],
    price: Number.isFinite(s?.price) ? s.price : 0,
    change: Number.isFinite(s?.change) ? s.change : 0,
    changePercent: Number.isFinite(s?.changePercent) ? s.changePercent : 0,
    target: Number.isFinite(s?.target) ? s.target : (Number.isFinite(s?.cutoffPrice) ? s.cutoffPrice : 0),
    week52Low: Number.isFinite(s?.week52Low) ? s.week52Low : (Number.isFinite(s?.low52Week) ? s.low52Week : 0),
    week24Low: Number.isFinite(s?.week24Low) ? s.week24Low : (Number.isFinite(s?.low24Week) ? s.low24Week : 0),
    week12Low: Number.isFinite(s?.week12Low) ? s.week12Low : (Number.isFinite(s?.low12Week) ? s.low12Week : 0),
  });

  const loadWatchlistFromStorage = async () => {
    try {
      const savedWatchlist = await SafeStorage.getItem('finora_watchlist');
      if (savedWatchlist) {
        const parsedWatchlist = JSON.parse(savedWatchlist);
        setWatchlist(Array.isArray(parsedWatchlist) ? parsedWatchlist.map(sanitizeStock) : []);
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
  };

  const saveWatchlistToStorage = async () => {
    try {
      await SafeStorage.setItem('finora_watchlist', JSON.stringify(watchlist));
      // In production, also sync to cloud database here
      await syncToCloudDatabase(watchlist);
    } catch (error) {
      console.error('Error saving watchlist:', error);
    }
  };


  // Live quotes polling (batch)
  const fetchLiveQuotes = async () => {
    const symbols = Array.from(new Set(watchlist.map(s => String(s.symbol).toUpperCase())));
    if (symbols.length === 0) return;
    try {
      const resp = await ApiService.post('/search/quotes', { symbols: symbols.slice(0, 50) });
      const quotes = ((resp as any)?.data?.data?.quotes ?? []) as any[];
      setWatchlist(prev => prev.map(s => {
        const q = quotes.find(q => q.symbol === String(s.symbol).toUpperCase());
        return q ? {
          ...s,
          price: Number.isFinite(q.price) ? q.price : s.price,
          change: Number.isFinite(q.change) ? q.change : s.change,
          changePercent: Number.isFinite(q.changePercent) ? q.changePercent : s.changePercent,
          lastUpdated: q.lastUpdated || new Date().toISOString(),
        } : s;
      }));
      setLastRefreshAt(new Date().toISOString());
    } catch (e) {
      console.warn('Live quotes refresh failed', e);
    }
  };

  const manualRefresh = () => { fetchLiveQuotes(); };

  useEffect(() => {
    if (watchlist.length === 0) return;
    fetchLiveQuotes();
    const id = setInterval(fetchLiveQuotes, 15000);
    return () => clearInterval(id);
  }, [watchlist.length]);

  // Compute 52-week metrics from historical data (staggered)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const symbols = Array.from(new Set(watchlist.map(s => String(s.symbol).toUpperCase()))).slice(0, 20);
      for (const sym of symbols) {
        if (cancelled) break;
        try {
          const hist = await historicalDataService.fetchHistoricalData(sym, '1y');
          const arr = (hist?.data ?? []) as any[];
          const last = arr.length ? Number(arr[arr.length - 1].close ?? arr[arr.length - 1].price) : 0;
          const metrics = historicalDataService.calculatePriceMetrics(arr, last);
          setWatchlist(prev => prev.map(s => s.symbol.toUpperCase() === sym ? {
            ...s,
            week52Low: metrics.week52Low,
            week24Low: metrics.week24Low,
            week12Low: metrics.week12Low,
            week52High: metrics.week52High,
            week24High: metrics.week24High,
            week12High: metrics.week12High,
          } : s));
        } catch {}
        await new Promise<void>((resolve) => setTimeout(resolve, 1200));
      }
    };
    if (watchlist.length) run();
    return () => { cancelled = true; };
  }, [watchlist.length]);



  const syncToCloudDatabase = async (data: any[], attempt: number = 0): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ApiService.getAuthToken() ?? ''}`
        },
        body: JSON.stringify({ watchlist: data })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return true;
    } catch (error) {
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        return syncToCloudDatabase(data, attempt + 1);
      }
      console.warn('Cloud sync failed after retries; data saved locally');
      return false;
    }
  };

  const loadCustomGroupsFromStorage = async () => {
    try {
      const savedGroups = await SafeStorage.getItem('finora_custom_groups');
      if (savedGroups) {
        const parsedGroups = JSON.parse(savedGroups);
        setCustomGroups(parsedGroups);
      }
    } catch (error) {
      console.error('Error loading custom groups:', error);
    }
  };

  const saveCustomGroupsToStorage = async () => {
    try {
      await SafeStorage.setItem('finora_custom_groups', JSON.stringify(customGroups));
    } catch (error) {
      console.error('Error saving custom groups:', error);
    }
  };

  // CSV Import/Export Functions
  const exportToCSV = async () => {
    try {
      const csvHeader = 'symbol,cutoffPrice,groupName,currentPrice,low52Week,low24Week,low12Week,notes,lastUpdated\n';
      const csvData = watchlist.map(stock =>
        `${stock.symbol},${stock.cutoffPrice},${stock.group},${stock.price},${stock.low52Week || stock.week52Low},${stock.low24Week || stock.week24Low},${stock.low12Week || stock.week12Low},"${stock.notes || ''}",${stock.lastUpdated}`
      ).join('\n');

      const csvContent = csvHeader + csvData;

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `finora_watchlist_${timestamp}.csv`;

      // Store CSV data in AsyncStorage with metadata
      const exportData = {
        fileName,
        content: csvContent,
        timestamp: new Date().toISOString(),
        stockCount: watchlist.length
      };

      await SafeStorage.setItem('finora_latest_export', JSON.stringify(exportData));
      await SafeStorage.setItem(`finora_export_${timestamp}`, csvContent);

      Alert.alert(
        '📤 Export Complete',
        `✅ CSV file generated successfully!\n\n📁 File: ${fileName}\n📊 Stocks: ${watchlist.length}\n⏰ ${new Date().toLocaleString()}\n\n💾 Data saved to device storage`,
        [
          {
            text: '📋 View CSV Data',
            onPress: () => {
              Alert.alert(
                'CSV Content Preview',
                csvContent.length > 1000
                  ? csvContent.substring(0, 1000) + '\n\n... (truncated for display)'
                  : csvContent,
                [{ text: 'OK' }]
              );
            }
          },
          { text: 'Done' }
        ]
      );
    } catch (error) {
      Alert.alert('❌ Export Error', 'Failed to export CSV data. Please try again.');
    }
  };


  // Backend-driven CSV actions (file picker + real download path)
  const handleExportCSVBackend = async () => {
    try {
      console.log('[Finora] Export pressed. PortfolioService type:', typeof PortfolioService);
      // @ts-ignore runtime check
      console.log('[Finora] Methods:', PortfolioService && Object.keys(PortfolioService) || 'undefined');
      const { savedPath } = await PortfolioService.exportCSV();
      Alert.alert('Export Complete', `Saved to:\n${savedPath}`);
    } catch (e: any) {
      console.warn('[Finora] Export failed:', e);
      Alert.alert('Export Failed', e?.message || 'Failed to export');
    }
  };

  const handleImportCSVBackend = async () => {
    try {
      console.log('[Finora] Import pressed. PortfolioService type:', typeof PortfolioService);
      // @ts-ignore runtime check
      console.log('[Finora] Methods:', PortfolioService && Object.keys(PortfolioService) || 'undefined');
      const result = await PortfolioService.pickAndImportCSV();
      await loadUserStocksFromBackend();
      Alert.alert('Import Complete', `Imported ${result.successfulImports}/${result.totalRows}`);
    } catch (e: any) {
      if (e?.code === 'DOCUMENT_PICKER_CANCELED') return;
      console.warn('[Finora] Import failed:', e);
      Alert.alert('Import Failed', e?.message || 'Failed to import');
    }
  };



  const importFromCSV = () => {
    Alert.alert(
      '📥 Import CSV Data',
      'Choose how you want to import stock data:',
      [
        { text: '📁 Load Previous Export', onPress: () => loadPreviousExport() },
        { text: '📝 Paste CSV Data', onPress: () => pasteCSVData() },
        { text: '🎯 Demo Import', onPress: () => importDemoData() },
        { text: 'Cancel' }
      ]
    );
  };

  const loadPreviousExport = async () => {
    try {
      const exportDataStr = await SafeStorage.getItem('finora_latest_export');
      if (!exportDataStr) {
        Alert.alert('No Export Found', 'No previous export found. Try exporting data first or use demo import.');
        return;
      }

      const exportData = JSON.parse(exportDataStr);
      Alert.alert(
        '📁 Previous Export Found',
        `Found export from ${new Date(exportData.timestamp).toLocaleString()}\n\n📁 File: ${exportData.fileName}\n📊 Stocks: ${exportData.stockCount}\n\nWould you like to import this data?`,
        [
          { text: 'Import', onPress: () => parseAndImportCSV(exportData.content, exportData.fileName) },
          { text: 'Cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to load previous export');
    }
  };

  const pasteCSVData = () => {
    Alert.alert(
      '📝 Paste CSV Data',
      'In a production app, this would open a text input where you can paste CSV data.\n\nSupported format:\nsymbol,cutoffPrice,groupName,currentPrice,low52Week,low24Week,low12Week,notes,lastUpdated\n\nFor now, try the demo import to see how it works.',
      [
        { text: 'Try Demo Instead', onPress: () => importDemoData() },
        { text: 'Cancel' }
      ]
    );
  };

  const parseAndImportCSV = (csvContent: string, fileName: string) => {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        Alert.alert('❌ Import Error', 'CSV file appears to be empty or has no data rows.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());

      // Validate required columns
      if (!headers.includes('symbol')) {
        Alert.alert('❌ Invalid CSV Format', 'Required column missing: "symbol"\n\nPlease ensure your CSV has at least a "symbol" column.');
        return;
      }

      const newStocks: any[] = [];
      const duplicates: string[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const line = lines[i].trim();
          if (!line) continue; // Skip empty lines

          const values = line.split(',');
          const stockData: any = {};

          headers.forEach((header, index) => {
            stockData[header] = values[index]?.replace(/"/g, '').trim() || '';
          });

          // Validate required symbol field
          if (!stockData.symbol) {
            errors.push(`Line ${i + 1}: Missing symbol`);
            continue;
          }

          // Check for duplicates
          const existingStock = watchlist.find(s => s.symbol.toUpperCase() === stockData.symbol.toUpperCase());
          if (existingStock) {
            duplicates.push(stockData.symbol);
            continue;
          }

          // Create stock object with proper defaults
          const newStock = {
            symbol: stockData.symbol.toUpperCase(),
            name: stockData.companyName || stockData.symbol + ' Corporation',
            price: parseFloat(stockData.currentPrice || stockData.price) || 0,
            change: parseFloat(stockData.change) || 0,
            changePercent: parseFloat(stockData.changePercent) || 0,
            exchange: stockData.exchange || 'NASDAQ',
            sector: stockData.sector || 'Technology',
            currency: stockData.currency || 'USD',
            marketCap: stockData.marketCap || '$0B',
            cutoffPrice: parseFloat(stockData.cutoffPrice || stockData.target) || 0,
            target: parseFloat(stockData.cutoffPrice || stockData.target) || 0,
            group: stockData.groupName || stockData.group || 'Watchlist',
            alerts: [],
            week52Low: parseFloat(stockData.low52Week || stockData.week52Low) || 0,
            week52High: parseFloat(stockData.high52Week || stockData.week52High) || 0,
            week24Low: parseFloat(stockData.low24Week || stockData.week24Low) || 0,
            week12Low: parseFloat(stockData.low12Week || stockData.week12Low) || 0,
            volume: stockData.volume || '0',
            lastUpdated: stockData.lastUpdated || new Date().toISOString(),
            notes: stockData.notes || '',
            // Legacy field mappings for compatibility
            low52Week: parseFloat(stockData.low52Week || stockData.week52Low) || 0,
            low24Week: parseFloat(stockData.low24Week || stockData.week24Low) || 0,
            low12Week: parseFloat(stockData.low12Week || stockData.week12Low) || 0
          };

          newStocks.push(newStock);
        } catch (error) {
          errors.push(`Line ${i + 1}: ${error}`);
        }
      }

      // Show comprehensive import results
      let message = `📊 Import Results from ${fileName}:\n\n`;
      message += `✅ Successfully imported: ${newStocks.length} stocks\n`;
      if (duplicates.length > 0) {
        message += `⚠️ Skipped duplicates: ${duplicates.length} (${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? '...' : ''})\n`;
      }
      if (errors.length > 0) {
        message += `❌ Errors: ${errors.length}\n`;
      }
      message += `\n📈 Total stocks in watchlist: ${watchlist.length + newStocks.length}`;

      if (newStocks.length > 0) {
        setWatchlist(prev => [...prev, ...newStocks]);
        Alert.alert('🎉 Import Complete', message);
      } else {
        Alert.alert('❌ Import Failed', message + '\n\nNo new stocks were imported.');
      }
    } catch (error) {
      Alert.alert('❌ Parse Error', 'Failed to parse CSV file. Please check the format and try again.');
    }
  };

  const importDemoData = () => {
    const demoStocks = [
      {
        symbol: 'MEDP',
        name: 'Medpace Holdings Inc',
        price: 498.12,
        change: 12.45,
        changePercent: 2.56,
        exchange: 'NASDAQ',
        sector: 'Healthcare',
        currency: 'USD',
        marketCap: '$14.2B',
        cutoffPrice: 300,
        target: 300,
        group: 'Watchlist',
        alerts: [],
        week52Low: 250.05,
        week52High: 498.12,
        week24Low: 250.05,
        week12Low: 306.7,
        volume: '1.2M',
        lastUpdated: '2025-09-19 11:13:44',
        notes: '',
        low52Week: 250.05,
        low24Week: 250.05,
        low12Week: 306.7
      },
      {
        symbol: 'TRIN',
        name: 'Trinity Capital Inc',
        price: 16.415,
        change: 0.32,
        changePercent: 1.99,
        exchange: 'NASDAQ',
        sector: 'Financial Services',
        currency: 'USD',
        marketCap: '$1.8B',
        cutoffPrice: 12.5,
        target: 12.5,
        group: 'Watchlist',
        alerts: [],
        week52Low: 12.5,
        week52High: 16.415,
        week24Low: 12.5,
        week12Low: 13.76,
        volume: '890K',
        lastUpdated: '2025-09-19 11:13:44',
        notes: '',
        low52Week: 12.5,
        low24Week: 12.5,
        low12Week: 13.76
      },
      {
        symbol: 'RDTE',
        name: 'Rudolph Technologies Inc',
        price: 33.929,
        change: 1.23,
        changePercent: 3.77,
        exchange: 'NASDAQ',
        sector: 'Technology',
        currency: 'USD',
        marketCap: '$2.1B',
        cutoffPrice: 29.39,
        target: 29.39,
        group: 'Watchlist',
        alerts: [],
        week52Low: 29.39,
        week52High: 33.929,
        week24Low: 29.39,
        week12Low: 32.34,
        volume: '750K',
        lastUpdated: '2025-09-19 11:13:44',
        notes: '',
        low52Week: 29.39,
        low24Week: 29.39,
        low12Week: 32.34
      }
    ];

    // Check for duplicates
    const newStocks: any[] = [];
    const duplicates: string[] = [];

    demoStocks.forEach(demoStock => {
      const existingStock = watchlist.find(stock => stock.symbol === demoStock.symbol);
      if (existingStock) {
        duplicates.push(demoStock.symbol);
      } else {
        newStocks.push(demoStock);
      }
    });

    if (newStocks.length > 0) {
      setWatchlist(prev => [...prev, ...newStocks]);
    }

    let message = `Demo Import Results:\n\n`;
    message += `✅ Successfully imported: ${newStocks.length} stocks\n`;
    if (duplicates.length > 0) {
      message += `⚠️ Skipped duplicates: ${duplicates.length} (${duplicates.join(', ')})\n`;
    }
    message += `\nTotal stocks in watchlist: ${watchlist.length + newStocks.length}`;

    Alert.alert('Import Complete', message);
  };

  // Load user's groups from backend
  const loadUserGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio/groups`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ApiService.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCustomGroups(data.data?.groups || []);
      } else {
        console.error('Failed to load groups:', data.message);
        // Fallback to local storage
        await loadCustomGroupsFromStorage();
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      // Fallback to local storage
      await loadCustomGroupsFromStorage();
    }
  };


  // Load user's stocks from backend and map to local structure
  const loadUserStocksFromBackend = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/stocks`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ApiService.getAuthToken() ?? ''}`
        }
      });
      const json = await resp.json();
      if (resp.ok && json.success) {
        const stocks = (json.data?.stocks || []).map((s: any) => sanitizeStock({
          symbol: s.symbol,
          name: s.name || s.symbol,
          exchange: s.exchange || 'Unknown',
          sector: s.sector || 'Unknown',
          price: Number(s.current_price ?? 0),
          change: Number(s.price_change ?? 0),
          changePercent: Number(s.price_change_percent ?? 0),
          cutoffPrice: Number(s.cutoff_price ?? 0),
          target: Number(s.target_price ?? s.cutoff_price ?? 0),
          group: s.group_name || 'Watchlist',
          alerts: Array.isArray(s.alerts) ? s.alerts : [],
          lastUpdated: new Date().toISOString(),
        }));
        if (stocks.length > 0) {
          setWatchlist(stocks);
        } else {
          console.log('Backend returned 0 stocks; retaining current list');
        }
      } else {
        console.error('Failed to load user stocks:', json.message);
      }
    } catch (e) {
      console.error('Error loading user stocks:', e);
    }
  };

  // Group Management Functions
  const addNewGroup = async () => {
    if (newGroupName.trim()) {
      try {
        setIsLoading(true);
        const authToken = ApiService.getAuthToken();

        if (authToken) {
          // Try backend first
          const response = await fetch(`${API_BASE_URL}/portfolio/groups`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              name: newGroupName.trim(),
              description: '',
              color: '#00FF88'
            })
          });

          const data = await response.json();

          if (response.ok && data.success) {
            // Add to local groups list
            setCustomGroups(prev => [...prev, data.data]);

            // Reset form
            setShowAddGroup(false);
            setNewGroupName('');

            Alert.alert('Success', `Group "${data.data.name}" created successfully! You can now add stocks to this group.`);
            return;
          } else {
            // Handle specific error cases
            if (response.status === 401) {
              Alert.alert('Session Expired', 'Please log in again to continue.');
              handleLogout();
              return;
            }
            throw new Error(data.message || 'Failed to create group');
          }
        }

        // Fallback to local storage if no auth token or backend failed
        const newGroup = {
          id: Date.now().toString(),
          name: newGroupName.trim(),
          description: '',
          color: '#00FF88',
          sortOrder: customGroups.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Add to local groups list
        const updatedGroups = [...customGroups, newGroup];
        setCustomGroups(updatedGroups);

        // Save to local storage
        await SafeStorage.setItem('finora_custom_groups', JSON.stringify(updatedGroups));

        // Reset form
        setShowAddGroup(false);
        setNewGroupName('');

        Alert.alert('Success', `Group "${newGroup.name}" created successfully! (Stored locally)`);

      } catch (error) {
        console.error('Error creating group:', error);
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create group. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRegister = async () => {
    try {
      // Validate required fields
      if (!email.trim() || !password || !firstName.trim() || !lastName.trim() ||
          !organization.trim() || !userType.trim()) {
        Alert.alert('Error', 'Please fill in all required fields.');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Error', 'Please enter a valid email address.');
        return;
      }

      // Validate password strength
      if (password.length < 8) {
        Alert.alert('Error', 'Password must be at least 8 characters long.');
        return;
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      if (!passwordRegex.test(password)) {
        Alert.alert('Error', 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match.');
        return;
      }

      // Validate user type selection
      if (!userType) {
        Alert.alert('Error', 'Please select your user type.');
        return;
      }

      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          organization: organization.trim(),
          userType: userType.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        let successMessage = 'Account created successfully!';

        // Check if API key was provided
        if (data.apiKey) {
          successMessage += '\n\n🔑 Alpha Vantage API key obtained! You now have access to real-time stock data.';
          // Store the API key for future use
          setApiKey(data.apiKey);
        }

        // Auto-login after successful registration
        const tokens = (data?.data?.tokens || data?.tokens || {});
        const user = (data?.data?.user || data?.user);
        await ApiService.setTokens(tokens.accessToken, tokens.refreshToken);
        if (tokens.accessToken) await SafeStorage.setItem('finora_auth_token', tokens.accessToken);
        if (tokens.refreshToken) await SafeStorage.setItem('finora_refresh_token', tokens.refreshToken);
        if (data?.data?.apiKey) await SafeStorage.setItem('finora_api_key', data.data.apiKey);
        if (user) await SafeStorage.setItem('finora_user', JSON.stringify(user));

        setIsAuthenticated(true);

        // Load user's groups from backend
        await loadUserGroups();

        Alert.alert('Welcome to Finora!', `${successMessage}\n\nHello ${data.user.firstName}! You're now logged in.`, [
          {
            text: 'OK',
            onPress: () => {
              setShowRegister(false);
              // Clear registration form
              setFirstName('');
              setLastName('');
              setConfirmPassword('');
              setOrganization('');
              setUserType('');
            }
          }
        ]);
      } else {
        Alert.alert('Registration Failed', data.message || 'Failed to create account. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Connection Error', `Unable to connect to server.\n\nError: ${errorMessage}\n\nPlease check your internet connection and try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      if (!email.trim()) {
        Alert.alert('Forgot Password', 'Please enter your email above first.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Forgot Password', 'Please enter a valid email address.');
        return;
      }
      const resp = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await resp.json().catch(() => ({} as any));
      if (resp.ok) {
        Alert.alert('Email Sent', 'Please check your email for password reset instructions.');
      } else {
        Alert.alert('Request Failed', (data as any)?.message || `HTTP ${resp.status}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send reset email');
    }
  };

  const handleLogin = async () => {
    try {
      // Validate input
      if (!email.trim() || !password) {
        Alert.alert('Error', 'Please enter both email and password.');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Error', 'Please enter a valid email address.');
        return;
      }

      setIsLoading(true);

      const loginUrl = `${API_BASE_URL}/auth/login`;
      const loginPayload = {
        email: email.trim(),
        password: password
      };

      console.log('🔐 Attempting login to:', loginUrl);
      console.log('📧 Email:', loginPayload.email);
      console.log('🔑 Password length:', loginPayload.password.length);

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginPayload)
      });

      console.log('📡 Login response status:', response.status);

      let data: any = null;
      let text: string | null = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
        console.log('📦 Login response data:', JSON.stringify(data));
      } else {
        text = await response.text();
        console.log('📦 Login response text:', text?.slice(0, 200));
      }

      if (response.ok && data?.success) {
        const tokens = (data?.data?.tokens || data?.tokens || {});
        const user = (data?.data?.user || data?.user);

        // Set and persist tokens
        await ApiService.setTokens(tokens.accessToken, tokens.refreshToken);
        if (tokens.accessToken) await SafeStorage.setItem('finora_auth_token', tokens.accessToken);
        if (tokens.refreshToken) await SafeStorage.setItem('finora_refresh_token', tokens.refreshToken);
        if (data?.data?.apiKey) await SafeStorage.setItem('finora_api_key', data.data.apiKey);
        if (user) await SafeStorage.setItem('finora_user', JSON.stringify(user));

        setIsAuthenticated(true);

        // Load user's groups from backend
        await loadUserGroups();

        Alert.alert('Welcome!', `Hello ${data.user?.firstName || ''}! You're now logged in.`);
      } else {
        const msg = (data && data.message)
          || (text ? `HTTP ${response.status}: ${text.slice(0, 200)}` : `HTTP ${response.status}`);
        Alert.alert('Login Failed', msg);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Connection Error', `Unable to connect to server.\n\nError: ${errorMessage}\n\nPlease check your internet connection and try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear stored authentication
      await SafeStorage.setItem('finora_auth_token', '');
      await SafeStorage.setItem('finora_refresh_token', '');
      await SafeStorage.setItem('finora_user', '');

      // Clear API service tokens
      await ApiService.clearTokens();

      // Reset app state
      setIsAuthenticated(false);
      setEmail('');
      setPassword('');
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedStock(null);
      setCutoffPrice('');
      setShares('');
      setCustomGroups([]);

      Alert.alert('Success', 'Logged out successfully!');
    } catch (error) {
      console.error('Logout error:', error);
      // Still proceed with logout even if storage fails
      setIsAuthenticated(false);
    }
  };

  // Smart cutoff price calculation
  const calculateSmartCutoffPrice = (currentPrice: number) => {
    // Simulate reasonable entry points based on typical stock volatility
    const week52Low = currentPrice * 0.75; // 25% below current
    const week24Low = currentPrice * 0.85; // 15% below current
    const week12Low = currentPrice * 0.92; // 8% below current

    // If 52-week low is reasonable (15-40% below current), use it
    const week52Discount = ((currentPrice - week52Low) / currentPrice) * 100;
    if (week52Discount >= 15 && week52Discount <= 40) {
      return week52Low;
    }

    // If 24-week low is reasonable (10-35% below current), use it
    const week24Discount = ((currentPrice - week24Low) / currentPrice) * 100;
    if (week24Discount >= 10 && week24Discount <= 35) {
      return week24Low;
    }

    // If 12-week low is reasonable (5-25% below current), use it
    const week12Discount = ((currentPrice - week12Low) / currentPrice) * 100;
    if (week12Discount >= 5 && week12Discount <= 25) {
      return week12Low;
    }

    // Fallback: 15% below current price
    return currentPrice * 0.85;
  };

  // Alpha Vantage API configuration
  // Get your free API key from: https://www.alphavantage.co/support/#api-key
  // Use stored API key or fallback to demo
  const ALPHA_VANTAGE_API_KEY = apiKey || 'demo';

  // Fetch real-time stock price from our backend
  const fetchRealTimePrice = async (symbol: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stocks/${symbol}?apiKey=${ALPHA_VANTAGE_API_KEY}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch stock data');
      }

      return {
        symbol: data.data.symbol,
        price: data.data.price,
        change: data.data.change,
        changePercent: data.data.changePercent,
        lastUpdated: data.data.lastUpdated
      };
    } catch (error) {
      console.error('Error fetching real-time price:', error);
      return null;
    }
  };

  // Fetch detailed stock data from Alpha Vantage
  const fetchStockDetails = async (symbol: string) => {
    try {
      // Get current quote
      const quoteResponse = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      const quoteData = await quoteResponse.json();

      // Get 52-week data
      const weeklyResponse = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      const weeklyData = await weeklyResponse.json();

      // Parse current price data
      const quote = quoteData['Global Quote'];
      const currentPrice = parseFloat(quote['05. price'] || '0');
      const changePercent = parseFloat(quote['10. change percent']?.replace('%', '') || '0');

      // Calculate 52-week high/low from weekly data
      let week52High = currentPrice;
      let week52Low = currentPrice;

      if (weeklyData['Weekly Time Series']) {
        const weeklyPrices = Object.values(weeklyData['Weekly Time Series']).slice(0, 52);
        const prices = weeklyPrices.map((week: any) => parseFloat(week['2. high']));
        const lows = weeklyPrices.map((week: any) => parseFloat(week['3. low']));
        week52High = Math.max(...prices);
        week52Low = Math.min(...lows);
      }

      return {
        symbol,
        currentPrice,
        changePercent,
        week52High,
        week52Low,
        week24Low: week52Low * 1.1, // Approximate
        week12Low: week52Low * 1.2, // Approximate
      };
    } catch (error) {
      console.error('Error fetching stock details:', error);
      return null;
    }
  };

  // Backend-powered search
  React.useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const token = ApiService.getAuthToken?.() || '';
        const resp = await fetch(`${API_BASE_URL}/market/search?q=${encodeURIComponent(searchQuery)}&limit=25`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        const json = await resp.json();
        if (!resp.ok || !json?.success) throw new Error(json?.message || 'Search failed');
        const baseResults = (json?.data?.results || []).map((r: any) => ({
          symbol: r.symbol,
          name: r.name || r.symbol,
          exchange: r.region || '\u2014',
          price: 0,
          change: 0,
          changePercent: 0,
          marketCap: 'N/A',
          volume: 'N/A',
        }));
        setSearchResults(baseResults);

        // Enrich with live quotes for top results
        if (baseResults.length > 0) {
          try {
            const symbols = baseResults.slice(0, 10).map((r: any) => r.symbol);
            const token2 = ApiService.getAuthToken?.() || '';
            const quotesResp = await fetch(`${API_BASE_URL}/search/quotes`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token2 ? { Authorization: `Bearer ${token2}` } : {})
              },
              body: JSON.stringify({ symbols })
            });
            const quotesJson = await quotesResp.json();
            if (quotesResp.ok && quotesJson?.success) {
              const map: Record<string, any> = {};
              for (const q of quotesJson.data.quotes || []) map[q.symbol] = q;
              setSearchResults((prev: any[]) => prev.map((r: any) => map[r.symbol]
                ? { ...r,
                    price: map[r.symbol].price ?? r.price,
                    change: map[r.symbol].change ?? r.change,
                    changePercent: map[r.symbol].changePercent ?? r.changePercent,
                    marketCap: map[r.symbol].marketCap ?? r.marketCap,
                    volume: map[r.symbol].volume ?? r.volume }
                : r));
            }
          } catch (e) {
            console.warn('Quotes enrichment failed', e);
          }
        }
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleStockSelect = (stock: any) => {
    setSelectedStock(stock);
    // Calculate smart cutoff price
    const currentPrice = stock.price || 100;
    const smartCutoff = calculateSmartCutoffPrice(currentPrice);
    setCutoffPrice(smartCutoff.toFixed(2));
    setShares(''); // Optional
    setShowSearch(false); // Hide search screen
    setSearchQuery(''); // Clear search
    setSearchResults([]); // Clear results
  };

  // Fetch chart data from backend market API
  const fetchChartData = async (symbol: string) => {
    try {
      const token = ApiService.getAuthToken?.() || '';
      const resp = await fetch(`${API_BASE_URL}/market/stock/${encodeURIComponent(symbol)}/historical?period=daily&interval=1d`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const json = await resp.json();
      if (!resp.ok || !json?.success) throw new Error(json?.message || 'Failed to load chart');
      const prices = Array.isArray(json?.data?.prices) ? json.data.prices : [];
      const chartPoints = prices.slice(0, 30).reverse().map((p: any) => ({
        date: p.date,
        price: p.close ?? p.price ?? 0,
        high: p.high ?? p.price ?? 0,
        low: p.low ?? p.price ?? 0,
      }));
      setChartData({
        symbol,
        points: chartPoints,
        currentPrice: chartPoints[chartPoints.length - 1]?.price || 0
      });
      setShowChart(true);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      Alert.alert('Error', 'Unable to load chart data');
    }
  };

  const handleShowChart = (stock: any) => {
    fetchChartData(stock.symbol);
  };

  const addToWatchlist = async () => {
    if (!selectedStock) return;

    try {
      if (watchlist.find(item => item.symbol === selectedStock.symbol)) {
        Alert.alert('Info', `${selectedStock.symbol} is already in your watchlist`);
        return;
      }

      const cutoffBase = Number.isFinite(selectedStock?.price) && selectedStock.price > 0 ? selectedStock.price : 100;
      const cutoffValue = parseFloat(cutoffPrice) || calculateSmartCutoffPrice(cutoffBase);

      // Persist to backend
      await ApiService.post('/stocks', {
        symbol: selectedStock.symbol,
        cutoffPrice: cutoffValue,
        targetPrice: cutoffValue,
      });

      // Reload from backend to ensure live data
      await loadUserStocksFromBackend();

      Alert.alert('Success', `${selectedStock.symbol} added to watchlist!`);
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      const message = serverMsg || err?.message || 'Failed to add stock to watchlist';
      Alert.alert('Error', message);
      console.error('addToWatchlist error:', err);
    } finally {
      // Reset form
      setSelectedStock(null);
      setCutoffPrice('');
      setShares('');
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };


  if (isAuthenticated) {
    // Stock selection form (highest priority)
    if (selectedStock) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedStock(null)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add to Watchlist</Text>
          </View>

          <View style={styles.stockCard}>
            <Text style={styles.stockSymbol}>{selectedStock.symbol}</Text>
            <Text style={styles.stockName}>{selectedStock.name}</Text>
            <Text style={styles.stockDetails}>{selectedStock.exchange} • {selectedStock.sector}</Text>
            {selectedStock.price > 0 && (
              <Text style={styles.currentPrice}>Current: ${selectedStock.price.toFixed(2)}</Text>
            )}
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Cutoff Price (Alert when stock hits this price)</Text>
            <TextInput
              style={styles.input}
              placeholder="Auto-calculated smart price"
              placeholderTextColor="#9CA3AF"
              value={cutoffPrice}
              onChangeText={setCutoffPrice}
              keyboardType="numeric"
            />

            <Text style={styles.formLabel}>Shares (Optional - for tracking potential investment)</Text>
            <TextInput
              style={styles.input}
              placeholder="Number of shares to track"
              placeholderTextColor="#9CA3AF"
              value={shares}
              onChangeText={setShares}
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.addButton} onPress={addToWatchlist}>
              <Text style={styles.addButtonText}>🔔 Add to Watchlist</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (showSearch) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowSearch(false)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Search Stocks</Text>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search stocks by symbol or name..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />

          <View style={styles.popularStocks}>
            <Text style={styles.sectionTitle}>Popular:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['AAPL', 'TSLA', 'NVDA', 'MSFT', 'META', 'GOOGL', 'COIN'].map((symbol) => (
                <TouchableOpacity
                  key={symbol}
                  style={styles.popularChip}
                  onPress={() => handleSearch(symbol)}
                >
                  <Text style={styles.popularChipText}>{symbol}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.symbol}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchResult}
                onPress={() => handleStockSelect(item)}
              >
                <View style={styles.searchResultContent}>
                  <View style={styles.stockInfo}>
                    <Text style={styles.stockName}>{item.name}</Text>
                    <Text style={styles.stockSymbolExchange}>
                      {item.symbol} • {item.exchange} ({item.currency || 'USD'})
                    </Text>
                  </View>
                  <View style={styles.priceInfo}>
                    {item.price > 0 && (
                      <>
                        <Text style={styles.stockPrice}>
                          {item.currency === 'USD' ? '$' : ''}{item.price.toFixed(2)}
                        </Text>
                        {item.changePercent !== 0 && (
                          <Text style={[
                            styles.changePercent,
                            { color: item.changePercent >= 0 ? '#137333' : '#D93025' }
                          ]}>
                            {item.changePercent >= 0 ? '↗' : '↘'} {Math.abs(item.changePercent).toFixed(2)}%
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              isSearching ? (
                <Text style={styles.emptyText}>Searching...</Text>
              ) : searchQuery.length >= 1 ? (
                <Text style={styles.emptyText}>No stocks found for "{searchQuery}"</Text>
              ) : (
                <Text style={styles.emptyText}>Type to search stocks worldwide</Text>
              )
            }
          />
        </View>
      );
    }



    // Professional Trading Dashboard - Dynamic Groups
    const groups = watchlist.reduce((acc, stock) => {
      acc[stock.group] = (acc[stock.group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Add custom groups (even if they have 0 stocks)
    customGroups.forEach(group => {
      if (!groups[group.name]) {
        groups[group.name] = 0;
      }
    });

    // System "Alerts" group: price <= cutoffPrice (duplicates into Alerts view)
    const alertsStocks = watchlist.filter((stock) => {
      const price = Number(stock.price);
      const cutoff = Number(stock.cutoffPrice);
      return Number.isFinite(price) && Number.isFinite(cutoff) && cutoff > 0 && price <= cutoff;
    });
    const alertsCount = alertsStocks.length;

    // Create tabs with "All Stocks", then system "Alerts", then "Watchlist", then others
    const tabs = [
      { name: 'All Stocks', count: watchlist.length },
      { name: '🚨 Alerts', count: alertsCount },
      { name: 'Watchlist', count: groups['Watchlist'] || 0 },
      ...Object.entries(groups)
        .filter(([name]) => name !== 'All Stocks' && name !== 'Watchlist')
        .map(([name, count]) => ({ name, count }))
    ];

    const currentStocks = activeTab === 'All Stocks'
      ? watchlist
      : activeTab === '🚨 Alerts'
        ? alertsStocks
        : watchlist.filter(stock => stock.group === activeTab);

    const calculateDistance = (current: number, low?: number) => {
      const c = Number.isFinite(current) ? current : 0;
      const l = typeof low === 'number' && isFinite(low) && low > 0 ? low : 0;
      if (l <= 0) return 0;
      return ((c - l) / l) * 100;
    };



    const calculateCutoffDistance = (current: number, cutoff: number) => {
      const c = Number.isFinite(current) ? current : 0;
      const co = Number.isFinite(cutoff) && cutoff > 0 ? cutoff : 0;
      if (co <= 0) return 0;
      return ((c - co) / co) * 100;
    };

    const getMarketCapValue = (marketCap?: string) => {
      if (!marketCap || typeof marketCap !== 'string') return 0;
      const value = parseFloat(marketCap.replace(/[$BTM]/g, ''));
      if (marketCap.includes('T')) return value * 1000000;
      if (marketCap.includes('B')) return value * 1000;
      if (marketCap.includes('M')) return value;
      return Number.isFinite(value) ? value : 0;
    };

    let sortedStocks = [...currentStocks];
    try {
      sortedStocks = [...currentStocks].sort((a, b) => {
        let result = 0;

        switch (sortBy) {
          case '🎯 Opportunity Hunter': // 52W Low Distance %
            const distA = calculateDistance(a.price, a.week52Low || a.low52Week);
            const distB = calculateDistance(b.price, b.week52Low || b.low52Week);
            result = distA - distB;
            break;

          case '💰 Value Seeker': // Cutoff Distance %
            const cutoffDistA = calculateCutoffDistance(a.price, a.cutoffPrice);
            const cutoffDistB = calculateCutoffDistance(b.price, b.cutoffPrice);
            result = cutoffDistA - cutoffDistB;
            break;

          case '💎 Blue Chip Elite': // Market Cap Stability
            const mcapA = getMarketCapValue(a.marketCap);
            const mcapB = getMarketCapValue(b.marketCap);
            result = mcapB - mcapA; // Larger market cap first for stability
            break;

          case '📝 Alphabetical': // Symbol A-Z
            result = a.symbol.localeCompare(b.symbol);
            break;

          case '⏰ Fresh Additions': // Recently Added (simulate with reverse order)
            const indexA = watchlist.indexOf(a);
            const indexB = watchlist.indexOf(b);
            result = indexB - indexA; // Most recently added first
            break;

          case '📈 Price Action': // Current Price
            result = a.price - b.price;
            break;

          case '🔥 Hot Movers': // Daily Change %
            result = a.changePercent - b.changePercent;
            break;

          default:
            result = 0;
        }

        // Apply ascending/descending order
        return sortOrder === 'asc' ? result : -result;
      });
    } catch (err) {
      console.error('Sort error, falling back to unsorted:', err);
      sortedStocks = [...currentStocks];
    }

    return (
      <View style={styles.dashboardContainer}>
        {/* User Info and Actions Bar */}
        <View style={styles.userBar}>
          <View style={styles.userInfo}>
            <Text style={styles.appTitle}>Finora</Text>
            <Text style={styles.username}>👤 {email || 'User'}</Text>
          </View>
          <View style={styles.userActions}>
            <TouchableOpacity style={styles.userActionButton} onPress={() => setFeedbackVisible(true)}>
              <Text style={styles.userActionButtonText}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.userActionButton} onPress={handleLogout}>
              <Text style={styles.userActionButtonText}>🚪</Text>
            </TouchableOpacity>
        <FeedbackModal visible={feedbackVisible} onClose={() => setFeedbackVisible(false)} />

          </View>
        </View>

        {/* Search Header with Import/Export */}
        <View style={styles.dashboardHeader}>
          <View style={styles.searchContainer}>
            <TouchableOpacity
              style={styles.searchBar}
              onPress={() => setShowSearch(true)}
            >
              <Text style={styles.searchPlaceholder}>🔍 Search stocks & ETFs (Finora)…</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.stackedActionButton} onPress={manualRefresh}>
              <Text style={styles.stackedActionButtonText}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stackedActionButton} onPress={handleExportCSVBackend}>
              <Text style={styles.stackedActionButtonText}>📤</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stackedActionButton} onPress={handleImportCSVBackend}>
              <Text style={styles.stackedActionButtonText}>📥</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{marginTop: 6}}>
          <Text style={styles.importHint}>Tip: Select a .csv from Downloads. If files are greyed out, open Files and pick the CSV.</Text>
        </View>

        {/* Enhanced Professional Tabs */}
        <View style={styles.enhancedTabsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.name}
                style={[
                  styles.enhancedTab,
                  activeTab === tab.name && styles.enhancedActiveTab
                ]}
                onPress={() => setActiveTab(tab.name)}
              >
                <View style={styles.tabContent}>
                  <Text style={[
                    styles.enhancedTabText,
                    activeTab === tab.name && styles.enhancedActiveTabText
                  ]}>
                    {tab.name}
                  </Text>
                  {tab.count > 0 && (
                    <View style={[
                      styles.enhancedTabBadge,
                      activeTab === tab.name && styles.enhancedActiveTabBadge
                    ]}>
                      <Text style={[
                        styles.enhancedTabBadgeText,
                        activeTab === tab.name && styles.enhancedActiveTabBadgeText
                      ]}>
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.enhancedAddGroupButton}
              onPress={() => setShowAddGroup(true)}
            >
              <Text style={styles.enhancedAddGroupText}>⊕ Add Group</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Enhanced Professional Controls */}
        <View style={styles.enhancedControlsSection}>

          <View style={styles.controlsBottomRow}>
            <View style={styles.sortingControls}>
              <Text style={styles.enhancedSortLabel}>Sort by:</Text>
              <TouchableOpacity
                style={[styles.enhancedSortButton, { zIndex: 1000 }]}
                onPress={() => setShowSortDropdown(!showSortDropdown)}
                activeOpacity={0.7}
              >
                <Text style={styles.enhancedSortText}>{sortBy}</Text>
                <Text style={styles.sortArrow}>{showSortDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.enhancedSortOrderButton}
                onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <Text style={styles.enhancedSortOrderText}>
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.enhancedSummaryStats}>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={refreshStockData}
              >
                <Text style={styles.refreshButtonText}>🔄</Text>
              </TouchableOpacity>
              <Text style={styles.enhancedSummaryText}>
                {currentStocks.length} stocks • {alertsCount} alerts
              </Text>
            </View>
          </View>
        </View>

        {/* Stock Cards */}
        <ScrollView
          style={styles.stocksList}
          onTouchStart={() => setShowSortDropdown(false)}
        >
          {sortedStocks.map((stock, index) => (
            <View key={index} style={styles.professionalStockCard}>
              <View style={styles.stockCardHeader}>
                <View style={styles.stockMainInfo}>
                  <View style={styles.stockTitleRow}>
                    <TouchableOpacity onPress={() => handleStockSymbolClick(stock)}>
                      <Text style={[styles.stockSymbolLarge, styles.clickableSymbol]}>{stock.symbol}</Text>
                    </TouchableOpacity>
                    <Text style={styles.stockPriceLarge}>${stock.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.stockSubtitleRow}>
                    <Text style={styles.stockNameSmall}>{stock.name}</Text>
                    <Text style={[
                      styles.stockChange,
                      { color: stock.changePercent >= 0 ? '#00C851' : '#FF4444' }
                    ]}>
                      {stock.changePercent >= 0 ? '↗' : '↘'} ${Math.abs(stock.change).toFixed(2)} ({Math.abs(stock.changePercent).toFixed(2)}%)
                    </Text>
                  </View>
                </View>
                {Number(stock.cutoffPrice) > 0 && stock.price <= stock.cutoffPrice && (
                  <View style={styles.alertBadges}>
                    <View style={styles.alertBadge}>
                      <Text style={styles.alertText}>Alert</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.targetRow}>
                <Text style={styles.targetLabel}>🎯 Target: ${stock.target.toFixed(2)}</Text>
                <Text style={styles.targetProgress}>100.0%</Text>
              </View>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '100%' }]} />
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>52W Low</Text>
                  <Text style={styles.metricValue}>+{calculateDistance(stock.price, stock.week52Low).toFixed(1)}%</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>24W Low</Text>
                  <Text style={styles.metricValue}>+{calculateDistance(stock.price, stock.week24Low).toFixed(1)}%</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>12W Low</Text>
                  <Text style={styles.metricValue}>+{calculateDistance(stock.price, stock.week12Low).toFixed(1)}%</Text>
                </View>
              </View>

              <View style={styles.stockFooter}>
                <View style={styles.footerInfo}>
                  <Text style={styles.footerText}>Volume: {stock.volume}</Text>
                  <Text style={styles.footerText}>Cap: {stock.marketCap}</Text>
                  <Text style={styles.footerText} numberOfLines={1} ellipsizeMode='tail'>Notes: {(stock.notes || '').trim() || '-'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditStock(stock)}
                >
                  <Text style={styles.editButtonText}>✏️ Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Add Group Modal */}
        {showAddGroup && (
          <View style={styles.modalOverlay}>
            <View style={styles.addGroupModal}>
              <Text style={styles.addGroupTitle}>Add New Group</Text>
              <TextInput
                style={styles.addGroupInput}
                placeholder="Enter group name"
                placeholderTextColor="#888888"
                value={newGroupName}
                onChangeText={setNewGroupName}
                autoFocus
              />
              <View style={styles.addGroupButtons}>
                <TouchableOpacity
                  style={styles.addGroupCancelButton}
                  onPress={() => {
                    setShowAddGroup(false);
                    setNewGroupName('');
                  }}
                >
                  <Text style={styles.addGroupCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addGroupConfirmButton}
                  onPress={addNewGroup}
                >
                  <Text style={styles.addGroupConfirmText}>Add Group</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Sort Dropdown with Overlay - Positioned at Root Level */}
        {showSortDropdown && (
          <>
            <TouchableOpacity
              style={styles.dropdownOverlay}
              activeOpacity={1}
              onPress={() => setShowSortDropdown(false)}
            />
            <View style={styles.sortDropdown}>
              {SORTING_OPTIONS.map((option, index) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortOption,
                    sortBy === option.key && styles.sortOptionActive,
                    index === SORTING_OPTIONS.length - 1 && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => {
                    setSortBy(option.key);
                    setShowSortDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.sortOptionText,
                    sortBy === option.key && styles.sortOptionTextActive
                  ]}>
                    {option.name}
                  </Text>
                  <Text style={[
                    styles.sortOptionDescription,
                    sortBy === option.key && { color: '#000000' }
                  ]}>
                    {option.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Stock Chart Modal */}
        <StockChartModal
          visible={showChartModal}
          symbol={selectedChartStock?.symbol || ''}
          currentPrice={selectedChartStock?.price || 0}
          marketCap={selectedChartStock?.marketCap ? parseFloat(selectedChartStock.marketCap.replace(/[$BTM]/g, '')) * (selectedChartStock.marketCap.includes('T') ? 1e12 : selectedChartStock.marketCap.includes('B') ? 1e9 : selectedChartStock.marketCap.includes('M') ? 1e6 : 1) : 0}
          volume={selectedChartStock?.volume ? parseFloat(selectedChartStock.volume.replace(/[M]/g, '')) * 1e6 : 0}
          onClose={handleCloseChart}
        />

        {/* Edit Stock Modal */}
        {showEditModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.editModal}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Edit Stock</Text>
                <TouchableOpacity onPress={handleCancelEdit}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              {editingStock && (
                <View style={styles.editModalContent}>
                  <View style={styles.stockInfo}>
                    <Text style={styles.editStockSymbol}>{editingStock.symbol}</Text>
                    <Text style={styles.editStockName}>{editingStock.name}</Text>
                    <Text style={styles.editCurrentPrice}>Current: ${editingStock.price.toFixed(2)}</Text>
                  </View>

                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Target Price</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editTargetPrice}
                      onChangeText={setEditTargetPrice}
                      placeholder="Enter target price"
                      keyboardType="numeric"
                      placeholderTextColor="#666"
                    />
                  </View>

                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Group</Text>
                    <View style={styles.groupSelector}>
                      {Object.keys(groups).map((groupName) => (
                        <TouchableOpacity
                          key={groupName}
                          style={[
                            styles.groupOption,
                            editGroup === groupName && styles.groupOptionSelected
                          ]}
                          onPress={() => setEditGroup(groupName)}
                        >
                          <Text style={[
                            styles.groupOptionText,
                            editGroup === groupName && styles.groupOptionTextSelected
                          ]}>
                            {groupName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.editModalButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.loginContainer}
        contentContainerStyle={styles.loginContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>🎯 Finora</Text>
        <Text style={styles.subtitle}>Smart Stock Watchlist</Text>

        <View style={styles.loginForm}>
          {showRegister && (
            <>
              <TextInput
                style={styles.input}
                placeholder="First Name *"
                placeholderTextColor="#9CA3AF"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Last Name *"
                placeholderTextColor="#9CA3AF"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Organization/Company *"
                placeholderTextColor="#9CA3AF"
                value={organization}
                onChangeText={setOrganization}
                autoCapitalize="words"
              />
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Which of the following best describes you? *</Text>
                <TouchableOpacity
                  style={[styles.input, styles.picker]}
                  onPress={() => {
                    Alert.alert(
                      'Select User Type',
                      'Which of the following best describes you?',
                      [
                        { text: 'Investor', onPress: () => setUserType('Investor') },
                        { text: 'Software Developer', onPress: () => setUserType('Software Developer') },
                        { text: 'Educator', onPress: () => setUserType('Educator') },
                        { text: 'Student', onPress: () => setUserType('Student') },
                        { text: 'Other', onPress: () => setUserType('Other') },
                        { text: 'Cancel', style: 'cancel' }
                      ]
                    );
                  }}
                >
                  <Text style={[styles.pickerText, !userType && styles.placeholderText]}>
                    {userType || 'Select user type *'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!showRegister && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {showRegister && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

            </>
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={showRegister ? handleRegister : handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Please wait...' : (showRegister ? 'Create Account' : 'Login')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              setShowRegister(!showRegister);
              // Clear form when switching
              setFirstName('');
              setLastName('');
              setConfirmPassword('');
              setOrganization('');
              setUserType('');
              setEmail('');
              setPassword('');
            }}
          >
            <Text style={styles.linkText}>
              {showRegister ? 'Already have an account? Login' : 'Need an account? Sign up'}
            </Text>
          </TouchableOpacity>

          {showRegister && (
            <>
              <Text style={styles.passwordHint}>
                Password must be at least 8 characters with uppercase, lowercase, number, and special character.
              </Text>
              <Text style={styles.apiKeyHint}>
                📊 Your account will automatically receive a personal Alpha Vantage API key for real-time stock data access.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  // Professional Dashboard Styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  importHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 16,
  },
  loginContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loginContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  message: {
    fontSize: 16,
    color: '#059669',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginForm: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  picker: {
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  button: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  linkButton: {
    marginTop: 20,
    paddingVertical: 10,
  },
  linkText: {
    color: '#3B82F6',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  passwordHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  apiKeyHint: {
    fontSize: 12,
    color: '#059669',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 16,
    fontWeight: '500',
  },
  hint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
  // Search Screen Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  popularStocks: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  popularChip: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  popularChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchResult: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 2,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  searchResultContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfo: {
    flex: 1,
    marginRight: 16,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stockSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  stockPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  stockName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
    marginBottom: 4,
  },
  stockSymbolExchange: {
    fontSize: 14,
    color: '#5F6368',
  },
  stockDetails: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  changePercent: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  weekData: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 16,
    marginTop: 40,
  },
  // Watchlist Screen Styles
  dashboardHeader: {
    backgroundColor: '#1A1A1A',
    paddingTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // User Bar Styles
  userBar: {
    backgroundColor: '#2D3748',
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#4A5568',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  appTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userActionButton: {
    backgroundColor: '#4A5568',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  userActionButtonText: {
    fontSize: 14,
    color: '#E2E8F0',
  },

  watchlistStats: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 20,
  },
  statsText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  watchlistContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyWatchlist: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 16,
    marginTop: 60,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  watchlistItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bottomSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  logoutButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 20,
    marginVertical: 20,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  // Stock Selection Form Styles
  stockCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
    marginTop: 8,
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  // Chart Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartModalContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    maxHeight: '80%',
    width: '90%',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  chartTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  chartCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartCloseText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  chartPriceInfo: {
    padding: 20,
    alignItems: 'center',
  },
  chartCurrentPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#059669',
  },
  chartExchange: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  chartContainer: {
    padding: 20,
  },
  chartLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartArea: {
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  chartPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  chartNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  chartActions: {
    padding: 20,
  },
  chartActionButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  chartActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Professional Dashboard Styles
  professionalHeader: {
    backgroundColor: '#1A1A1A',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    marginRight: 8,
  },
  searchBar: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  searchPlaceholder: {
    color: '#888888',
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#404040',
  },
  actionButtonText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '500',
  },
  stackedActionButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#404040',
    minWidth: 28,
    alignItems: 'center',
  },
  stackedActionButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },

  // Tabs
  tabsContainer: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tab: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#404040',
  },
  activeTab: {
    backgroundColor: '#00C851',
    borderColor: '#00C851',
  },
  tabText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabCount: {
    backgroundColor: '#404040',
    color: '#CCCCCC',
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  addGroupButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#404040',
    borderStyle: 'dashed',
  },
  addGroupText: {
    color: '#888888',
    fontSize: 14,
  },

  // Controls
  controlsContainer: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  groupStats: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 12,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sortLabel: {
    color: '#CCCCCC',
    fontSize: 14,
    marginRight: 12,
  },
  sortButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  sortText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  sortOrderButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#404040',
  },
  sortOrderText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  modeContainer: {
    backgroundColor: '#00C851',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  summaryStats: {
    alignItems: 'flex-end',
  },
  summaryText: {
    color: '#888888',
    fontSize: 12,
  },

  // Stock Cards
  stocksList: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
  },
  professionalStockCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#404040',
  },
  stockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stockMainInfo: {
    flex: 1,
  },
  stockTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stockSymbolLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  clickableSymbol: {
    textDecorationLine: 'underline',
    color: '#00C851',
  },
  stockPriceLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stockSubtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockNameSmall: {
    fontSize: 14,
    color: '#CCCCCC',
    flex: 1,
    marginRight: 8,
  },
  stockChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  alertBadges: {
    flexDirection: 'row',
  },
  alertBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  alertText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetLabel: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  targetProgress: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#404040',
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00C851',
    borderRadius: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    color: '#00C851',
    fontSize: 14,
    fontWeight: '500',
  },
  stockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    color: '#888888',
    fontSize: 12,
  },

  // Enhanced Professional Styles
  enhancedHeader: {
    backgroundColor: '#0F0F0F',
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  searchSection: {
    marginBottom: 16,
  },
  enhancedSearchBar: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  enhancedSearchText: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '500',
  },
  csvActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  csvButton: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  csvButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
  },

  // Enhanced Tabs
  enhancedTabsSection: {
    backgroundColor: '#0F0F0F',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tabsScrollContent: {
    paddingHorizontal: 20,
    gap: 6,
  },
  enhancedTab: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 6,
    paddingVertical: 0,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    minWidth: 0,
    height: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enhancedActiveTab: {
    backgroundColor: '#00FF88',
    borderColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOpacity: 0.4,
  },
  tabContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedTabText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  enhancedActiveTabText: {
    color: '#000000',
    fontWeight: '700',
  },
  enhancedTabBadge: {
    backgroundColor: '#333333',
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 6,
    marginLeft: 4,
  },
  enhancedActiveTabBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  enhancedTabBadgeText: {
    color: '#CCCCCC',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  enhancedActiveTabBadgeText: {
    color: '#000000',
  },
  enhancedAddGroupButton: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 6,
    paddingVertical: 0,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    borderStyle: 'solid',
    minWidth: 0,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  enhancedAddGroupText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Enhanced Controls
  enhancedControlsSection: {
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  controlsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  enhancedGroupStats: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '600',
  },
  enhancedModeIndicator: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  enhancedModeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  controlsBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  enhancedSortLabel: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  enhancedSortButton: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 44,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  enhancedSortText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  sortArrow: {
    color: '#666666',
    fontSize: 12,
  },
  enhancedSortOrderButton: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 50,
  },
  enhancedSortOrderText: {
    color: '#00FF88',
    fontSize: 18,
    fontWeight: '700',
  },
  enhancedSummaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  enhancedSummaryText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '500',
  },

  // Enhanced Stock Cards
  enhancedStocksList: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  enhancedStockCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  enhancedCardHeader: {
    marginBottom: 16,
  },
  enhancedStockMainInfo: {
    marginBottom: 8,
  },
  enhancedTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  enhancedStockSymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  enhancedStockPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  enhancedSubtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enhancedStockName: {
    fontSize: 14,
    color: '#CCCCCC',
    flex: 1,
    marginRight: 12,
    fontWeight: '500',
  },
  enhancedChangeContainer: {
    alignItems: 'flex-end',
  },
  enhancedStockChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  enhancedAlertSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  enhancedAlertBadge: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  enhancedAlertText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  enhancedTargetSection: {
    marginBottom: 16,
  },
  enhancedTargetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  enhancedTargetLabel: {
    color: '#CCCCCC',
    fontSize: 15,
    fontWeight: '600',
  },
  enhancedTargetProgress: {
    color: '#00FF88',
    fontSize: 15,
    fontWeight: '700',
  },
  enhancedProgressBar: {
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  enhancedProgressFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 3,
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  enhancedMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  enhancedMetricCard: {
    flex: 1,
    backgroundColor: '#262626',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#404040',
  },
  enhancedMetricLabel: {
    color: '#999999',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  enhancedMetricValue: {
    color: '#00FF88',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  enhancedStockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  enhancedFooterText: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '500',
  },

  // Add Group Modal Styles
  addGroupModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  addGroupTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  addGroupInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#404040',
    marginBottom: 24,
  },
  addGroupButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addGroupCancelButton: {
    flex: 1,
    backgroundColor: '#333333',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addGroupCancelText: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '600',
  },
  addGroupConfirmButton: {
    flex: 1,
    backgroundColor: '#00FF88',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addGroupConfirmText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  // Enhanced Sort Dropdown Styles
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 9998,
  },
  sortDropdown: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 99999,
    maxHeight: 420,
    overflow: 'hidden',
  },
  sortOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    minHeight: 64,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  sortOptionActive: {
    backgroundColor: '#00FF88',
    borderLeftWidth: 4,
    borderLeftColor: '#00CC66',
  },
  sortOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  sortOptionTextActive: {
    color: '#000000',
  },
  sortOptionDescription: {
    color: '#AAAAAA',
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.2,
    opacity: 0.8,
  },

  // Edit Stock Styles
  footerInfo: {
    flex: 1,
  },
  editButton: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  editModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  editModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    color: '#CCCCCC',
    fontSize: 24,
    fontWeight: '300',
  },
  editModalContent: {
    padding: 20,
  },
  editStockSymbol: {
    color: '#00FF88',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  editStockName: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 8,
  },
  editCurrentPrice: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  editField: {
    marginBottom: 20,
  },
  editLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#404040',
  },
  groupSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupOption: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#404040',
  },
  groupOptionSelected: {
    backgroundColor: '#00FF88',
    borderColor: '#00CC66',
  },
  groupOptionText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  groupOptionTextSelected: {
    color: '#000000',
    fontWeight: '600',
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333333',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#00FF88',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  refreshButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  refreshButtonText: {
    color: '#00FF88',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
