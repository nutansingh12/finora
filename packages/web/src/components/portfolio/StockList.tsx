import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Skeleton,
  Avatar,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  MoreVert,
} from '@mui/icons-material';

import { UserStock } from '@/types';

interface StockListProps {
  stocks: UserStock[];
  isLoading: boolean;
  compact?: boolean;
  onStockClick?: (stock: UserStock) => void;
}

const StockList = ({ stocks, isLoading, compact = false, onStockClick }: StockListProps) => {
  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp color="success" fontSize="small" />;
    if (value < 0) return <TrendingDown color="error" fontSize="small" />;
    return <TrendingFlat color="disabled" fontSize="small" />;
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

  if (isLoading) {
    return (
      <TableContainer component={Paper} elevation={0}>
        <Table size={compact ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>Stock</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Change</TableCell>
              {!compact && <TableCell align="right">Holdings</TableCell>}
              {!compact && <TableCell align="right">Value</TableCell>}
              {!compact && <TableCell align="right">Return</TableCell>}
              {!compact && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(compact ? 5 : 10)].map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Skeleton variant="circular" width={32} height={32} sx={{ mr: 2 }} />
                    <Box>
                      <Skeleton variant="text" width={60} height={20} />
                      <Skeleton variant="text" width={100} height={16} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Skeleton variant="text" width={60} height={20} />
                </TableCell>
                <TableCell align="right">
                  <Skeleton variant="text" width={60} height={20} />
                </TableCell>
                {!compact && (
                  <>
                    <TableCell align="right">
                      <Skeleton variant="text" width={60} height={20} />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton variant="text" width={80} height={20} />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton variant="text" width={60} height={20} />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton variant="circular" width={24} height={24} />
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (stocks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No stocks in your portfolio
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add some stocks to start tracking your investments
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0}>
      <Table size={compact ? 'small' : 'medium'}>
        <TableHead>
          <TableRow>
            <TableCell>Stock</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell align="right">Change</TableCell>
            {!compact && <TableCell align="right">Holdings</TableCell>}
            {!compact && <TableCell align="right">Value</TableCell>}
            {!compact && <TableCell align="right">Return</TableCell>}
            {!compact && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {stocks.map((stock) => (
            <TableRow
              key={stock.id}
              hover
              sx={{ 
                cursor: onStockClick ? 'pointer' : 'default',
                '&:hover': {
                  backgroundColor: onStockClick ? 'action.hover' : 'transparent',
                },
              }}
              onClick={() => onStockClick?.(stock)}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      mr: 2,
                      bgcolor: 'primary.main',
                      fontSize: '0.875rem',
                    }}
                  >
                    {stock.symbol.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center', gap: 1 }}>
                      {stock.symbol}
                      {/* Show alert badge when currentPrice <= cutoff/target */}
                      {(() => {
                        const price = Number((stock as any).currentPrice ?? 0);
                        const cutoff = Number(((stock as any).cutoffPrice ?? (stock as any).targetPrice ?? 0));
                        return Number.isFinite(price) && Number.isFinite(cutoff) && cutoff > 0 && price <= cutoff;
                      })() && (
                        <Chip
                          label="🚨 Alert"
                          color="error"
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.675rem' }}
                        />
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stock.stock?.name || 'Unknown Company'}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {formatCurrency(stock.currentPrice)}
                </Typography>
              </TableCell>
              
              <TableCell align="right">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  {getTrendIcon(stock.stock?.change || 0)}
                  <Box sx={{ ml: 0.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ 
                        color: getTrendColor(stock.stock?.change || 0),
                        fontWeight: 'medium'
                      }}
                    >
                      {formatPercentage(stock.stock?.changePercent || 0)}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>

              {!compact && (
                <>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {stock.quantity.toLocaleString()} shares
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Avg: {formatCurrency(stock.averagePrice)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {formatCurrency(stock.totalValue)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ 
                          color: getTrendColor(stock.gainLoss),
                          fontWeight: 'medium'
                        }}
                      >
                        {stock.gainLoss >= 0 ? '+' : ''}
                        {formatCurrency(stock.gainLoss)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ 
                          color: getTrendColor(stock.gainLossPercent),
                        }}
                      >
                        {formatPercentage(stock.gainLossPercent)}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell align="right">
                    <IconButton size="small">
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StockList;
