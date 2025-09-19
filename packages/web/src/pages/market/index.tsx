import { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip,
  Alert,
} from '@mui/material';
import { TrendingUp, TrendingDown, ShowChart } from '@mui/icons-material';

import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import MarketSummary from '@/components/market/MarketSummary';
import StockList from '@/components/portfolio/StockList';
import { StockData } from '@/types';
import stockService from '@/services/stockService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`market-tabpanel-${index}`}
      aria-labelledby={`market-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const MarketPage: NextPage = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  
  const [tabValue, setTabValue] = useState(0);
  const [trendingStocks, setTrendingStocks] = useState<StockData[]>([]);
  const [gainers, setGainers] = useState<StockData[]>([]);
  const [losers, setLosers] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch market data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const fetchMarketData = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          const [trending, topGainers, topLosers] = await Promise.all([
            stockService.getTrendingStocks(),
            stockService.getMarketMovers('gainers'),
            stockService.getMarketMovers('losers'),
          ]);
          
          setTrendingStocks(trending);
          setGainers(topGainers);
          setLosers(topLosers);
        } catch (err: any) {
          setError(err.message || 'Failed to fetch market data');
        } finally {
          setIsLoading(false);
        }
      };

      fetchMarketData();
    }
  }, [isAuthenticated]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Convert StockData to UserStock format for StockList component
  const convertToUserStock = (stocks: StockData[]) => {
    return stocks.map((stock) => ({
      id: stock.symbol,
      userId: '',
      symbol: stock.symbol,
      quantity: 0,
      averagePrice: 0,
      currentPrice: stock.price,
      totalValue: 0,
      gainLoss: stock.change,
      gainLossPercent: stock.changePercent,
      createdAt: '',
      updatedAt: '',
      stock: stock,
    }));
  };

  return (
    <>
      <Head>
        <title>Market - Finora</title>
        <meta name="description" content="Real-time market data, trends, and stock analysis" />
      </Head>

      <Layout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Market Overview
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Real-time market data and trending stocks
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Market Summary */}
            <Grid item xs={12} md={4}>
              <MarketSummary />
            </Grid>

            {/* Market Stats Cards */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TrendingUp color="success" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="success.main">
                          Top Gainers
                        </Typography>
                      </Box>
                      <Typography variant="h4" component="div">
                        {gainers.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Stocks up today
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TrendingDown color="error" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="error.main">
                          Top Losers
                        </Typography>
                      </Box>
                      <Typography variant="h4" component="div">
                        {losers.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Stocks down today
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <ShowChart color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="primary">
                          Trending
                        </Typography>
                      </Box>
                      <Typography variant="h4" component="div">
                        {trendingStocks.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Popular stocks
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            {/* Market Data Tabs */}
            <Grid item xs={12}>
              <Card>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Tabs value={tabValue} onChange={handleTabChange} aria-label="market tabs">
                      <Tab label="Trending" />
                      <Tab label="Top Gainers" />
                      <Tab label="Top Losers" />
                    </Tabs>
                    <Chip
                      label="Live Data"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <TabPanel value={tabValue} index={0}>
                  <StockList
                    stocks={convertToUserStock(trendingStocks)}
                    isLoading={isLoading}
                    onStockClick={(stock) => router.push(`/stock/${stock.symbol}`)}
                  />
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <StockList
                    stocks={convertToUserStock(gainers)}
                    isLoading={isLoading}
                    onStockClick={(stock) => router.push(`/stock/${stock.symbol}`)}
                  />
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <StockList
                    stocks={convertToUserStock(losers)}
                    isLoading={isLoading}
                    onStockClick={(stock) => router.push(`/stock/${stock.symbol}`)}
                  />
                </TabPanel>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Layout>
    </>
  );
};

export default MarketPage;
