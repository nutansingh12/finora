import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Skeleton,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
} from '@mui/icons-material';

import { Portfolio } from '@/types';

interface PortfolioSummaryCardProps {
  portfolio: Portfolio | null;
  isLoading: boolean;
}

const PortfolioSummaryCard = ({ portfolio, isLoading }: PortfolioSummaryCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="80%" height={40} />
              <Skeleton variant="text" width="40%" height={20} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="80%" height={40} />
              <Skeleton variant="text" width="40%" height={20} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="80%" height={40} />
              <Skeleton variant="text" width="40%" height={20} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="80%" height={40} />
              <Skeleton variant="text" width="40%" height={20} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }

  if (!portfolio) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Portfolio Summary
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No portfolio data available. Add some stocks to get started!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp color="success" />;
    if (value < 0) return <TrendingDown color="error" />;
    return <TrendingFlat color="disabled" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'success.main';
    if (value < 0) return 'error.main';
    return 'text.secondary';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            Portfolio Summary
          </Typography>
          <Chip
            label={`${portfolio.stocks?.length || 0} Stocks`}
            variant="outlined"
            size="small"
          />
        </Box>

        <Grid container spacing={3}>
          {/* Total Value */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Value
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(portfolio.totalValue)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {getTrendIcon(portfolio.dayChange)}
                <Typography
                  variant="body2"
                  sx={{ 
                    ml: 0.5, 
                    color: getTrendColor(portfolio.dayChange),
                    fontWeight: 'medium'
                  }}
                >
                  {formatCurrency(Math.abs(portfolio.dayChange))} today
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Total Gain/Loss */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Return
              </Typography>
              <Typography 
                variant="h4" 
                component="div" 
                sx={{ 
                  fontWeight: 'bold',
                  color: getTrendColor(portfolio.totalGainLoss)
                }}
              >
                {portfolio.totalGainLoss >= 0 ? '+' : ''}
                {formatCurrency(portfolio.totalGainLoss)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {getTrendIcon(portfolio.totalGainLossPercent)}
                <Typography
                  variant="body2"
                  sx={{ 
                    ml: 0.5, 
                    color: getTrendColor(portfolio.totalGainLossPercent),
                    fontWeight: 'medium'
                  }}
                >
                  {formatPercentage(portfolio.totalGainLossPercent)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Day Change */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Day Change
              </Typography>
              <Typography 
                variant="h4" 
                component="div" 
                sx={{ 
                  fontWeight: 'bold',
                  color: getTrendColor(portfolio.dayChange)
                }}
              >
                {portfolio.dayChange >= 0 ? '+' : ''}
                {formatCurrency(portfolio.dayChange)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {getTrendIcon(portfolio.dayChangePercent)}
                <Typography
                  variant="body2"
                  sx={{ 
                    ml: 0.5, 
                    color: getTrendColor(portfolio.dayChangePercent),
                    fontWeight: 'medium'
                  }}
                >
                  {formatPercentage(portfolio.dayChangePercent)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Number of Holdings */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Holdings
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {portfolio.stocks?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {portfolio.groups?.length || 0} groups
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Performance Indicators */}
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Best Performer
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {portfolio.stocks?.length > 0 
                    ? portfolio.stocks.reduce((best, stock) => 
                        stock.gainLossPercent > best.gainLossPercent ? stock : best
                      ).symbol
                    : 'N/A'
                  }
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Worst Performer
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {portfolio.stocks?.length > 0 
                    ? portfolio.stocks.reduce((worst, stock) => 
                        stock.gainLossPercent < worst.gainLossPercent ? stock : worst
                      ).symbol
                    : 'N/A'
                  }
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Largest Holding
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {portfolio.stocks?.length > 0 
                    ? portfolio.stocks.reduce((largest, stock) => 
                        stock.totalValue > largest.totalValue ? stock : largest
                      ).symbol
                    : 'N/A'
                  }
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Diversity Score
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {portfolio.stocks?.length > 0 
                    ? Math.min(100, (portfolio.stocks.length * 10)).toFixed(0)
                    : '0'
                  }%
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PortfolioSummaryCard;
