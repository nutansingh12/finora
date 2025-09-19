import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Chip,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
} from '@mui/icons-material';

import { MarketSummary as MarketSummaryType } from '@/types';
import stockService from '@/services/stockService';

const MarketSummary = () => {
  const [marketData, setMarketData] = useState<MarketSummaryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await stockService.getMarketSummary();
        setMarketData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch market data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();
    
    // Refresh market data every 5 minutes
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp color="success" fontSize="small" />;
    if (change < 0) return <TrendingDown color="error" fontSize="small" />;
    return <TrendingFlat color="disabled" fontSize="small" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'success.main';
    if (change < 0) return 'error.main';
    return 'text.secondary';
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatPercentage = (percent: number) => {
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Market Summary
          </Typography>
          <List>
            {[...Array(4)].map((_, index) => (
              <ListItem key={index} divider>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Skeleton variant="text" width={60} height={20} />
                    <Skeleton variant="text" width={50} height={16} />
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Market Summary
          </Typography>
          <Alert severity="error">
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Market Summary
          </Typography>
          <Chip
            label="Live"
            color="success"
            size="small"
            variant="outlined"
          />
        </Box>

        {marketData.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No market data available
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {marketData.map((market, index) => (
              <ListItem
                key={market.symbol}
                divider={index < marketData.length - 1}
                sx={{ px: 0 }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {market.name}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {market.symbol}
                    </Typography>
                  }
                />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {formatPrice(market.price)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {getTrendIcon(market.change)}
                    <Typography
                      variant="body2"
                      sx={{
                        ml: 0.5,
                        color: getTrendColor(market.change),
                        fontWeight: 'medium',
                      }}
                    >
                      {formatPercentage(market.changePercent)}
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        )}

        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {new Date().toLocaleTimeString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MarketSummary;
