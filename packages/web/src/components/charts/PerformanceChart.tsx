import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Box, Typography, Skeleton } from '@mui/material';
import { format, parseISO } from 'date-fns';

interface PerformanceDataPoint {
  date: string;
  value: number;
  change: number;
  changePercent: number;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  isLoading: boolean;
  height?: number;
  showArea?: boolean;
  period?: string;
}

function tickSizeForPeriod(period: string | undefined): number {
  switch (period) {
    case '1d':  return 0.05;
    case '5d':  return 0.10;
    case '1mo': return 0.20;
    case '3mo': return 0.50;
    case '6mo': return 1;
    case '1y':  return 1;
    case '2y':  return 5;
    case '5y':  return 5;
    default:    return 1;
  }
}

function buildYTicks(values: number[], tickSize: number): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const start = Math.floor(min / tickSize) * tickSize;
  const end = Math.ceil(max / tickSize) * tickSize;
  const ticks: number[] = [];
  // Limit to a reasonable number of ticks to avoid clutter
  const maxTicks = 20;
  let step = tickSize;
  while ((end - start) / step > maxTicks) step *= 2;
  for (let t = start; t <= end + step * 0.001; t = Math.round((t + step) * 10000) / 10000) {
    ticks.push(t);
  }
  return ticks;
}

const PerformanceChart = ({
  data,
  isLoading,
  height = 300,
  showArea = true,
  period,
}: PerformanceChartProps) => {
  const isIntraday = useMemo(() => data?.length > 0 && data[0].date.includes('T'), [data]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const allSameDay = isIntraday && data.every(p => p.date.slice(0, 10) === data[0].date.slice(0, 10));
    return data.map((point) => {
      const d = parseISO(point.date);
      const formattedDate = isIntraday
        ? (allSameDay ? format(d, 'HH:mm') : format(d, 'MMM dd HH:mm'))
        : format(d, 'MMM dd');
      return {
        ...point,
        formattedDate,
        formattedValue: point.value.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      };
    });
  }, [data, isIntraday]);

  const yTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    return buildYTicks(chartData.map(d => d.value), tickSizeForPeriod(period));
  }, [chartData, period]);

  const decimals = useMemo(() => {
    const ts = tickSizeForPeriod(period);
    return ts < 1 ? (ts < 0.1 ? 2 : 2) : 0;
  }, [period]);

  const isPositiveOverall = useMemo(() => {
    if (chartData.length < 2) return true;
    return chartData[chartData.length - 1].value >= chartData[0].value;
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <Box sx={{ backgroundColor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, p: 2, boxShadow: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {isIntraday ? format(parseISO(d.date), 'MMM dd, HH:mm') : format(parseISO(d.date), 'MMM dd, yyyy')}
          </Typography>
          <Typography variant="h6" sx={{ color: 'primary.main', mt: 0.5 }}>
            {d.formattedValue}
          </Typography>
          <Typography variant="body2" sx={{ color: d.change >= 0 ? 'success.main' : 'error.main', mt: 0.5 }}>
            {d.change >= 0 ? '+' : ''}
            {d.change.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })}
            {' '}({d.changePercent >= 0 ? '+' : ''}{d.changePercent.toFixed(2)}%)
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (isLoading) {
    return <Box sx={{ width: '100%', height }}><Skeleton variant="rectangular" width="100%" height="100%" /></Box>;
  }

  if (!data || data.length === 0) {
    return (
      <Box sx={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'background.default', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">No performance data available</Typography>
      </Box>
    );
  }

  const strokeColor = isPositiveOverall ? '#2e7d32' : '#d32f2f';

  const yAxisProps = {
    axisLine: false,
    tickLine: false,
    tick: { fontSize: 12, fill: '#666' },
    ticks: yTicks,
    domain: [yTicks[0] ?? 'auto', yTicks[yTicks.length - 1] ?? 'auto'] as [any, any],
    tickFormatter: (value: number) =>
      value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
  };

  const xAxisProps = {
    dataKey: 'formattedDate',
    axisLine: false,
    tickLine: false,
    tick: { fontSize: 12, fill: '#666' },
    interval: isIntraday ? Math.max(1, Math.floor(chartData.length / 6)) : 'preserveStartEnd' as any,
  };

  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {showArea ? (
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke={strokeColor} strokeWidth={2} fill="url(#colorValue)" dot={false} activeDot={{ r: 4, stroke: strokeColor, strokeWidth: 2, fill: '#fff' }} />
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" stroke={strokeColor} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: strokeColor, strokeWidth: 2, fill: '#fff' }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </Box>
  );
};

export default PerformanceChart;
