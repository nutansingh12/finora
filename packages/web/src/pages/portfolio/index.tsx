import { useEffect, useState, useCallback, useMemo } from 'react';
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
  Tabs,
  Tab,
  Fab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add, FileDownload, BarChart, Edit, Delete, CreateNewFolder, Refresh } from '@mui/icons-material';

import { useAuthStore } from '@/store/authStore';
import { usePortfolioStore } from '@/store/portfolioStore';
import Layout from '@/components/Layout';
import StockList from '@/components/portfolio/StockList';
import PerformanceChart from '@/components/charts/PerformanceChart';

const PERIODS: Array<{ label: string; period: string; interval: string }> = [
  { label: '1D', period: '1d',  interval: '5m'  },
  { label: '5D', period: '5d',  interval: '60m' },
  { label: '1M', period: '1mo', interval: '1d'  },
  { label: '3M', period: '3mo', interval: '1d'  },
  { label: '6M', period: '6mo', interval: '1d'  },
  { label: '1Y', period: '1y',  interval: '1d'  },
  { label: '2Y', period: '2y',  interval: '1wk' },
];

interface ChartDialogProps {
  chartModal: { open: boolean; symbol: string; name: string } | null;
  chartPeriod: string;
  onClose: () => void;
  onPeriodChange: (p: string) => void;
}

