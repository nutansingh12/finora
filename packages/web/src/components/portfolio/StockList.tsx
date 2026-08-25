import { useState, useRef } from 'react';
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
  Skeleton,
  Avatar,
  Tooltip,
  IconButton,
  InputBase,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Notifications,
  Delete,
  Edit,
  OpenInNew,
  FolderOutlined,
} from '@mui/icons-material';

import { UserStock, StockGroup } from '@/types';

interface StockListProps {
  stocks: UserStock[];
  isLoading: boolean;
  compact?: boolean;
  groups?: StockGroup[];
  onStockClick?: (stock: UserStock) => void;
  onDeleteStock?: (stock: UserStock) => void;
  onUpdateCutoff?: (stock: UserStock, newCutoff: number) => Promise<void>;
  onMoveToGroup?: (stock: UserStock, groupId: string | null) => Promise<void>;
}

function fmt(value: number | null | undefined, prefix = '$') {
  const n = Number(value) || 0;
  return `${prefix}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(value: number | null | undefined, showSign = true) {
  const n = Number(value) || 0;
  const sign = showSign && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function getStatus(currentPrice: number, targetPrice: number | undefined | null) {
  if (!targetPrice || targetPrice <= 0) return null;
  const diff = ((currentPrice - targetPrice) / targetPrice) * 100;
  if (diff <= 0) return { label: 'ALERT', color: 'error' as const, diff };
  if (diff <= 5) return { label: 'NEAR', color: 'warning' as const, diff };
  return { label: 'ABOVE', color: 'success' as const, diff };
}

function LowCell({ price, currentPrice }: { price: number | null; currentPrice: number }) {
  if (!price || price <= 0) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const pct = currentPrice > 0 ? ((currentPrice - price) / price) * 100 : 0;
  return (
    <Box>
      <Typography variant="body2" fontWeight="medium">{fmt(price)}</Typography>
      <Typography variant="caption" color={pct <= 5 ? 'error.main' : pct <= 20 ? 'warning.main' : 'success.main'}>
        +{pct.toFixed(1)}%
      </Typography>
    </Box>
  );
}

const StockList = ({ stocks, isLoading, compact = false, groups = [], onStockClick, onDeleteStock, onUpdateCutoff, onMoveToGroup }: StockListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [groupMenuAnchor, setGroupMenuAnchor] = useState<null | HTMLElement>(null);
  const [groupMenuStock, setGroupMenuStock] = useState<UserStock | null>(null);
  const [movingGroupId, setMovingGroupId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const openGroupMenu = (e: React.MouseEvent<HTMLElement>, stock: UserStock) => {
    e.stopPropagation();
    setGroupMenuAnchor(e.currentTarget);
    setGroupMenuStock(stock);
  };

  const closeGroupMenu = () => {
    setGroupMenuAnchor(null);
    setGroupMenuStock(null);
  };

  const handleMoveToGroup = async (groupId: string | null) => {
    if (!groupMenuStock || !onMoveToGroup) return;
    const stock = groupMenuStock;
    closeGroupMenu();
    setMovingGroupId(stock.id);
    try { await onMoveToGroup(stock, groupId); } finally { setMovingGroupId(null); }
  };

  const startEdit = (stock: UserStock, currentCutoff: number | null) => {
    setEditingId(stock.id);
    setEditValue(currentCutoff != null && currentCutoff > 0 ? String(currentCutoff) : '');
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const commitEdit = async (stock: UserStock) => {
    const val = parseFloat(editValue);
    setEditingId(null);
    if (!onUpdateCutoff || isNaN(val) || val <= 0) return;
    setSavingId(stock.id);
    try { await onUpdateCutoff(stock, val); } finally { setSavingId(null); }
  };
  if (isLoading) {
    return (
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Stock</TableCell>
              <TableCell align="right">Current Price</TableCell>
              <TableCell align="right">Today</TableCell>
              <TableCell align="right">Cutoff Price</TableCell>
              {!compact && <TableCell align="right">52W Low</TableCell>}
              {!compact && <TableCell align="right">24W Low</TableCell>}
              {!compact && <TableCell align="right">12W Low</TableCell>}
              {!compact && <TableCell align="right">Status</TableCell>}
              {!compact && onDeleteStock && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(compact ? 5 : 8)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Skeleton variant="circular" width={32} height={32} /><Box><Skeleton width={60} /><Skeleton width={100} /></Box></Box></TableCell>
                <TableCell align="right"><Skeleton width={60} /></TableCell>
                <TableCell align="right"><Skeleton width={60} /></TableCell>
                <TableCell align="right"><Skeleton width={60} /></TableCell>
                {!compact && <><TableCell align="right"><Skeleton width={60} /></TableCell><TableCell align="right"><Skeleton width={60} /></TableCell><TableCell align="right"><Skeleton width={60} /></TableCell><TableCell align="right"><Skeleton width={60} /></TableCell></>}
                {!compact && onDeleteStock && <TableCell />}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (stocks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No stocks in your watchlist
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add stocks to start monitoring their prices
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Stock</TableCell>
            <TableCell align="right">Current Price</TableCell>
            <TableCell align="right">Today</TableCell>
            <TableCell align="right">Cutoff Price</TableCell>
            {!compact && <TableCell align="right">52W Low</TableCell>}
            {!compact && <TableCell align="right">24W Low</TableCell>}
            {!compact && <TableCell align="right">12W Low</TableCell>}
            {!compact && <TableCell align="right">Status</TableCell>}
            {!compact && onDeleteStock && <TableCell />}
          </TableRow>
        </TableHead>
        <TableBody>
          {stocks.map((stock) => {
            const s = stock as any;
            const sym: string = s.symbol || s.stock?.symbol || '?';
            const currentPrice = Number(s.current_price ?? s.currentPrice ?? 0);
            const targetPrice = Number(s.target_price ?? s.targetPrice ?? s.cutoff_price ?? s.cutoffPrice ?? null) || null;
            const change = Number(s.price_change ?? s.stock?.change ?? 0);
            const changePct = Number(s.price_change_percent ?? s.stock?.changePercent ?? 0);
            const name: string = s.name || s.stock?.name || '';
            const exchange: string = s.exchange || s.stock?.exchange || 'NASDAQ';
            const gExchange = exchange.toUpperCase().includes('NYSE') ? 'NYSE' : exchange.toUpperCase().includes('AMEX') || exchange.toUpperCase().includes('BATS') ? 'NYSEAMERICAN' : 'NASDAQ';
            const low52 = Number(s.week_52_low ?? s.low52Week ?? 0) || null;
            const low24 = Number(s.week_24_low ?? s.low24Week ?? 0) || null;
            const low12 = Number(s.week_12_low ?? s.low12Week ?? 0) || null;
            const status = getStatus(currentPrice, targetPrice);
            const isAlert = status?.label === 'ALERT';

            return (
              <TableRow
                key={stock.id}
                hover
                onClick={() => onStockClick?.(stock)}
                sx={{
                  cursor: onStockClick ? 'pointer' : 'default',
                  bgcolor: isAlert ? 'error.50' : undefined,
                  '&:hover': { bgcolor: isAlert ? 'error.100' : 'action.hover' },
                }}
              >
                {/* Stock name */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: isAlert ? 'error.main' : 'primary.main', fontSize: '0.8rem' }}>
                      {isAlert ? <Notifications fontSize="small" /> : sym.charAt(0)}
                    </Avatar>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" fontWeight="bold">{sym}</Typography>
                        <Tooltip title="Yahoo Finance">
                          <IconButton
                            size="small"
                            component="a"
                            href={`https://finance.yahoo.com/quote/${sym}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            sx={{ p: 0.25, opacity: 0.4, '&:hover': { opacity: 1 } }}
                          >
                            <OpenInNew sx={{ fontSize: 11 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Google Finance">
                          <IconButton
                            size="small"
                            component="a"
                            href={`https://www.google.com/finance/quote/${sym}:${gExchange}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            sx={{ p: 0.25, opacity: 0.4, '&:hover': { opacity: 1 } }}
                          >
                            <Typography sx={{ fontSize: 9, fontWeight: 'bold', lineHeight: 1, opacity: 1 }}>G</Typography>
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: compact ? 100 : 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>

                {/* Current price */}
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="medium">
                    {currentPrice > 0 ? fmt(currentPrice) : '—'}
                  </Typography>
                </TableCell>

                {/* Day change */}
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    {change > 0 ? <TrendingUp fontSize="small" color="success" /> : change < 0 ? <TrendingDown fontSize="small" color="error" /> : <TrendingFlat fontSize="small" color="disabled" />}
                    <Typography variant="body2" color={change > 0 ? 'success.main' : change < 0 ? 'error.main' : 'text.secondary'}>
                      {fmtPct(changePct)}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Cutoff price — inline editable */}
                <TableCell align="right">
                  {savingId === stock.id ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                      <CircularProgress size={14} />
                      <Typography variant="body2" color="text.secondary">{fmt(targetPrice)}</Typography>
                    </Box>
                  ) : editingId === stock.id ? (
                    <InputBase
                      inputRef={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(stock)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit(stock);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      inputProps={{ style: { textAlign: 'right', width: 80, padding: '2px 4px', fontSize: '0.875rem', fontWeight: 500 } }}
                      sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 1, bgcolor: 'primary.50' }}
                      autoFocus
                      startAdornment={<Typography variant="body2" sx={{ pl: 0.5, color: 'text.secondary' }}>$</Typography>}
                    />
                  ) : (
                    <Tooltip title={onUpdateCutoff ? 'Click to edit cutoff price' : ''}>
                      <Box
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: onUpdateCutoff ? 'text' : 'default', '&:hover .edit-icon': { opacity: 1 } }}
                        onClick={(e) => { e.stopPropagation(); if (onUpdateCutoff) startEdit(stock, targetPrice); }}
                      >
                        {targetPrice && targetPrice > 0 ? (
                          <Typography variant="body2" fontWeight="medium" color={isAlert ? 'error.main' : 'text.primary'}>
                            {fmt(targetPrice)}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        )}
                        {onUpdateCutoff && (
                          <Edit className="edit-icon" sx={{ fontSize: 12, color: 'text.disabled', opacity: 0, transition: 'opacity 0.15s' }} />
                        )}
                      </Box>
                    </Tooltip>
                  )}
                </TableCell>

                {/* 52W Low */}
                {!compact && (
                  <TableCell align="right">
                    <LowCell price={low52} currentPrice={currentPrice} />
                  </TableCell>
                )}

                {/* 24W Low */}
                {!compact && (
                  <TableCell align="right">
                    <LowCell price={low24} currentPrice={currentPrice} />
                  </TableCell>
                )}

                {/* 12W Low */}
                {!compact && (
                  <TableCell align="right">
                    <LowCell price={low12} currentPrice={currentPrice} />
                  </TableCell>
                )}

                {/* Status chip */}
                {!compact && (
                  <TableCell align="right">
                    {status ? (
                      <Tooltip title={`Current: ${fmt(currentPrice)} / Cutoff: ${fmt(targetPrice)}`}>
                        <Chip
                          label={
                            status.label === 'ALERT' ? '🔴 Buy Alert' :
                            status.label === 'NEAR' ? '🟡 Near Target' :
                            '🟢 Watching'
                          }
                          color={status.color}
                          size="small"
                          variant={status.label === 'ALERT' ? 'filled' : 'outlined'}
                        />
                      </Tooltip>
                    ) : (
                      <Chip label="No target" size="small" variant="outlined" color="default" />
                    )}
                  </TableCell>
                )}

                {/* Group + Delete buttons */}
                {!compact && onDeleteStock && (
                  <TableCell align="right" sx={{ width: 80 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {onMoveToGroup && (
                        movingGroupId === stock.id ? (
                          <CircularProgress size={16} sx={{ mx: 0.5, alignSelf: 'center' }} />
                        ) : (
                          <Tooltip title="Assign group">
                            <IconButton size="small" onClick={(e) => openGroupMenu(e, stock)}>
                              <FolderOutlined fontSize="small" sx={{ color: (s as any).groupId ? 'primary.main' : 'text.disabled' }} />
                            </IconButton>
                          </Tooltip>
                        )
                      )}
                      <Tooltip title="Remove from watchlist">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => { e.stopPropagation(); onDeleteStock(stock); }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Group assignment menu */}
      <Menu anchorEl={groupMenuAnchor} open={Boolean(groupMenuAnchor)} onClose={closeGroupMenu}>
        <MenuItem
          onClick={() => handleMoveToGroup(null)}
          selected={!(groupMenuStock as any)?.groupId}
          sx={{ color: 'text.secondary', fontStyle: 'italic' }}
        >
          No group
        </MenuItem>
        {groups.map((g) => (
          <MenuItem
            key={g.id}
            onClick={() => handleMoveToGroup(g.id)}
            selected={(groupMenuStock as any)?.groupId === g.id}
          >
            {g.name}
          </MenuItem>
        ))}
      </Menu>
    </TableContainer>
  );
};

export default StockList;
