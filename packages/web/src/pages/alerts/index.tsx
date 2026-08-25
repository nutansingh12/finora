import { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Skeleton,
  Divider,
} from '@mui/material';
import { Add, Delete, Notifications, NotificationsOff } from '@mui/icons-material';
import { toast } from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import apiService from '@/services/api';

interface AlertItem {
  id: string;
  symbol: string;
  type: string;
  condition: 'above' | 'below';
  value: number;
  isActive: boolean;
  createdAt: string;
}

const AlertsPage: NextPage = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAlerts();
    }
  }, [isAuthenticated]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const resp = await apiService.get<any>('/alerts');
      if (resp.success) {
        const items = (resp.data?.alerts || resp.data || []).map((a: any) => ({
          id: a.id,
          symbol: a.stock_symbol || a.symbol || '',
          type: a.alert_type || a.type || 'price_below',
          condition: (a.alert_type?.includes('above') ? 'above' : 'below') as 'above' | 'below',
          value: Number(a.target_price ?? a.threshold ?? a.condition ?? 0),
          isActive: !!a.is_active,
          createdAt: a.created_at || a.createdAt || '',
        }));
        setAlerts(items);
      }
    } catch (e: any) {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const toggleAlert = async (alertId: string) => {
    try {
      await apiService.patch(`/alerts/${alertId}/toggle`);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isActive: !a.isActive } : a))
      );
    } catch {
      toast.error('Failed to toggle alert');
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      await apiService.delete(`/alerts/${alertId}`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast.success('Alert deleted');
    } catch {
      toast.error('Failed to delete alert');
    }
  };

  const handleCreate = async () => {
    if (!symbol.trim() || !targetPrice || Number(targetPrice) <= 0) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sym = symbol.trim().toUpperCase();
      const quoteResp = await apiService.get<any>(`/search/quote/${sym}`);
      const stockId = quoteResp?.data?.stock?.id;
      if (!stockId) {
        setCreateError('Could not resolve stock symbol');
        setCreating(false);
        return;
      }
      const resp = await apiService.post<any>('/alerts', {
        stockId,
        alertType: 'price_below',
        targetPrice: Number(targetPrice),
      });
      if (resp.success) {
        toast.success('Alert created');
        setCreateOpen(false);
        setSymbol('');
        setTargetPrice('');
        loadAlerts();
      } else {
        setCreateError(resp.message || 'Failed to create alert');
      }
    } catch (e: any) {
      setCreateError(e?.message || 'Failed to create alert');
    } finally {
      setCreating(false);
    }
  };

  const formatDescription = (alert: AlertItem) => {
    const conditionText = alert.condition === 'above' ? 'rises above' : 'falls below';
    return `Alert when ${alert.symbol} ${conditionText} $${alert.value.toFixed(2)}`;
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Head>
        <title>Alerts - Finora</title>
        <meta name="description" content="Manage your stock price alerts" />
      </Head>

      <Layout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Price Alerts
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Get notified when stocks hit your target prices
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateOpen(true)}
            >
              New Alert
            </Button>
          </Box>

          <Card>
            <CardContent sx={{ p: 0 }}>
              {loading ? (
                <List>
                  {[...Array(4)].map((_, i) => (
                    <ListItem key={i} divider>
                      <ListItemText
                        primary={<Skeleton width="30%" />}
                        secondary={<Skeleton width="60%" />}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : alerts.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Notifications sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No price alerts set
                  </Typography>
                  <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                    Create your first alert to get notified when a stock hits your target price
                  </Typography>
                  <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
                    Create Alert
                  </Button>
                </Box>
              ) : (
                <List disablePadding>
                  {alerts.map((alert, idx) => (
                    <Box key={alert.id}>
                      {idx > 0 && <Divider />}
                      <ListItem
                        sx={{
                          py: 2,
                          opacity: alert.isActive ? 1 : 0.6,
                        }}
                      >
                        <Box sx={{ mr: 2 }}>
                          {alert.isActive ? (
                            <Notifications color="primary" />
                          ) : (
                            <NotificationsOff color="disabled" />
                          )}
                        </Box>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" fontWeight="medium">
                                {alert.symbol}
                              </Typography>
                              <Chip
                                label={alert.condition === 'above' ? 'Above' : 'Below'}
                                size="small"
                                color={alert.condition === 'above' ? 'success' : 'error'}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={formatDescription(alert)}
                        />
                        <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Switch
                            checked={alert.isActive}
                            onChange={() => toggleAlert(alert.id)}
                            size="small"
                          />
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => deleteAlert(alert.id)}
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </Box>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Container>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="create alert"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setCreateOpen(true)}
        >
          <Add />
        </Fab>

        {/* Create Alert Dialog */}
        <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setCreateError(null); }} maxWidth="sm" fullWidth>
          <DialogTitle>Create Price Alert</DialogTitle>
          <DialogContent>
            {createError && (
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                {createError}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Stock Symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. AAPL"
              sx={{ mt: 1, mb: 2 }}
              autoFocus
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
            <TextField
              fullWidth
              label="Target Price (alert when price falls below)"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              helperText="You'll be notified when the price drops below this value"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setCreateOpen(false); setCreateError(null); }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={creating || !symbol.trim() || !targetPrice || Number(targetPrice) <= 0}
            >
              {creating ? 'Creating…' : 'Create Alert'}
            </Button>
          </DialogActions>
        </Dialog>
      </Layout>
    </>
  );
};

export default AlertsPage;
