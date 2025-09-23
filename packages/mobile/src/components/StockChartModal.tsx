import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  PanResponder,
  Dimensions,
} from 'react-native';
// Temporarily remove SVG to prevent crashes
// import Svg, { Path, Line, Text as SvgText, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

interface StockChartModalProps {
  visible: boolean;
  symbol: string;
  currentPrice: number;
  marketCap?: number;
  volume?: number;
  onClose: () => void;
}

// Chart data interface
interface ChartDataPoint {
  date: string;
  price: number;
  volume: number;
}

interface StockData {
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  chartData: ChartDataPoint[];
  lastUpdated: string;
}

export const StockChartModal: React.FC<StockChartModalProps> = ({
  visible,
  symbol,
  currentPrice,
  marketCap = 0,
  volume = 0,
  onClose,
}) => {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    price: number;
    date: string;
  } | null>(null);

  const screenWidth = Dimensions.get('window').width;

  // Time period options
  const timePeriods = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'MAX'];

  // Load stock data when modal opens
  useEffect(() => {
    if (visible && symbol) {
      loadStockData();
    }
  }, [visible, symbol, currentPrice, selectedPeriod]);

  const loadStockData = async () => {
    setIsLoading(true);

    try {
      // Fetch real data from Yahoo Finance API
      const chartData = await fetchYahooFinanceData(symbol, selectedPeriod);

      if (chartData && chartData.length > 0) {
        // Calculate change from first to last price
        const firstPrice = chartData[0].price;
        const lastPrice = chartData[chartData.length - 1].price;
        const change = lastPrice - firstPrice;
        const changePercent = (change / firstPrice) * 100;

        const data: StockData = {
          currentPrice: lastPrice,
          change,
          changePercent,
          volume: typeof volume === 'string' ? volume : `${(volume / 1000000).toFixed(1)}M`,
          marketCap: typeof marketCap === 'string' ? marketCap : `$${(marketCap / 1000000000).toFixed(1)}B`,
          chartData,
          lastUpdated: new Date().toLocaleString()
        };

        setStockData(data);
      } else {
        // Fallback to mock data if API fails
        generateMockData();
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
      // Fallback to mock data
      generateMockData();
    }

    setIsLoading(false);
  };

  const fetchYahooFinanceData = async (symbol: string, period: string): Promise<ChartDataPoint[]> => {
    try {
      // Convert period to Yahoo Finance format
      const periodMap: { [key: string]: string } = {
        '1D': '1d',
        '5D': '5d',
        '1M': '1mo',
        '6M': '6mo',
        'YTD': 'ytd',
        '1Y': '1y',
        '5Y': '5y',
        'MAX': 'max'
      };

      const yahooRange = periodMap[period] || '1y';
      const interval = period === '1D' ? '5m' : period === '5D' ? '15m' : '1d';

      // Use Yahoo Finance API
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${yahooRange}&interval=${interval}&includePrePost=true&events=div%7Csplit%7Cearn&lang=en-US&region=US`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.chart?.result?.[0]?.timestamp && data.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
        const timestamps = data.chart.result[0].timestamp;
        const prices = data.chart.result[0].indicators.quote[0].close;
        const volumes = data.chart.result[0].indicators.quote[0].volume || [];

        const chartData: ChartDataPoint[] = timestamps.map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString(),
          price: prices[index] || 0,
          volume: volumes[index] || 0
        })).filter((point: ChartDataPoint) => point.price > 0); // Filter out null prices

        return chartData;
      }

      throw new Error('Invalid data format from Yahoo Finance');
    } catch (error) {
      console.error('Yahoo Finance API error:', error);
      throw error;
    }
  };

  const generateMockData = () => {
    // Fallback mock data generation
    const change = (Math.random() - 0.5) * currentPrice * 0.1;
    const changePercent = (change / currentPrice) * 100;

    const chartData: ChartDataPoint[] = [];
    const dataPoints = selectedPeriod === '1D' ? 24 : selectedPeriod === '5D' ? 120 : 365;

    for (let i = dataPoints; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const volatility = 0.02;
      const randomChange = (Math.random() - 0.5) * volatility;
      const price = currentPrice * (1 + randomChange * (i / dataPoints));

      chartData.push({
        date: date.toISOString(),
        price: Math.max(price, currentPrice * 0.5),
        volume: Math.floor(Math.random() * 100000000)
      });
    }

    const data: StockData = {
      currentPrice,
      change,
      changePercent,
      volume: typeof volume === 'string' ? volume : `${(volume / 1000000).toFixed(1)}M`,
      marketCap: typeof marketCap === 'string' ? marketCap : `$${(marketCap / 1000000000).toFixed(1)}B`,
      chartData,
      lastUpdated: new Date().toLocaleString()
    };

    setStockData(data);
  };

  // Stable chart implementation using React Native Views
  const ProfessionalChart = ({ data }: { data: ChartDataPoint[] }) => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={{ textAlign: 'center', color: '#666', marginTop: 50 }}>
            No chart data available
          </Text>
        </View>
      );
    }

    const chartWidth = screenWidth - 40;
    const chartHeight = 280;
    const padding = { top: 20, right: 50, bottom: 40, left: 60 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;

    const maxPrice = Math.max(...data.map(d => d.price));
    const minPrice = Math.min(...data.map(d => d.price));
    const priceRange = maxPrice - minPrice;
    const paddedRange = priceRange * 0.05; // Add 5% padding
    const adjustedMax = maxPrice + paddedRange;
    const adjustedMin = minPrice - paddedRange;
    const adjustedRange = adjustedMax - adjustedMin;

    // Simplify data for performance
    const maxPoints = 100;
    const step = Math.max(1, Math.floor(data.length / maxPoints));
    const simplifiedData = data.filter((_, index) => index % step === 0);
    if (simplifiedData[simplifiedData.length - 1] !== data[data.length - 1]) {
      simplifiedData.push(data[data.length - 1]);
    }

    // Format price for display
    const formatPrice = (price: number) => `$${price.toFixed(2)}`;

    // Format date for display
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      if (selectedPeriod === '1D') {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    };

    const lineColor = stockData?.change && stockData.change >= 0 ? '#00C851' : '#FF4444';

    // Create smooth line using canvas-like approach with Views
    const chartPoints = simplifiedData.map((point, index) => {
      const x = (index / (simplifiedData.length - 1)) * plotWidth;
      const y = plotHeight - ((point.price - adjustedMin) / adjustedRange) * plotHeight;
      return { x, y, price: point.price, date: point.date, originalIndex: index };
    });

    // Create line segments that connect smoothly
    const lineSegments = [];
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const current = chartPoints[i];
      const next = chartPoints[i + 1];

      const deltaX = next.x - current.x;
      const deltaY = next.y - current.y;
      const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      lineSegments.push({
        key: i,
        left: current.x,
        top: current.y,
        width: length,
        angle: angle,
      });
    }

    // Touch handler for tooltips
    const handleTouch = (evt: any) => {
      const { locationX } = evt.nativeEvent;
      const relativeX = locationX;

      if (relativeX < 0 || relativeX > plotWidth) {
        setTooltipData(null);
        return;
      }

      // Find closest point
      let closestPoint = chartPoints[0];
      let minDistance = Math.abs(relativeX - chartPoints[0].x);

      chartPoints.forEach(point => {
        const distance = Math.abs(relativeX - point.x);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      });

      setTooltipData({
        visible: true,
        x: closestPoint.x,
        y: closestPoint.y,
        price: closestPoint.price,
        date: closestPoint.date,
      });
    };

    // Generate Y-axis labels
    const yAxisLabels = [];
    for (let i = 0; i <= 5; i++) {
      const price = adjustedMin + (adjustedRange * i) / 5;
      const y = padding.top + plotHeight - (i / 5) * plotHeight;
      yAxisLabels.push({ price, y });
    }

    return (
      <View style={styles.chartContainer}>
        {/* Chart Title */}
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{symbol} - {selectedPeriod}</Text>
          <Text style={styles.priceRange}>
            {formatPrice(adjustedMin)} - {formatPrice(adjustedMax)}
          </Text>
        </View>

        {/* Chart Area */}
        <View style={styles.chartArea}>
          {/* Y-axis labels */}
          <View style={styles.yAxisLabels}>
            {yAxisLabels.map((label, index) => (
              <Text key={index} style={[styles.yAxisLabel, { top: label.y - 8 }]}>
                {formatPrice(label.price)}
              </Text>
            ))}
          </View>

          {/* Chart plot area with touch handling */}
          <View
            style={[styles.plotArea, { width: plotWidth, height: plotHeight, marginLeft: padding.left, marginTop: padding.top }]}
            onTouchStart={handleTouch}
            onTouchMove={handleTouch}
            onTouchEnd={() => setTooltipData(null)}
          >
            {/* Grid lines */}
            {yAxisLabels.map((label, index) => (
              <View
                key={`grid-${index}`}
                style={[
                  styles.gridLine,
                  {
                    top: label.y - padding.top,
                    width: plotWidth,
                  }
                ]}
              />
            ))}

            {/* Smooth line segments */}
            {lineSegments.map((segment) => (
              <View
                key={segment.key}
                style={[
                  styles.lineSegment,
                  {
                    left: segment.left,
                    top: segment.top,
                    width: segment.width,
                    backgroundColor: lineColor,
                    transform: [{ rotate: `${segment.angle}deg` }],
                  }
                ]}
              />
            ))}

            {/* Tooltip crosshair */}
            {tooltipData && (
              <>
                <View
                  style={[
                    styles.crosshair,
                    {
                      left: tooltipData.x,
                      height: plotHeight,
                    }
                  ]}
                />
                <View
                  style={[
                    styles.tooltipDot,
                    {
                      left: tooltipData.x - 4,
                      top: tooltipData.y - 4,
                      backgroundColor: lineColor,
                    }
                  ]}
                />
              </>
            )}
          </View>
        </View>

        {/* X-axis labels */}
        <View style={styles.xAxisLabels}>
          <Text style={styles.xAxisLabel}>{formatDate(data[0]?.date)}</Text>
          <Text style={styles.xAxisLabel}>{formatDate(data[Math.floor(data.length / 2)]?.date)}</Text>
          <Text style={styles.xAxisLabel}>{formatDate(data[data.length - 1]?.date)}</Text>
        </View>

        {/* Chart info */}
        <View style={styles.chartInfo}>
          <Text style={styles.infoText}>Data Points: {data.length}</Text>
          <Text style={[styles.infoText, { color: lineColor }]}>
            {stockData?.changePercent >= 0 ? '↗' : '↘'} {Math.abs(stockData?.changePercent || 0).toFixed(2)}%
          </Text>
        </View>

        {/* Tooltip */}
        {tooltipData && (
          <View
            style={[
              styles.tooltip,
              {
                left: Math.min(Math.max(tooltipData.x + padding.left - 60, 10), chartWidth - 130),
                top: Math.max(tooltipData.y + padding.top - 70, 10),
              }
            ]}
          >
            <Text style={styles.tooltipPrice}>{formatPrice(tooltipData.price)}</Text>
            <Text style={styles.tooltipDate}>{formatDate(tooltipData.date)}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* Semi-transparent overlay */}
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayBackground}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Popup container */}
        <View style={styles.popupContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{symbol}</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1976D2" />
              <Text style={styles.loadingText}>Loading chart data...</Text>
            </View>
          ) : stockData ? (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Price Header */}
              <View style={styles.priceHeader}>
                <Text style={styles.currentPrice}>${stockData.currentPrice.toFixed(2)}</Text>
                <View style={styles.changeContainer}>
                  <Text style={[
                    styles.changeText,
                    { color: stockData.change >= 0 ? '#00C851' : '#FF4444' }
                  ]}>
                    {stockData.change >= 0 ? '▲' : '▼'} {Math.abs(stockData.changePercent).toFixed(2)}%
                  </Text>
                  <Text style={[
                    styles.changeAmount,
                    { color: stockData.change >= 0 ? '#00C851' : '#FF4444' }
                  ]}>
                    {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)} 1Y
                  </Text>
                </View>
              </View>

              {/* Market Info */}
              <Text style={styles.marketInfo}>
                {stockData.lastUpdated} • USD • NASDAQ • Disclaimer
              </Text>

              {/* Time Period Buttons */}
              <View style={styles.periodContainer}>
                {timePeriods.map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && styles.selectedPeriodButton
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text style={[
                      styles.periodText,
                      selectedPeriod === period && styles.selectedPeriodText
                    ]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                  ))}
              </View>

              {/* Chart */}
              <ProfessionalChart data={stockData.chartData} />

              {/* Investment Insight */}
              <View style={styles.recommendationSection}>
                <Text style={styles.sectionTitle}>Investment Insight</Text>
                <Text style={styles.recommendationText}>
                  {stockData.changePercent >= 5
                    ? "📈 Strong upward momentum - consider profit taking or trend following"
                    : stockData.changePercent <= -5
                    ? "📉 Significant decline - potential value opportunity if fundamentals are strong"
                    : stockData.changePercent >= 0
                    ? "📊 Positive movement - monitor for continuation or reversal signals"
                    : "⚠️ Minor decline - watch for support levels and volume confirmation"
                  }
                </Text>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Unable to load chart data</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadStockData}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  popupContainer: {
    width: '95%',
    height: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666666',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#666666',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  priceHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  currentPrice: {
    color: '#000000',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  changeText: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 12,
  },
  changeAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  marketInfo: {
    color: '#666666',
    fontSize: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  selectedPeriodButton: {
    backgroundColor: '#E3F2FD',
  },
  periodText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedPeriodText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  chartContainer: {
    marginVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  priceRange: {
    fontSize: 12,
    color: '#666',
  },
  chartArea: {
    position: 'relative',
    height: 220,
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 50,
    height: '100%',
  },
  yAxisLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
    width: 45,
  },
  plotArea: {
    position: 'relative',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#E5E5E5',
    opacity: 0.5,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
    borderRadius: 1,
  },
  crosshair: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#666',
    opacity: 0.7,
    top: 0,
  },
  tooltipDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 60,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  chartInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
  chart: {
    position: 'relative',
    height: 200,
    width: '100%',
  },
  chartPoint: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  chartLine: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
    borderRadius: 1,
  },
  chartDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    borderWidth: 0.5,
    borderColor: '#FFFFFF',
  },
  chartFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: '50%',
    borderRadius: 6,
  },
  sectionTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  recommendationSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  recommendationText: {
    color: '#333333',
    fontSize: 15,
    lineHeight: 22,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  tooltipPrice: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tooltipDate: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
});
