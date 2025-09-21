import React, { useState, useEffect } from 'react';
import {View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, FlatList} from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';

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
      // To enable AsyncStorage, uncomment the lines below and install the package:
      // npm install @react-native-async-storage/async-storage
      // const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      // return await AsyncStorage.getItem(key);

      // For now, using memory storage simulation
      return null;
    } catch (error) {
      console.warn('Storage getItem failed, using fallback:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      // To enable AsyncStorage, uncomment the lines below:
      // const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      // await AsyncStorage.setItem(key, value);

      // For now, simulating storage
      console.log('✅ Storage saved (simulated):', key, `${value.length} chars`);
    } catch (error) {
      console.warn('Storage setItem failed, using fallback:', error);
    }
  }
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
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
  }>>([
    // Sample data to demonstrate the interface
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      price: 378.85,
      change: 4.12,
      changePercent: 1.10,
      exchange: 'NASDAQ',
      sector: 'Technology',
      currency: 'USD',
      marketCap: '$2.81T',
      cutoffPrice: 350.00,
      target: 350.00,
      group: 'All Stocks',
      alerts: [],
      week52Low: 309.45,
      week52High: 384.30,
      week24Low: 325.10,
      week12Low: 340.20,
      volume: '28.8M',
      lastUpdated: '3m',
      notes: '',
      low52Week: 309.45,
      low24Week: 325.10,
      low12Week: 340.20
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 175.84,
      change: -2.41,
      changePercent: -1.35,
      exchange: 'NASDAQ',
      sector: 'Technology',
      currency: 'USD',
      marketCap: '$2.75T',
      cutoffPrice: 150.00,
      target: 150.00,
      group: 'All Stocks',
      alerts: [],
      week52Low: 141.50,
      week52High: 199.62,
      week24Low: 156.78,
      week12Low: 165.04,
      volume: '67.8M',
      lastUpdated: '2m',
      notes: '',
      low52Week: 141.50,
      low24Week: 156.78,
      low12Week: 165.04
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc. Class A',
      price: 138.21,
      change: -1.23,
      changePercent: -0.88,
      exchange: 'NASDAQ',
      sector: 'Technology',
      currency: 'USD',
      marketCap: '$1.73T',
      cutoffPrice: 120.00,
      target: 120.00,
      group: 'All Stocks',
      alerts: ['Alert'],
      week52Low: 101.88,
      week52High: 151.55,
      week24Low: 116.21,
      week12Low: 129.40,
      volume: '34.5M',
      lastUpdated: '1m',
      notes: '',
      low52Week: 101.88,
      low24Week: 116.21,
      low12Week: 129.40
    },
    {
      symbol: 'TSLA',
      name: 'Tesla, Inc.',
      price: 248.87,
      change: -3.45,
      changePercent: -1.37,
      exchange: 'NASDAQ',
      sector: 'Consumer Discretionary',
      currency: 'USD',
      marketCap: '$789B',
      cutoffPrice: 200.00,
      target: 200.00,
      group: 'All Stocks',
      alerts: ['Alert'],
      week52Low: 152.37,
      week52High: 299.29,
      week24Low: 178.82,
      week12Low: 211.99,
      volume: '89.1M',
      lastUpdated: '2m',
      notes: '',
      low52Week: 152.37,
      low24Week: 178.82,
      low12Week: 211.99
    }
  ]);

  // Database persistence
  useEffect(() => {
    console.log('Finora app started successfully!');
    loadWatchlistFromStorage();
  }, []);

  useEffect(() => {
    saveWatchlistToStorage();
  }, [watchlist]);

  const loadWatchlistFromStorage = async () => {
    try {
      const savedWatchlist = await SafeStorage.getItem('finora_watchlist');
      if (savedWatchlist) {
        const parsedWatchlist = JSON.parse(savedWatchlist);
        setWatchlist(parsedWatchlist);
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

  const syncToCloudDatabase = async (data: any[]) => {
    try {
      // In production, implement API call to your backend
      const response = await fetch('https://finora-ehqzochz5-ns-medias-projects.vercel.app/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${email}` // Use proper auth token
        },
        body: JSON.stringify({ watchlist: data })
      });

      if (!response.ok) {
        console.warn('Cloud sync failed, data saved locally');
      }
    } catch (error) {
      console.warn('Cloud sync failed, data saved locally:', error);
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

      // For React Native, we'll use a simulated file save
      // In production, you would use react-native-fs and react-native-share
      Alert.alert(
        'CSV Export Ready',
        `Generated CSV file: ${fileName}\n\nContains ${watchlist.length} stocks\n\nWould you like to save or share this file?`,
        [
          {
            text: 'Save to Downloads',
            onPress: async () => {
              try {
                // Simulate file save - in production use RNFS.writeFile
                await SafeStorage.setItem('finora_last_export', csvContent);
                Alert.alert('Success', `CSV file saved successfully!\n\nFile: ${fileName}\nLocation: Downloads folder\n\nContains ${watchlist.length} stocks`);
              } catch (error) {
                Alert.alert('Error', 'Failed to save CSV file');
              }
            }
          },
          {
            text: 'Share',
            onPress: () => {
              // In production, use react-native-share
              Alert.alert('Share', 'CSV file ready to share via email, cloud storage, or messaging apps');
            }
          },
          { text: 'Cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export CSV data');
    }
  };

  const importFromCSV = () => {
    Alert.alert(
      'Import CSV',
      'Choose how you want to import stock data:',
      [
        { text: 'Select CSV File', onPress: () => selectCSVFile() },
        { text: 'Demo Import', onPress: () => importDemoData() },
        { text: 'Cancel' }
      ]
    );
  };

  const selectCSVFile = async () => {
    try {
      // In production, use react-native-document-picker
      // For now, simulate file selection
      Alert.alert(
        'File Selection',
        'In production, this would open a file picker to select your CSV file.\n\nSupported format:\nsymbol,cutoffPrice,groupName,currentPrice,low52Week,low24Week,low12Week,notes,lastUpdated',
        [
          { text: 'Simulate File Selected', onPress: () => processCSVFile('simulated_file.csv') },
          { text: 'Cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to open file picker');
    }
  };

  const processCSVFile = async (fileName: string) => {
    try {
      // In production, read the actual file content
      // For now, simulate with demo data
      const csvContent = `symbol,cutoffPrice,groupName,currentPrice,low52Week,low24Week,low12Week,notes,lastUpdated
NVDA,800,Tech Stocks,875.50,650.25,720.10,780.45,Strong AI leader,2025-09-20 10:30:00
AMD,120,Tech Stocks,145.75,95.80,110.25,125.60,CPU competitor,2025-09-20 10:30:00`;

      parseAndImportCSV(csvContent, fileName);
    } catch (error) {
      Alert.alert('Error', 'Failed to process CSV file');
    }
  };

  const parseAndImportCSV = (csvContent: string, fileName: string) => {
    try {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',');

      if (!headers.includes('symbol') || !headers.includes('currentPrice')) {
        Alert.alert('Error', 'Invalid CSV format. Required columns: symbol, currentPrice');
        return;
      }

      const newStocks = [];
      const duplicates = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',');
          const stockData: any = {};

          headers.forEach((header, index) => {
            stockData[header.trim()] = values[index]?.replace(/"/g, '').trim();
          });

          // Check for duplicates
          const existingStock = watchlist.find(s => s.symbol === stockData.symbol);
          if (existingStock) {
            duplicates.push(stockData.symbol);
            continue;
          }

          // Create stock object
          const newStock = {
            symbol: stockData.symbol,
            name: stockData.symbol + ' Corporation', // In production, fetch from API
            price: parseFloat(stockData.currentPrice) || 0,
            change: 0,
            changePercent: 0,
            exchange: 'NASDAQ',
            sector: 'Technology',
            currency: 'USD',
            marketCap: '$0B',
            cutoffPrice: parseFloat(stockData.cutoffPrice) || 0,
            target: parseFloat(stockData.cutoffPrice) || 0,
            group: stockData.groupName || 'Imported',
            alerts: [],
            week52Low: parseFloat(stockData.low52Week) || 0,
            week52High: parseFloat(stockData.currentPrice) || 0,
            week24Low: parseFloat(stockData.low24Week) || 0,
            week12Low: parseFloat(stockData.low12Week) || 0,
            volume: '0',
            lastUpdated: stockData.lastUpdated || new Date().toISOString(),
            notes: stockData.notes || '',
            low52Week: parseFloat(stockData.low52Week) || 0,
            low24Week: parseFloat(stockData.low24Week) || 0,
            low12Week: parseFloat(stockData.low12Week) || 0
          };

          newStocks.push(newStock);
        } catch (error) {
          errors.push(`Line ${i + 1}: ${error}`);
        }
      }

      // Show import results
      let message = `Import Results from ${fileName}:\n\n`;
      message += `✅ Successfully imported: ${newStocks.length} stocks\n`;
      if (duplicates.length > 0) {
        message += `⚠️ Skipped duplicates: ${duplicates.length} (${duplicates.join(', ')})\n`;
      }
      if (errors.length > 0) {
        message += `❌ Errors: ${errors.length}\n`;
      }

      if (newStocks.length > 0) {
        setWatchlist(prev => [...prev, ...newStocks]);
        Alert.alert('Import Complete', message);
      } else {
        Alert.alert('Import Failed', message + '\nNo new stocks were imported.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to parse CSV file');
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
    const newStocks = [];
    const duplicates = [];

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

  // Group Management Functions
  const addNewGroup = () => {
    if (newGroupName.trim()) {
      // Group will be created when first stock is added to it
      setShowAddGroup(false);
      setNewGroupName('');
      Alert.alert('Success', `Group "${newGroupName.trim()}" will be created when you add stocks to it.`);
    }
  };

  const handleLogin = () => {
    if (email === 'test@finora.com' && password === 'password') {
      setIsAuthenticated(true);
      Alert.alert('Success', 'Login successful!');
    } else {
      Alert.alert('Error', 'Invalid credentials. Use test@finora.com / password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedStock(null);
    setCutoffPrice('');
    setShares('');
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
  const ALPHA_VANTAGE_API_KEY = 'demo'; // Replace with your actual API key

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

  // Google Finance-like search using reliable APIs
  React.useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        let results: any[] = [];

        // Primary: Use Yahoo Finance API (most reliable and comprehensive)
        try {
          const response = await fetch(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQuery)}&lang=en-US&region=US&quotesCount=25&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&enableCb=true&enableNavLinks=true&enableEnhancedTrivialQuery=true`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            console.log('Yahoo Finance response:', data);

            if (data.quotes && data.quotes.length > 0) {
              results = data.quotes
                .filter((quote: any) =>
                  quote.quoteType === 'EQUITY' ||
                  quote.quoteType === 'ETF' ||
                  quote.typeDisp === 'Equity'
                )
                .slice(0, 20)
                .map((quote: any) => ({
                  symbol: quote.symbol,
                  name: quote.longname || quote.shortname || quote.symbol,
                  price: quote.regularMarketPrice || quote.regularMarketPreviousClose || 0,
                  change: quote.regularMarketChange || 0,
                  changePercent: quote.regularMarketChangePercent || 0,
                  exchange: quote.fullExchangeName || quote.exchange || 'Unknown',
                  sector: quote.sector || quote.industry || 'Unknown',
                  currency: quote.currency || 'USD',
                  marketCap: quote.marketCap || 0
                }));
            }
          }
        } catch (error) {
          console.log('Yahoo Finance failed:', error);
        }

        // Fallback: Try FMP (Financial Modeling Prep) free tier
        if (results.length === 0) {
          try {
            const fmpResponse = await fetch(
              `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(searchQuery)}&limit=20&apikey=demo`
            );

            if (fmpResponse.ok) {
              const fmpData = await fmpResponse.json();
              console.log('FMP response:', fmpData);

              if (Array.isArray(fmpData) && fmpData.length > 0) {
                results = fmpData.slice(0, 15).map((item: any) => ({
                  symbol: item.symbol,
                  name: item.name,
                  price: 0,
                  change: 0,
                  changePercent: 0,
                  exchange: item.exchangeShortName || 'Unknown',
                  sector: 'Unknown',
                  currency: item.currency || 'USD',
                  marketCap: 0
                }));
              }
            }
          } catch (error) {
            console.log('FMP failed:', error);
          }
        }

        // Last resort: Try Polygon.io free tier
        if (results.length === 0) {
          try {
            const polygonResponse = await fetch(
              `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(searchQuery)}&active=true&limit=20&apikey=demo`
            );

            if (polygonResponse.ok) {
              const polygonData = await polygonResponse.json();
              console.log('Polygon response:', polygonData);

              if (polygonData.results && polygonData.results.length > 0) {
                results = polygonData.results.slice(0, 15).map((item: any) => ({
                  symbol: item.ticker,
                  name: item.name,
                  price: 0,
                  change: 0,
                  changePercent: 0,
                  exchange: item.primary_exchange || 'Unknown',
                  sector: item.sic_description || 'Unknown',
                  currency: item.currency_name || 'USD',
                  marketCap: item.market_cap || 0
                }));
              }
            }
          } catch (error) {
            console.log('Polygon failed:', error);
          }
        }

        console.log('Final results:', results);
        setSearchResults(results);

      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // Faster response

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

  // Fetch chart data from Alpha Vantage
  const fetchChartData = async (symbol: string) => {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}&outputsize=compact`
      );
      const data = await response.json();

      if (data['Time Series (Daily)']) {
        const timeSeries = data['Time Series (Daily)'];
        const chartPoints = Object.entries(timeSeries)
          .slice(0, 30) // Last 30 days
          .reverse()
          .map(([date, values]: [string, any]) => ({
            date,
            price: parseFloat(values['4. close']),
            high: parseFloat(values['2. high']),
            low: parseFloat(values['3. low']),
          }));

        setChartData({
          symbol,
          points: chartPoints,
          currentPrice: chartPoints[chartPoints.length - 1]?.price || 0
        });
        setShowChart(true);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      Alert.alert('Error', 'Unable to load chart data');
    }
  };

  const handleShowChart = (stock: any) => {
    fetchChartData(stock.symbol);
  };

  const addToWatchlist = () => {
    if (!selectedStock) return;

    if (watchlist.find(item => item.symbol === selectedStock.symbol)) {
      Alert.alert('Info', `${selectedStock.symbol} is already in your watchlist`);
      return;
    }

    const cutoffValue = parseFloat(cutoffPrice) || calculateSmartCutoffPrice(selectedStock.price);
    const sharesValue = shares ? parseInt(shares) : undefined;

    const watchlistItem = {
      ...selectedStock,
      cutoffPrice: cutoffValue,
      shares: sharesValue
    };

    setWatchlist([...watchlist, watchlistItem]);
    Alert.alert('Success', `${selectedStock.symbol} added to watchlist!`);

    // Reset form
    setSelectedStock(null);
    setCutoffPrice('');
    setShares('');
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
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
              {['AAPL', 'TSLA', 'NVDA', 'COIN', 'DEFI', 'DEFT', 'META', 'GOOGL'].map((symbol) => (
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

    // Create tabs with "All Stocks" first, then other groups
    const tabs = [
      { name: 'All Stocks', count: watchlist.length },
      ...Object.entries(groups)
        .filter(([name]) => name !== 'All Stocks')
        .map(([name, count]) => ({ name, count }))
    ];

    const currentStocks = activeTab === 'All Stocks'
      ? watchlist
      : watchlist.filter(stock => stock.group === activeTab);

    const calculateDistance = (current: number, low: number) => {
      return ((current - low) / low * 100);
    };

    const calculateCutoffDistance = (current: number, cutoff: number) => {
      return ((current - cutoff) / cutoff * 100);
    };

    const getMarketCapValue = (marketCap: string) => {
      const value = parseFloat(marketCap.replace(/[$BTM]/g, ''));
      if (marketCap.includes('T')) return value * 1000000;
      if (marketCap.includes('B')) return value * 1000;
      if (marketCap.includes('M')) return value;
      return value;
    };

    const sortedStocks = [...currentStocks].sort((a, b) => {
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

    return (
      <View style={styles.dashboardContainer}>
        {/* Header */}
        <View style={styles.dashboardHeader}>
          <View style={styles.searchContainer}>
            <TouchableOpacity
              style={styles.searchBar}
              onPress={() => setShowSearch(true)}
            >
              <Text style={styles.searchPlaceholder}>🔍 Search stocks & ETFs...</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={exportToCSV}>
              <Text style={styles.actionButtonText}>📤 Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={importFromCSV}>
              <Text style={styles.actionButtonText}>📥 Import CSV</Text>
            </TouchableOpacity>
          </View>
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
          <View style={styles.controlsTopRow}>
            <Text style={styles.enhancedGroupStats}>
              📊 {currentStocks.length} stocks in this group
            </Text>
            <View style={styles.enhancedModeIndicator}>
              <Text style={styles.enhancedModeText}>💎 Value Investing Mode</Text>
            </View>
          </View>

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

              <Text style={styles.enhancedSummaryText}>
                {currentStocks.length} stocks • 2 alerts • 2 recently added
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
                    <Text style={styles.stockSymbolLarge}>{stock.symbol}</Text>
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
                {stock.alerts.length > 0 && (
                  <View style={styles.alertBadges}>
                    {stock.alerts.map((alert, i) => (
                      <View key={i} style={styles.alertBadge}>
                        <Text style={styles.alertText}>{alert}</Text>
                      </View>
                    ))}
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
                <Text style={styles.footerText}>Volume: {stock.volume}</Text>
                <Text style={styles.footerText}>Cap: {stock.marketCap}</Text>
                <Text style={styles.footerText}>Updated: {stock.lastUpdated}</Text>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.loginContainer}>
        <Text style={styles.title}>🎯 Finora</Text>
        <Text style={styles.subtitle}>Smart Stock Watchlist</Text>

        <View style={styles.loginForm}>
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
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Use: test@finora.com / password</Text>
        </View>
      </View>
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
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
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
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  stockInfo: {
    flex: 1,
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
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    marginRight: 16,
  },
  searchBar: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  searchPlaceholder: {
    color: '#888888',
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
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
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tabsScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  enhancedTab: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  enhancedActiveTab: {
    backgroundColor: '#00FF88',
    borderColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOpacity: 0.4,
  },
  tabContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enhancedTabText: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '600',
  },
  enhancedActiveTabText: {
    color: '#000000',
    fontWeight: '700',
  },
  enhancedTabBadge: {
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  enhancedActiveTabBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  enhancedTabBadgeText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
  },
  enhancedActiveTabBadgeText: {
    color: '#000000',
  },
  enhancedAddGroupButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
    minWidth: 140,
    alignItems: 'center',
  },
  enhancedAddGroupText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },

  // Enhanced Controls
  enhancedControlsSection: {
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    gap: 12,
  },
  enhancedSortLabel: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  enhancedSortButton: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    marginLeft: 8,
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
    alignItems: 'flex-end',
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
});

export default App;
