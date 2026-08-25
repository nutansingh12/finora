import { useState, useEffect, useRef } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  MenuItem,
  Divider,
  Chip,
  Autocomplete,
} from '@mui/material';
import { ArrowBack, Search, TrendingDown, TrendingUp } from '@mui/icons-material';
import { toast } from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';
import { usePortfolioStore } from '@/store/portfolioStore';
import Layout from '@/components/Layout';
import apiService from '@/services/api';

interface QuoteData {
  stockId: string;
  name: string;
  price: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  change: number;
  changePercent: number;
}

interface Suggestion {
  symbol: string;
  name: string;
  exchange?: string;
}

const AddStockPage: NextPage = () => {
  const router = useRouter();
  const { symbol: prefilledSymbol } = router.query as { symbol?: string };
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { addStock, groups, fetchGroups } = usePortfolioStore();

  const [symbol, setSymbol] = useState(prefilledSymbol?.toUpperCase() || '');
  const [inputValue, setInputValue] = useState(prefilledSymbol?.toUpperCase() || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [groupId, setGroupId] = useState('');
  const [notes, setNotes] = useState('');
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) fetchGroups().catch(() => {});
  }, [isAuthenticated, fetchGroups]);

  // Auto-lookup when symbol is pre-filled
  useEffect(() => {
    if (prefilledSymbol) {
      const upper = prefilledSymbol.toUpperCase();
      setSymbol(upper);
      setInputValue(upper);
      lookupSymbol(upper);
    }
  }, [prefilledSymbol]);

  const lookupSymbol = async (sym: string) => {
    if (sym.length < 1) { setQuote(null); setLookupError(null); return; }
    setLookupLoading(true);
    setLookupError(null);
    setQuote(null);
    try {
      const resp = await apiService.get<any>(`/search/quote/${sym}`);
      if (!resp.success || !resp.data) throw new Error(resp.message || 'Symbol not found');
      const s = resp.data.stock || {};
      const q = resp.data.quote || {};
      const low52 = Number(q.fiftyTwoWeekLow) || 0;
      setQuote({
        stockId: s.id,
        name: s.name || sym,
        price: Number(q.price) || 0,
        fiftyTwoWeekLow: low52,
        fiftyTwoWeekHigh: Number(q.fiftyTwoWeekHigh) || 0,
        change: Number(q.change) || 0,
        changePercent: Number(q.changePercent) || 0,
      });
      // Auto-fill target price with 52W low if not already set
      if (low52 > 0) setTargetPrice(low52.toFixed(2));
    } catch (e: any) {
      setLookupError('Symbol not found. Try a valid ticker like AAPL, TSLA, MSFT.');
    } finally {
      setLookupLoading(false);
    }
  };

  const fetchSuggestions = async (q: string) => {
    if (q.length < 1) { setSuggestions([]); return; }
    setSuggestionsLoading(true);
    try {
      const resp = await apiService.get<any>(`/search?q=${encodeURIComponent(q)}&limit=10`);
      if (resp.success && resp.data) {
        const items: Suggestion[] = (resp.data.suggestions || []).slice(0, 10);
        setSuggestions(items);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    clearTimeout(suggestDebounceRef.current);
    if (val.length >= 1) {
      suggestDebounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
    } else {
      setSuggestions([]);
    }
    // Reset quote if user clears or types new value
    if (!val) {
      setSymbol('');
      setQuote(null);
      setLookupError(null);
    }
  };

  const handleSymbolSelect = (sym: string) => {
    const upper = sym.toUpperCase();
    setSymbol(upper);
    setInputValue(upper);
    setSuggestions([]);
    clearTimeout(debounceRef.current);
    lookupSymbol(upper);
  };

  const handleSubmit = async () => {
    if (!symbol.trim()) { setError('Please enter a stock symbol'); return; }
    if (!quote) { setError('Please wait for the stock to be verified'); return; }
    const target = Number(targetPrice);
    if (!target || target <= 0) { setError('Please enter a valid target price'); return; }

    setSubmitting(true);
    setError(null);
    try {
      await addStock({
        symbol: symbol.trim().toUpperCase(),
        quantity: 0,
        averagePrice: quote.price,
        targetPrice: target,
        notes: notes || undefined,
        groupId: groupId || undefined,
      });
      toast.success(`${symbol.toUpperCase()} added to watchlist`);
      // Reset form so the user can add another stock without navigating away
      setSymbol('');
      setInputValue('');
      setQuote(null);
      setTargetPrice('');
      setNotes('');
      setGroupId('');
      setLookupError(null);
      setSuggestions([]);
    } catch (err: any) {
      setError(err.message || 'Failed to add stock');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) return null;

  const distanceToTarget = quote && Number(targetPrice) > 0
    ? ((quote.price - Number(targetPrice)) / Number(targetPrice)) * 100
    : null;

  const isBelowTarget = distanceToTarget !== null && distanceToTarget <= 0;
  const isNearTarget = distanceToTarget !== null && distanceToTarget > 0 && distanceToTarget <= 5;

  return (
    <>
      <Head>
        <title>Add to Watchlist - Finora</title>
      </Head>

      <Layout>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Button startIcon={<ArrowBack />} onClick={() => router.push('/portfolio?sort=recentlyAdded')} sx={{ mb: 3 }}>
            Back
          </Button>

          <Typography variant="h4" component="h1" gutterBottom>
            Add to Watchlist
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Track a stock and get alerted when it hits your buy target
          </Typography>

          <Card>
            <CardContent>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              {/* Symbol search with autocomplete */}
              <Autocomplete
                freeSolo
                options={suggestions}
                getOptionLabel={(opt) =>
                  typeof opt === 'string' ? opt : `${opt.symbol} — ${opt.name}`
                }
                filterOptions={(x) => x}
                loading={suggestionsLoading}
                inputValue={inputValue}
                onInputChange={(_, val, reason) => {
                  if (reason !== 'reset') handleInputChange(val.toUpperCase());
                }}
                onChange={(_, val) => {
                  if (val && typeof val !== 'string') {
                    handleSymbolSelect(val.symbol);
                  } else if (typeof val === 'string' && val) {
                    handleSymbolSelect(val);
                  }
                }}
                renderOption={(props, opt) => (
                  <li {...props} key={opt.symbol}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">{opt.symbol}</Typography>
                        <Typography variant="caption" color="text.secondary">{opt.name}</Typography>
                      </Box>
                      {opt.exchange && (
                        <Typography variant="caption" color="text.disabled" sx={{ alignSelf: 'center' }}>
                          {opt.exchange}
                        </Typography>
                      )}
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Stock Symbol or Name"
                    placeholder="e.g. AAPL, Tesla, MSFT"
                    autoFocus={!prefilledSymbol}
                    error={!!lookupError}
                    helperText={lookupError || 'Search by ticker or company name'}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {lookupLoading || suggestionsLoading ? <CircularProgress size={18} /> : <Search color="disabled" />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                sx={{ mb: 2 }}
              />

              {/* Stock info card */}
              {quote && (
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    borderRadius: 1,
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">{symbol}</Typography>
                      <Typography variant="body2" color="text.secondary">{quote.name}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" fontWeight="bold">${quote.price.toFixed(2)}</Typography>
                      <Typography
                        variant="body2"
                        color={quote.change >= 0 ? 'success.main' : 'error.main'}
                      >
                        {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TrendingDown fontSize="small" color="error" />
                      <Typography variant="body2" color="text.secondary">52W Low</Typography>
                      <Typography variant="body2" fontWeight="medium" color="error.main">
                        ${quote.fiftyTwoWeekLow.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TrendingUp fontSize="small" color="success" />
                      <Typography variant="body2" color="text.secondary">52W High</Typography>
                      <Typography variant="body2" fontWeight="medium" color="success.main">
                        ${quote.fiftyTwoWeekHigh.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Target Price */}
              <TextField
                fullWidth
                label="Target Buy Price ($)"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                helperText={
                  quote?.fiftyTwoWeekLow
                    ? `Pre-filled with 52W low ($${quote.fiftyTwoWeekLow.toFixed(2)}). You'll be alerted when price falls to or below this.`
                    : "You'll be alerted when the current price falls to or below this value"
                }
                sx={{ mb: 1.5 }}
              />

              {/* Status indicator */}
              {distanceToTarget !== null && (
                <Box sx={{ mb: 2 }}>
                  {isBelowTarget && (
                    <Chip
                      label={`🔴 Already ${Math.abs(distanceToTarget).toFixed(1)}% below target — buy signal active`}
                      color="error"
                      size="small"
                    />
                  )}
                  {isNearTarget && (
                    <Chip
                      label={`🟡 Only ${distanceToTarget.toFixed(1)}% above target — approaching buy zone`}
                      color="warning"
                      size="small"
                    />
                  )}
                  {!isBelowTarget && !isNearTarget && distanceToTarget !== null && (
                    <Chip
                      label={`🟢 ${distanceToTarget.toFixed(1)}% above target`}
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              )}

              {groups.length > 0 && (
                <TextField
                  fullWidth
                  select
                  label="Group (optional)"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="">No group</MenuItem>
                  {groups.map((g) => (
                    <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                fullWidth
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={2}
                placeholder="Why are you watching this stock?"
                sx={{ mb: 3 }}
              />

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={submitting || !quote || !targetPrice}
              >
                {submitting ? <CircularProgress size={24} color="inherit" /> : 'Add to Watchlist'}
              </Button>
            </CardContent>
          </Card>
        </Container>
      </Layout>
    </>
  );
};

export default AddStockPage;
