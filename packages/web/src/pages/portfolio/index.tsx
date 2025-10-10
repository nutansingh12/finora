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
  Chip,
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
  const [chartModal, setChartModal] = useState<{ open: boolean; symbol: string; name: string } | null>(null);

  const ChartDialog = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('1M');

    useEffect(() => {
      const load = async () => {
        if (!chartModal?.open) return;
        setLoading(true);
        try {
          const resp = await fetch(`/api/market/stock/${chartModal.symbol}/historical?period=daily`);
          const json = await resp.json();
          const rows = (json?.data?.historical || []).map((r: any) => ({ date: r.date, close: Number(r.close) || 0 }));
          setData(rows.reverse());
        } catch (e) {
          console.error('Failed to load chart');
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [chartModal?.open, chartModal?.symbol, period]);

    return (
      <div>
        {chartModal?.open && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setChartModal(null)}>
            <div style={{ background: '#fff', width: '90%', maxWidth: 900, borderRadius: 12, padding: 16 }} onClick={(e) => e.stopPropagation()}>
              <Typography variant="h6" gutterBottom>{chartModal.name} ({chartModal.symbol})</Typography>
              <div style={{ width: '100%', height: 380 }}>
                {loading ? (
                  <Typography>Loading…</Typography>
                ) : (
                  <PerformanceChart data={data.map((d, i) => { const prev = i > 0 ? data[i-1].close : d.close; const change = d.close - prev; const changePercent = prev ? (change / prev) * 100 : 0; return { date: d.date, value: d.close, change, changePercent }; })} isLoading={false} height={360} />
                )}
              </div>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button onClick={() => setChartModal(null)}>Close</Button>
              </Box>
            </div>
          </div>
        )}
      </div>
    );
  };

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

  // By Groups view state and helpers
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const groupNameById = new Map(groups.map((g) => [g.id, g.name] as const));
  const groupCounts: Record<string, number> = stocks.reduce((acc: Record<string, number>, s: any) => {
    const gid = (s as any).groupId || '';
    acc[gid] = (acc[gid] || 0) + 1;
    return acc;
  }, {});
  const groupedStocks = activeGroupId ? stocks.filter((s) => (s as any).groupId === activeGroupId) : stocks;



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
              <input id="import-file-input" type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.append('file', file);
                try {
                  const resp = await fetch('/api/portfolio/import', { method: 'POST', body: form });
                  const json = await resp.json();
                  if (json?.success) {
                    alert(`Imported ${json.data?.successfulImports || 0} of ${json.data?.totalRows || 0}`);
                    fetchPortfolio();
                  } else {
                    alert(json?.message || 'Import failed');
                  }
                } catch (err) {
                  alert('Import failed');
                }
              }} />
              <Button variant="outlined" startIcon={<FileDownload />} onClick={async () => {
                try {
                  const resp = await fetch('/api/portfolio/export');
                  const blob = await resp.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `finora_portfolio_${new Date().toISOString().slice(0,10)}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (e) {
                  alert('Export failed');
                }
              }}>Export</Button>
              <Button variant="outlined" onClick={() => document.getElementById('import-file-input')?.click()}>Import</Button>
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
        <ChartDialog />
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
                    onStockClick={(stock) => setChartModal({ open: true, symbol: stock.symbol, name: (stock as any).stock?.name || stock.symbol })}
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
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    <Chip
                      label={`All (${stocks.length})`}
                      color={!activeGroupId ? 'primary' : 'default'}
                      size="small"
                      variant={!activeGroupId ? 'filled' : 'outlined'}
                      onClick={() => setActiveGroupId(null)}
                    />
                    {groups.map((g) => (
                      <Chip
                        key={g.id}
                        label={`${g.name} (${groupCounts[g.id] || 0})`}
                        color={activeGroupId === g.id ? 'primary' : 'default'}
                        size="small"
                        variant={activeGroupId === g.id ? 'filled' : 'outlined'}
                        onClick={() => setActiveGroupId(g.id)}
                      />
                    ))}
                  </Box>
                  <StockList
                    stocks={groupedStocks}
                    isLoading={portfolioLoading}
                    onStockClick={(stock) => router.push(`/portfolio/stock/${stock.symbol}`)}
                  />
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
