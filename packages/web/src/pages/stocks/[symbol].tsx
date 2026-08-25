import { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Skeleton,
  Alert,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Add,
  NotificationAdd,
  ArrowBack,
} from '@mui/icons-material';

import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import apiService from '@/services/api';

interface StockDetails {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  high52Week: number;
  low52Week: number;
  peRatio: number;
  dividendYield: number;
  exchange?: string;
}

function formatMarketCap(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

function formatVolume(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
}

const StatItem = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      {label}
    </Typography>
    <Typography variant="h6" fontWeight="medium">
      {value}
    </Typography>
  </Box>
);

const StockDetailsPage: NextPage = () => {
  const router = useRouter();
  const { symbol } = router.query as { symbol?: string };
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [stock, setStock] = useState<StockDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!symbol || !isAuthenticated) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await apiService.get<any>(`/search/quote/${symbol.toUpperCase()}`);
        if (!resp.success || !resp.data) throw new Error(resp.message || 'Failed to load stock');
        const s = resp.data.stock || {};
        const q = resp.data.quote || {};

        setStock({
          symbol: symbol.toUpperCase(),
          name: s.name || symbol.toUpperCase(),
          price: Number(q.price) || 0,
          change: Number(q.change) || 0,
          changePercent: Number(q.changePercent) || 0,
          marketCap: Number(q.marketCap) || 0,
          volume: Number(q.volume) || 0,
          high52Week: Number(q.fiftyTwoWeekHigh ?? q.high ?? 0) || 0,
          low52Week: Number(q.fiftyTwoWeekLow ?? q.low ?? 0) || 0,
          peRatio: Number(q.peRatio) || 0,
          dividendYield: Number(q.dividendYield) || 0,
          exchange: s.exchange,
        });
      } catch (e: any) {
        setError(e.message || 'Failed to load stock details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [symbol, isAuthenticated]);

  if (!isAuthenticated) return null;

  const isPositive = (stock?.change ?? 0) >= 0;

  return (
    <>
      <Head>
        <title>{symbol ? `${symbol.toUpperCase()} - Finora` : 'Stock Details - Finora'}</title>
      </Head>

      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.back()}
            sx={{ mb: 3 }}
          >
            Back
          </Button>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Header */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              {loading ? (
                <>
                  <Skeleton width="20%" height={40} />
                  <Skeleton width="40%" height={28} />
                  <Skeleton width="15%" height={60} sx={{ mt: 2 }} />
                </>
              ) : stock ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="h4" fontWeight="bold">
                          {stock.symbol}
                        </Typography>
                        {stock.exchange && (
                          <Chip label={stock.exchange} size="small" variant="outlined" />
                        )}
                      </Box>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        {stock.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Typography variant="h3" fontWeight="bold">
                          ${stock.price.toFixed(2)}
                        </Typography>
                        <Chip
                          icon={isPositive ? <TrendingUp /> : <TrendingDown />}
                          label={`${isPositive ? '+' : ''}${stock.change.toFixed(2)} (${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%)`}
                          color={isPositive ? 'success' : 'error'}
                          sx={{ fontWeight: 'medium', fontSize: '0.9rem' }}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => router.push(`/portfolio/add-stock?symbol=${stock.symbol}`)}
                      >
                        Add to Portfolio
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<NotificationAdd />}
                        onClick={() => router.push('/alerts')}
                      >
                        Create Alert
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ) : null}
            </CardContent>
          </Card>

          {/* Key Statistics */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Key Statistics
              </Typography>
              <Divider sx={{ mb: 3 }} />
              {loading ? (
                <Grid container spacing={3}>
                  {[...Array(6)].map((_, i) => (
                    <Grid item xs={6} sm={4} key={i}>
                      <Skeleton width="50%" height={20} />
                      <Skeleton width="70%" height={32} />
                    </Grid>
                  ))}
                </Grid>
              ) : stock ? (
                <Grid container spacing={3}>
                  <Grid item xs={6} sm={4}>
                    <StatItem
                      label="Market Cap"
                      value={stock.marketCap > 0 ? formatMarketCap(stock.marketCap) : 'N/A'}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <StatItem
                      label="Volume"
                      value={stock.volume > 0 ? formatVolume(stock.volume) : 'N/A'}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <StatItem
                      label="52-Week High"
                      value={stock.high52Week > 0 ? `$${stock.high52Week.toFixed(2)}` : 'N/A'}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <StatItem
                      label="52-Week Low"
                      value={stock.low52Week > 0 ? `$${stock.low52Week.toFixed(2)}` : 'N/A'}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <StatItem
                      label="P/E Ratio"
                      value={stock.peRatio > 0 ? stock.peRatio.toFixed(1) : 'N/A'}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <StatItem
                      label="Dividend Yield"
                      value={stock.dividendYield > 0 ? `${stock.dividendYield.toFixed(2)}%` : 'N/A'}
                    />
                  </Grid>
                </Grid>
              ) : null}
            </CardContent>
          </Card>
        </Container>
      </Layout>
    </>
  );
};

export default StockDetailsPage;
