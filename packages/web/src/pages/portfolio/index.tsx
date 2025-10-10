import { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Fab,
} from '@mui/material';
import { Add, FileDownload, BarChart } from '@mui/icons-material';

import { useAuthStore } from '@/store/authStore';
import { usePortfolioStore } from '@/store/portfolioStore';
import Layout from '@/components/Layout';
import PortfolioSummaryCard from '@/components/portfolio/PortfolioSummaryCard';
import StockList from '@/components/portfolio/StockList';
import PerformanceChart from '@/components/charts/PerformanceChart';

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
      id={`portfolio-tabpanel-${index}`}
      aria-labelledby={`portfolio-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PortfolioPage: NextPage = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const {
    portfolio,
    stocks,
    groups,
    performance,
    isLoading: portfolioLoading,
    fetchPortfolio,
    fetchPerformance,
  } = usePortfolioStore();

  const [tabValue, setTabValue] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch portfolio data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchPortfolio();
      fetchPerformance('1Y');
    }
  }, [isAuthenticated, fetchPortfolio, fetchPerformance]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // System Alerts view: currentPrice <= cutoffPrice/targetPrice
  const alertsStocks = stocks.filter((s) => {
    const price = Number((s as any).currentPrice ?? 0);
    const cutoff = Number(((s as any).cutoffPrice ?? s.targetPrice ?? 0));
    return Number.isFinite(price) && Number.isFinite(cutoff) && cutoff > 0 && price <= cutoff;
  });


  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Portfolio - Finora</title>
        <meta name="description" content="Manage your stock portfolio and track performance" />
      </Head>

      <Layout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                My Portfolio
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Track and manage your stock investments
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<FileDownload />}
                onClick={() => router.push('/portfolio/export')}
              >
                Export
              </Button>
              <Button
                variant="outlined"
                startIcon={<BarChart />}
                onClick={() => router.push('/analytics')}
              >
                Analytics
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => router.push('/portfolio/add-stock')}
              >
                Add Stock
              </Button>
            </Box>
          </Box>

          {/* Portfolio Summary */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <PortfolioSummaryCard
                portfolio={portfolio}
                isLoading={portfolioLoading}
              />
            </Grid>

            {/* Performance Chart */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Portfolio Performance
                  </Typography>
                  <PerformanceChart
                    data={performance?.historicalValues || []}
                    isLoading={portfolioLoading}
                    height={400}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Portfolio Allocation */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Allocation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Portfolio allocation chart will be displayed here
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Tabs for different views */}
            <Grid item xs={12}>
              <Card>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={tabValue} onChange={handleTabChange} aria-label="portfolio tabs">
                    <Tab label="All Stocks" />
                    <Tab label="🚨 Alerts" />
                    <Tab label="By Groups" />
                    <Tab label="Performance" />
                  </Tabs>
                </Box>

                <TabPanel value={tabValue} index={0}>
                  <StockList
                    stocks={stocks}
                    isLoading={portfolioLoading}
                    onStockClick={(stock) => router.push(`/portfolio/stock/${stock.symbol}`)}
                  />
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <StockList
                    stocks={alertsStocks}
                    isLoading={portfolioLoading}
                    onStockClick={(stock) => router.push(`/portfolio/stock/${stock.symbol}`)}
                  />
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <Typography variant="body1">
                    Groups view will be implemented here
                  </Typography>
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                  <Typography variant="body1">
                    Detailed performance metrics will be displayed here
                  </Typography>
                </TabPanel>
              </Card>
            </Grid>
          </Grid>

          {/* Floating Action Button */}
          <Fab
            color="primary"
            aria-label="add stock"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
            onClick={() => router.push('/portfolio/add-stock')}
          >
            <Add />
          </Fab>
        </Container>
      </Layout>
    </>
  );
};

export default PortfolioPage;
