import React from 'react';
import {View, StyleSheet, FlatList} from 'react-native';
import {Card, Text, useTheme, TouchableRipple} from 'react-native-paper';
import {formatCurrency, formatPercent} from '../../utils/formatters';

interface Stock {
  id: string;
  symbol: string;
  companyName: string;
  shares: number;
  currentPrice: number;
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayGain: number;
  dayGainPercent: number;
  groupId?: string;
}

interface Props {
  stocks: Stock[];
  selectedGroup: string;
  onStockPress: (stock: Stock) => void;
}

export const StockList: React.FC<Props> = ({
  stocks,
  selectedGroup,
  onStockPress,
}) => {
  const theme = useTheme();

  const filteredStocks = stocks.filter(stock => 
    selectedGroup === 'all' || stock.groupId === selectedGroup
  );

  const renderStock = ({item}: {item: Stock}) => {
    const gainColor = item.totalGain >= 0 
      ? theme.colors.success || '#4CAF50'
      : theme.colors.error || '#F44336';

    const dayGainColor = item.dayGain >= 0
      ? theme.colors.success || '#4CAF50'
      : theme.colors.error || '#F44336';

    return (
      <Card style={styles.stockCard}>
        <TouchableRipple onPress={() => onStockPress(item)}>
          <View style={styles.stockContent}>
            <View style={styles.stockHeader}>
              <View style={styles.stockInfo}>
                <Text style={[styles.symbol, {color: theme.colors.text}]}>
                  {item.symbol}
                </Text>
                <Text style={[styles.companyName, {color: theme.colors.text}]}>
                  {item.companyName}
                </Text>
              </View>
              <View style={styles.priceInfo}>
                <Text style={[styles.currentPrice, {color: theme.colors.text}]}>
                  {formatCurrency(item.currentPrice)}
                </Text>
                <Text style={[styles.shares, {color: theme.colors.text}]}>
                  {item.shares} shares
                </Text>
              </View>
            </View>

            <View style={styles.stockFooter}>
              <View style={styles.valueInfo}>
                <Text style={[styles.totalValue, {color: theme.colors.text}]}>
                  {formatCurrency(item.totalValue)}
                </Text>
                <Text style={[styles.totalGain, {color: gainColor}]}>
                  {item.totalGain >= 0 ? '+' : ''}{formatCurrency(item.totalGain)} 
                  ({item.totalGainPercent >= 0 ? '+' : ''}{formatPercent(item.totalGainPercent)})
                </Text>
              </View>
              <View style={styles.dayGainInfo}>
                <Text style={[styles.dayGain, {color: dayGainColor}]}>
                  {item.dayGain >= 0 ? '+' : ''}{formatCurrency(item.dayGain)}
                </Text>
                <Text style={[styles.dayGainPercent, {color: dayGainColor}]}>
                  ({item.dayGainPercent >= 0 ? '+' : ''}{formatPercent(item.dayGainPercent)})
                </Text>
              </View>
            </View>
          </View>
        </TouchableRipple>
      </Card>
    );
  };

  if (filteredStocks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, {color: theme.colors.text}]}>
          No stocks in this group
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredStocks}
      renderItem={renderStock}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  stockCard: {
    marginBottom: 12,
  },
  stockContent: {
    padding: 16,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stockInfo: {
    flex: 1,
  },
  symbol: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  companyName: {
    fontSize: 14,
    opacity: 0.7,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  shares: {
    fontSize: 12,
    opacity: 0.7,
  },
  stockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  valueInfo: {
    flex: 1,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  totalGain: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayGainInfo: {
    alignItems: 'flex-end',
  },
  dayGain: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  dayGainPercent: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
  },
});
