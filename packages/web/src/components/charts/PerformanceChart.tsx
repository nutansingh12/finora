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
}

const PerformanceChart = ({ 
  data, 
  isLoading, 
  height = 300, 
  showArea = true 
}: PerformanceChartProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map((point) => ({
      ...point,
      formattedDate: format(parseISO(point.date), 'MMM dd'),
      formattedValue: point.value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    }));
  }, [data]);

  const isPositiveOverall = useMemo(() => {
    if (chartData.length < 2) return true;
    const firstValue = chartData[0].value;
    const lastValue = chartData[chartData.length - 1].value;
    return lastValue >= firstValue;
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {format(parseISO(data.date), 'MMM dd, yyyy')}
          </Typography>
          <Typography variant="h6" sx={{ color: 'primary.main', mt: 0.5 }}>
            {data.formattedValue}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: data.change >= 0 ? 'success.main' : 'error.main',
              mt: 0.5,
            }}
          >
            {data.change >= 0 ? '+' : ''}
            {data.change.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
            })} ({data.changePercent >= 0 ? '+' : ''}
            {data.changePercent.toFixed(2)}%)
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', height }}>
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'background.default',
          borderRadius: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No performance data available
        </Typography>
      </Box>
    );
  }

  const strokeColor = isPositiveOverall ? '#2e7d32' : '#d32f2f';
  const fillColor = isPositiveOverall ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)';

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
            <XAxis
              dataKey="formattedDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
              tickFormatter={(value) =>
                value.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              fill="url(#colorValue)"
              dot={false}
              activeDot={{
                r: 4,
                stroke: strokeColor,
                strokeWidth: 2,
                fill: '#fff',
              }}
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="formattedDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
              tickFormatter={(value) =>
                value.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                stroke: strokeColor,
                strokeWidth: 2,
                fill: '#fff',
              }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </Box>
  );
};

export default PerformanceChart;
