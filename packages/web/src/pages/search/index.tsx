import { useState, useEffect, useCallback } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  Card,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import stockService from '@/services/stockService';
import { SearchResult } from '@/types';

let debounceTimer: ReturnType<typeof setTimeout>;

const SearchPage: NextPage = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await stockService.searchStocks(q.trim());
      setResults(data);
      setSearched(true);
    } catch (e: any) {
      setError(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(val), 400);
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(`/stocks/${result.symbol}`);
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Head>
        <title>Search - Finora</title>
        <meta name="description" content="Search for stocks and add them to your portfolio" />
      </Head>

      <Layout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Stock Search
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Search for stocks by symbol or company name
            </Typography>
          </Box>

          <TextField
            fullWidth
            value={query}
            onChange={handleQueryChange}
            placeholder="Search by symbol or company name (e.g. AAPL, Apple)"
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {loading ? <CircularProgress size={20} /> : <SearchIcon />}
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!searched && !loading && query.length < 2 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Type at least 2 characters to search
              </Typography>
            </Box>
          )}

          {searched && results.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" color="text.secondary">
                No results found for "{query}"
              </Typography>
            </Box>
          )}

          {results.length > 0 && (
            <Card>
              <List disablePadding>
                {results.map((result, idx) => (
                  <ListItem key={result.symbol} disablePadding divider={idx < results.length - 1}>
                    <ListItemButton onClick={() => handleResultClick(result)} sx={{ py: 1.5 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {result.symbol}
                            </Typography>
                            <Typography variant="body1">{result.name}</Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            {result.exchange && (
                              <Chip label={result.exchange} size="small" variant="outlined" />
                            )}
                            {result.type && (
                              <Chip label={result.type} size="small" variant="outlined" />
                            )}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Card>
          )}
        </Container>
      </Layout>
    </>
  );
};

export default SearchPage;
