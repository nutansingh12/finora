import { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
  Notifications,
  Add,
} from '@mui/icons-material';

import { useAuthStore } from '@/store/authStore';
import { usePortfolioStore } from '@/store/portfolioStore';
import Layout from '@/components/Layout';
import PortfolioSummaryCard from '@/components/portfolio/PortfolioSummaryCard';
import StockList from '@/components/portfolio/StockList';
import MarketSummary from '@/components/market/MarketSummary';
import PerformanceChart from '@/components/charts/PerformanceChart';
import QuickActions from '@/components/dashboard/QuickActions';

const Dashboard: NextPage = () => {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();
  const {
    portfolio,
    stocks,
    isLoading: portfolioLoading,
    error: portfolioError,
    fetchPortfolio,
    fetchPerformance,
    performance,
  } = usePortfolioStore();

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch portfolio data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const loadData = async () => {
        try {
          await Promise.all([
            fetchPortfolio(),
            fetchPerformance('1Y'),
          ]);
        } catch (error) {
          console.error('Failed to load dashboard data:', error);
        } finally {
          setIsInitialLoad(false);
        }
      };

      loadData();
    }
  }, [isAuthenticated, user, fetchPortfolio, fetchPerformance]);

  // Show loading state during authentication check
  if (authLoading) {
    return (
      <Layout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Grid container spacing={3}>
            {[...Array(6)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="40%" height={24} />
                    <Skeleton variant="rectangular" width="100%" height={60} sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Layout>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Dashboard - Finora</title>
        <meta name="description" content="Your portfolio dashboard with real-time market data and analytics" />
      </Head>

      <Layout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Welcome Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome back, {user?.firstName}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Here's your portfolio overview and market insights
            </Typography>
          </Box>

          {/* Error Alert */}
          {portfolioError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {portfolioError}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Portfolio Summary */}
            <Grid item xs={12}>
              <PortfolioSummaryCard
                portfolio={portfolio}
                isLoading={isInitialLoad || portfolioLoading}
              />
            </Grid>

            {/* Quick Actions */}
            <Grid item xs={12} md={4}>
              <QuickActions />
            </Grid>

            {/* Performance Chart */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Portfolio Performance
                  </Typography>
                  <PerformanceChart
                    data={performance?.historicalValues || []}
                    isLoading={isInitialLoad || portfolioLoading}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Market Summary */}
            <Grid item xs={12} md={6}>
              <MarketSummary />
            </Grid>

            {/* Recent Stocks */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Your Stocks
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Add />}
                      onClick={() => router.push('/portfolio/add-stock')}
                    >
                      Add Stock
                    </Button>
                  </Box>
                  <StockList
                    stocks={stocks.slice(0, 5)} // Show only first 5 stocks
                    isLoading={isInitialLoad || portfolioLoading}
                    compact
                  />
                  {stocks.length > 5 && (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Button
                        variant="text"
                        onClick={() => router.push('/portfolio')}
                      >
                        View All Stocks ({stocks.length})
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Market Stats Cards */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUp color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="success.main">
                      Day Gainers
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div">
                    {portfolio?.totalGainLoss && portfolio.totalGainLoss > 0 ? '+' : ''}
                    {portfolio?.dayChange?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {portfolio?.dayChangePercent && portfolio.dayChangePercent > 0 ? '+' : ''}
                    {portfolio?.dayChangePercent?.toFixed(2) || '0.00'}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AccountBalance color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="primary">
                      Total Value
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div">
                    ${portfolio?.totalValue?.toLocaleString() || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Portfolio Value
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ShowChart color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="info.main">
                      Total Return
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div">
                    {portfolio?.totalGainLoss && portfolio.totalGainLoss > 0 ? '+' : ''}
                    ${portfolio?.totalGainLoss?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {portfolio?.totalGainLossPercent && portfolio.totalGainLossPercent > 0 ? '+' : ''}
                    {portfolio?.totalGainLossPercent?.toFixed(2) || '0.00'}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Notifications color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="warning.main">
                      Active Alerts
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div">
                    0
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Price Alerts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Layout>
    </>
  );
};

export default Dashboard;