const ChartDialog = ({ chartModal, chartPeriod, onClose, onPeriodChange }: ChartDialogProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const activePeriod = PERIODS.find(p => p.period === chartPeriod) || PERIODS[5];
  const patchStockPrice = usePortfolioStore(s => s.patchStockPrice);

  useEffect(() => {
    if (!chartModal?.open) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('finora_token') : null;
    let cancelled = false;
    setLoading(true);
    setData([]);
    fetch(
      `${apiBase}/market/stock/${chartModal.symbol}/historical?period=${activePeriod.period}&interval=${activePeriod.interval}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        const rows = (json?.data?.prices || json?.data?.historical || [])
          .map((r: any) => ({ date: r.date, close: Number(r.close) || 0 }));
        setData(rows);
        // Update the watchlist price immediately from the freshest data point
        const latestClose = json?.data?.latestClose;
        if (latestClose && chartModal.symbol) {
          patchStockPrice(chartModal.symbol, latestClose);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [chartModal?.open, chartModal?.symbol, chartPeriod, patchStockPrice]);

  if (!chartModal?.open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', width: '92%', maxWidth: 960, borderRadius: 12, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{chartModal.name || chartModal.symbol} ({chartModal.symbol})</Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {PERIODS.map(p => (
              <Button key={p.period} size="small"
                variant={chartPeriod === p.period ? 'contained' : 'outlined'}
                onClick={(e) => { e.stopPropagation(); onPeriodChange(p.period); }}
              >{p.label}</Button>
            ))}
          </Box>
        </Box>
        <div style={{ width: '100%', height: 400 }}>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="text.secondary">Loading chart…</Typography>
            </Box>
          ) : data.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="text.secondary">No data available for this period</Typography>
            </Box>
          ) : (
            <PerformanceChart
              data={data.map((d, i) => {
                const prev = i > 0 ? data[i - 1].close : d.close;
                const change = d.close - prev;
                const changePercent = prev ? (change / prev) * 100 : 0;
                return { date: d.date, value: d.close, change, changePercent };
              })}
              isLoading={false}
              height={380}
              period={activePeriod.period}
            />
          )}
        </div>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button onClick={onClose}>Close</Button>
        </Box>
      </div>
    </div>
  );
};

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
    stocks,
    groups,
    isLoading: portfolioLoading,
    fetchPortfolio,
    silentRefreshStocks,
    createGroup,
    updateGroup,
    deleteGroup,
    removeStock,
    updateStock,
    moveStockToGroup,
  } = usePortfolioStore();

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [groupForm, setGroupForm] = useState<{ id?: string; name: string; description: string; color: string } | null>(null);
  const [groupSaving, setGroupSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chartModal, setChartModal] = useState<{ open: boolean; symbol: string; name: string } | null>(null);
  const [filterCutoffPct, setFilterCutoffPct] = useState<number[]>([-100, 1000]);
  const [filter52wPct, setFilter52wPct] = useState<number[]>([0, 1000]);
  const [filterSortBy, setFilterSortBy] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('sort');
      if (p) return p;
    }
    return 'symbol';
  });
  const [chartPeriod, setChartPeriod] = useState('1y');
  const [tabValue, setTabValue] = useState(0);

  const handleChartClose = useCallback(() => setChartModal(null), []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch portfolio data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchPortfolio().then(() => setLastUpdated(new Date())).catch(() => {});
    }
  }, [isAuthenticated, fetchPortfolio]);

  // Auto-refresh prices every 5 minutes in the background
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      silentRefreshStocks().then(() => setLastUpdated(new Date())).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, silentRefreshStocks]);

  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  // Only show the loading skeleton on the very first fetch (stocks list is empty)
  const showSkeleton = portfolioLoading && stocks.length === 0;

  // System Alerts view
  const alertsStocks = useMemo(() => stocks.filter((s: any) => {
    const price = Number(s.current_price ?? s.currentPrice ?? 0);
    const cutoff = Number(s.cutoff_price ?? s.cutoffPrice ?? s.target_price ?? s.targetPrice ?? 0);
    return Number.isFinite(price) && Number.isFinite(cutoff) && cutoff > 0 && price <= cutoff;
  }), [stocks]);

  // By Groups view
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const groupCounts = useMemo<Record<string, number>>(() => stocks.reduce((acc: Record<string, number>, s: any) => {
    const gid = s.groupId || '';
    acc[gid] = (acc[gid] || 0) + 1;
    return acc;
  }, {}), [stocks]);
  const groupedStocks = useMemo(() =>
    activeGroupId ? stocks.filter((s: any) => s.groupId === activeGroupId) : stocks,
    [stocks, activeGroupId]
  );

  // Memoized sort+filter — only recomputes when inputs change, not on every render
  const sortAndFilter = useCallback((list: typeof stocks) => {
    return list
      .filter((s: any) => {
        const current = Number(s.current_price ?? s.currentPrice ?? 0);
        const cutoff = Number(s.cutoff_price ?? s.cutoffPrice ?? s.target_price ?? s.targetPrice ?? 0);
        const low52 = Number(s.week_52_low ?? 0);
        if (cutoff > 0 && current > 0) {
          const pct = ((current - cutoff) / cutoff) * 100;
          if (pct < filterCutoffPct[0]) return false;
          if (filterCutoffPct[1] < 1000 && pct > filterCutoffPct[1]) return false;
        }
        if (low52 > 0 && current > 0) {
          const pct = ((current - low52) / low52) * 100;
          if (pct < filter52wPct[0]) return false;
          if (filter52wPct[1] < 1000 && pct > filter52wPct[1]) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const sym = (s: any) => (s.symbol ?? '');
        const aPrice = Number(a.current_price ?? a.currentPrice ?? 0);
        const bPrice = Number(b.current_price ?? b.currentPrice ?? 0);
        const aCutoff = Number(a.cutoff_price ?? a.cutoffPrice ?? a.target_price ?? a.targetPrice ?? 0);
        const bCutoff = Number(b.cutoff_price ?? b.cutoffPrice ?? b.target_price ?? b.targetPrice ?? 0);
        const aLow52 = Number(a.week_52_low ?? 0);
        const bLow52 = Number(b.week_52_low ?? 0);
        if (filterSortBy === 'cutoffPct') {
          const hasA = aCutoff > 0 && aPrice > 0;
          const hasB = bCutoff > 0 && bPrice > 0;
          if (!hasA && !hasB) return sym(a).localeCompare(sym(b));
          if (!hasA) return 1; if (!hasB) return -1;
          return ((aPrice - aCutoff) / aCutoff) - ((bPrice - bCutoff) / bCutoff);
        }
        if (filterSortBy === 'low52Pct') {
          const hasA = aLow52 > 0 && aPrice > 0;
          const hasB = bLow52 > 0 && bPrice > 0;
          if (!hasA && !hasB) return sym(a).localeCompare(sym(b));
          if (!hasA) return 1; if (!hasB) return -1;
          return ((aPrice - aLow52) / aLow52) - ((bPrice - bLow52) / bLow52);
        }
        if (filterSortBy === 'price') return bPrice - aPrice;
        if (filterSortBy === 'recentlyAdded') {
          return new Date((b as any).added_at ?? 0).getTime() - new Date((a as any).added_at ?? 0).getTime();
        }
        return sym(a).localeCompare(sym(b));
      });
  }, [filterSortBy, filterCutoffPct, filter52wPct]);

  const filteredAll     = useMemo(() => sortAndFilter(stocks),       [sortAndFilter, stocks]);
  const filteredAlerts  = useMemo(() => sortAndFilter(alertsStocks), [sortAndFilter, alertsStocks]);
  const filteredGrouped = useMemo(() => sortAndFilter(groupedStocks),[sortAndFilter, groupedStocks]);

  // Stable callbacks so StockList doesn't re-render on every parent render
  const handleStockClick   = useCallback((stock: any) => setChartModal({ open: true, symbol: stock.symbol ?? '', name: stock.name || '' }), []);
  const handleUpdateCutoff = useCallback(async (stock: any, newCutoff: number) => {
    try { await updateStock(stock.id, { cutoffPrice: newCutoff } as any); } catch {}
  }, [updateStock]);
  const handleDeleteStock  = useCallback(async (stock: any) => {
    if (!stock.id) { fetchPortfolio(); return; }
    if (!confirm(`Remove ${stock.symbol} from watchlist?`)) return;
    try { await removeStock(stock.id); } catch {}
  }, [removeStock, fetchPortfolio]);
  const handleMoveToGroup  = useCallback(async (stock: any, groupId: string | null) => {
    try { await moveStockToGroup(stock.id, groupId); } catch {}
  }, [moveStockToGroup]);



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
                Watchlist
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Monitor stocks and get alerted when they hit your buy targets
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <input id="import-file-input" type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.append('file', file);
                const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
                const token = typeof window !== 'undefined' ? localStorage.getItem('finora_token') : null;
                try {
                  const resp = await fetch(`${apiBase}/portfolio/import`, {
                    method: 'POST',
                    body: form,
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  });
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
                const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
                const token = typeof window !== 'undefined' ? localStorage.getItem('finora_token') : null;
                try {
                  const resp = await fetch(`${apiBase}/portfolio/export`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  });
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
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  disabled={refreshing}
                  onClick={async () => {
                    setRefreshing(true);
                    try {
                      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
                      const token = typeof window !== 'undefined' ? localStorage.getItem('finora_token') : null;
                      await fetch(`${apiBase}/stocks/prices/refresh?limit=100&staleMinutes=0`, {
                        method: 'POST',
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      });
                      await fetchPortfolio();
                      setLastUpdated(new Date());
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                >
                  {refreshing ? 'Refreshing…' : 'Refresh Prices'}
                </Button>
                {lastUpdated && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
                    Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                )}
              </Box>
              <Button
                variant="outlined"
                startIcon={<CreateNewFolder />}
                onClick={() => setGroupsOpen(true)}
              >
                Groups
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
                Add to Watchlist
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {/* Tabs for different views */}
            <Grid item xs={12}>
              <Card>
                {/* Filter/sort bar always visible above tabs */}
                <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Sort by</InputLabel>
                    <Select value={filterSortBy} label="Sort by" onChange={(e) => setFilterSortBy(e.target.value)}>
                      <MenuItem value="symbol">Symbol (A–Z)</MenuItem>
                      <MenuItem value="recentlyAdded">Recently Added</MenuItem>
                      <MenuItem value="price">Current Price (high→low)</MenuItem>
                      <MenuItem value="cutoffPct">% above Cutoff (low→high)</MenuItem>
                      <MenuItem value="low52Pct">% above 52W Low (low→high)</MenuItem>
                    </Select>
                  </FormControl>
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography variant="caption" color="text.secondary">
                      % above Cutoff: {filterCutoffPct[0]}% to {filterCutoffPct[1]}%
                    </Typography>
                    <Slider
                      value={filterCutoffPct}
                      onChange={(_, v) => setFilterCutoffPct(v as number[])}
                      min={-100} max={1000} step={5}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${v}%`}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography variant="caption" color="text.secondary">
                      % above 52W Low: {filter52wPct[0]}% to {filter52wPct[1]}%
                    </Typography>
                    <Slider
                      value={filter52wPct}
                      onChange={(_, v) => setFilter52wPct(v as number[])}
                      min={0} max={1000} step={5}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${v}%`}
                      size="small"
                    />
                  </Box>
                </Box>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={tabValue} onChange={handleTabChange} aria-label="portfolio tabs">
                    <Tab label="All" />
                    <Tab label={`🔴 Buy Alerts${alertsStocks.length > 0 ? ` (${alertsStocks.length})` : ''}`} />
                    <Tab label="By Group" />
                  </Tabs>
                </Box>

                <TabPanel value={tabValue} index={0}>
                  <StockList
                    stocks={filteredAll}
                    isLoading={showSkeleton}
                    groups={groups}
                    onStockClick={handleStockClick}
                    onUpdateCutoff={handleUpdateCutoff}
                    onDeleteStock={handleDeleteStock}
                    onMoveToGroup={handleMoveToGroup}
                  />
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <StockList
                    stocks={filteredAlerts}
                    isLoading={showSkeleton}
                    groups={groups}
                    onStockClick={handleStockClick}
                    onUpdateCutoff={handleUpdateCutoff}
                    onDeleteStock={handleDeleteStock}
                    onMoveToGroup={handleMoveToGroup}
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
                    stocks={filteredGrouped}
                    isLoading={showSkeleton}
                    groups={groups}
                    onStockClick={handleStockClick}
                    onUpdateCutoff={handleUpdateCutoff}
                    onDeleteStock={handleDeleteStock}
                    onMoveToGroup={handleMoveToGroup}
                  />
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

        <ChartDialog
          chartModal={chartModal}
          chartPeriod={chartPeriod}
          onClose={handleChartClose}
          onPeriodChange={setChartPeriod}
        />

        {/* Stock Groups Management Dialog */}
        <Dialog open={groupsOpen} onClose={() => { setGroupsOpen(false); setGroupForm(null); }} maxWidth="sm" fullWidth>
          <DialogTitle>Manage Groups</DialogTitle>
          <DialogContent>
            {groupForm ? (
              <Box sx={{ pt: 1 }}>
                <TextField
                  fullWidth
                  label="Group Name"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  sx={{ mb: 2 }}
                  autoFocus
                />
                <TextField
                  fullWidth
                  label="Description (optional)"
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Color (optional)"
                  value={groupForm.color}
                  onChange={(e) => setGroupForm({ ...groupForm, color: e.target.value })}
                  placeholder="e.g. #4CAF50 or blue"
                  helperText="Hex color or color name"
                />
              </Box>
            ) : (
              <Box>
                <Button
                  startIcon={<Add />}
                  onClick={() => setGroupForm({ name: '', description: '', color: '' })}
                  sx={{ mb: 2 }}
                >
                  New Group
                </Button>
                {groups.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No groups yet. Create one to organize your stocks.
                  </Typography>
                ) : (
                  <List disablePadding>
                    {groups.map((g) => (
                      <ListItem key={g.id} disablePadding sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={g.name}
                          secondary={g.description}
                        />
                        <ListItemSecondaryAction>
                          <IconButton size="small" onClick={() => setGroupForm({ id: g.id, name: g.name, description: g.description || '', color: g.color || '' })}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={async () => {
                            if (!confirm(`Delete group "${g.name}"?`)) return;
                            try { await deleteGroup(g.id); } catch {}
                          }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            {groupForm ? (
              <>
                <Button onClick={() => setGroupForm(null)}>Cancel</Button>
                <Button
                  variant="contained"
                  disabled={groupSaving || !groupForm.name.trim()}
                  onClick={async () => {
                    setGroupSaving(true);
                    try {
                      if (groupForm.id) {
                        await updateGroup(groupForm.id, { name: groupForm.name, description: groupForm.description, color: groupForm.color });
                      } else {
                        await createGroup({ name: groupForm.name, description: groupForm.description, color: groupForm.color });
                      }
                      setGroupForm(null);
                    } catch {} finally {
                      setGroupSaving(false);
                    }
                  }}
                >
                  {groupSaving ? 'Saving…' : groupForm.id ? 'Save' : 'Create'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setGroupsOpen(false)}>Close</Button>
            )}
          </DialogActions>
        </Dialog>
      </Layout>
    </>
  );
};

export default PortfolioPage;
