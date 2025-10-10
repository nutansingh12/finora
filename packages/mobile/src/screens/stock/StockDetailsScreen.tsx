import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Button,
  Chip,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {formatCurrency, formatPercent} from '../../utils/formatters';

interface StockDetails {
  symbol: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  high52Week: number;
  low52Week: number;
  peRatio: number;
  dividend: number;
  dividendYield: number;
}

interface Props {
  route: {
    params: {
      symbol: string;
    };
  };
}

export const StockDetailsScreen: React.FC<Props> = ({route}) => {
  const theme = useTheme();
  const {symbol} = route.params;
  const [stockDetails, setStockDetails] = useState<StockDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStockDetails();
  }, [symbol]);

  const loadStockDetails = async () => {
    try {
      setLoading(true);
      // Fetch live quote + metadata from backend (public endpoint)
      const resp = await (await import('../../services/ApiService')).ApiService.get(`/search/quote/${symbol}`);
      const body: any = resp.data;
      if (!body?.success || !body?.data) throw new Error(body?.message || 'Failed to load');
      const stock = body.data.stock || {};
      const quote = body.data.quote || {};

      const currentPrice = Number(quote.price) || 0;
      const change = Number(quote.change) || 0;
      const changePercent = Number(quote.changePercent) || 0;
      const marketCap = Number(quote.marketCap) || 0;
      const volume = Number(quote.volume) || 0;
      const peRatio = Number(quote.peRatio) || 0;
      // 52W data may be null from this endpoint; fall back to today's high/low if present
      const high52Week = Number(quote.fiftyTwoWeekHigh ?? quote.high ?? 0) || 0;
      const low52Week = Number(quote.fiftyTwoWeekLow ?? quote.low ?? 0) || 0;

      setStockDetails({
        symbol: symbol.toUpperCase(),
        companyName: stock.name || symbol.toUpperCase(),
        currentPrice,
        change,
        changePercent,
        marketCap,
        volume,
        high52Week,
        low52Week,
        peRatio,
        dividend: 0,
        dividendYield: 0,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading stock details:', error);
      setLoading(false);
    }
  };

  if (loading || !stockDetails) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const changeColor = stockDetails.change >= 0 
    ? theme.colors.success || '#4CAF50'
    : theme.colors.error || '#F44336';

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.symbol, {color: theme.colors.text}]}>
            {stockDetails.symbol}
          </Text>
          <Text style={[styles.companyName, {color: theme.colors.text}]}>
            {stockDetails.companyName}
          </Text>
          
          <View style={styles.priceContainer}>
            <Text style={[styles.currentPrice, {color: theme.colors.text}]}>
              {formatCurrency(stockDetails.currentPrice)}
            </Text>
            <View style={styles.changeContainer}>
              <Chip
                style={[styles.changeChip, {backgroundColor: changeColor}]}
                textStyle={{color: 'white'}}
              >
                {stockDetails.change >= 0 ? '+' : ''}{formatCurrency(stockDetails.change)} 
                ({stockDetails.changePercent >= 0 ? '+' : ''}{formatPercent(stockDetails.changePercent)})
              </Chip>
            </View>
          </View>
        </View>

        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
              Key Statistics
            </Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, {color: theme.colors.text}]}>
                  Market Cap
                </Text>
                <Text style={[styles.statValue, {color: theme.colors.text}]}>
                  ${(stockDetails.marketCap / 1e12).toFixed(2)}T
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, {color: theme.colors.text}]}>
                  Volume
                </Text>
                <Text style={[styles.statValue, {color: theme.colors.text}]}>
                  {(stockDetails.volume / 1e6).toFixed(1)}M
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, {color: theme.colors.text}]}>
                  52W High
                </Text>
                <Text style={[styles.statValue, {color: theme.colors.text}]}>
                  {formatCurrency(stockDetails.high52Week)}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, {color: theme.colors.text}]}>
                  52W Low
                </Text>
                <Text style={[styles.statValue, {color: theme.colors.text}]}>
                  {formatCurrency(stockDetails.low52Week)}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, {color: theme.colors.text}]}>
                  P/E Ratio
                </Text>
                <Text style={[styles.statValue, {color: theme.colors.text}]}>
                  {stockDetails.peRatio.toFixed(1)}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, {color: theme.colors.text}]}>
                  Dividend Yield
                </Text>
                <Text style={[styles.statValue, {color: theme.colors.text}]}>
                  {formatPercent(stockDetails.dividendYield)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={() => {
              // TODO: Navigate to add stock screen
              console.log('Add to portfolio');
            }}
            style={styles.actionButton}
          >
            Add to Portfolio
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => {
              // TODO: Navigate to create alert screen
              console.log('Create alert');
            }}
            style={styles.actionButton}
          >
            Create Alert
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  symbol: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 18,
    opacity: 0.7,
    marginBottom: 16,
  },
  priceContainer: {
    alignItems: 'center',
  },
  currentPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeChip: {
    marginHorizontal: 4,
  },
  statsCard: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
});
