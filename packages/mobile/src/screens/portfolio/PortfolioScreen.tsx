import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, RefreshControl} from 'react-native';
import {
  Text,
  Card,
  FAB,
  useTheme,
  Chip,
  Surface,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StockService} from '../../services/StockService';
import {PortfolioSummary} from '../../components/portfolio/PortfolioSummary';
import {StockList} from '../../components/portfolio/StockList';
import {useAuth} from '../../store/AuthContext';

export const PortfolioScreen: React.FC = () => {
  const theme = useTheme();
  const {user} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const data = await StockService.getUserPortfolio();
      setPortfolio(data);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPortfolio();
    setRefreshing(false);
  };

  const handleAddStock = () => {
    Alert.alert('Add Stock', 'Add stock functionality will be available soon!');
  };

  const handleStockPress = (stock: any) => {
    Alert.alert('Stock Details', `Stock details for ${stock.symbol} will be available soon!`);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <View style={styles.loadingContainer}>
          <Text>Loading portfolio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.colors.text}]}>
            Portfolio
          </Text>
          <Text style={[styles.subtitle, {color: theme.colors.text}]}>
            Welcome back, {user?.firstName}
          </Text>
        </View>

        {portfolio && (
          <>
            <PortfolioSummary
              totalValue={portfolio.totalValue}
              totalGain={portfolio.totalGain}
              totalGainPercent={portfolio.totalGainPercent}
              dayGain={portfolio.dayGain}
              dayGainPercent={portfolio.dayGainPercent}
            />

            <View style={styles.groupsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Chip
                  selected={selectedGroup === 'all'}
                  onPress={() => setSelectedGroup('all')}
                  style={styles.groupChip}>
                  All Stocks
                </Chip>
                {portfolio.groups?.map((group: any) => (
                  <Chip
                    key={group.id}
                    selected={selectedGroup === group.id}
                    onPress={() => setSelectedGroup(group.id)}
                    style={styles.groupChip}>
                    {group.name}
                  </Chip>
                ))}
              </ScrollView>
            </View>

            <StockList
              stocks={portfolio.stocks}
              selectedGroup={selectedGroup}
              onStockPress={handleStockPress}
            />
          </>
        )}

        {(!portfolio || portfolio.stocks?.length === 0) && (
          <Surface style={styles.emptyState}>
            <Text style={[styles.emptyTitle, {color: theme.colors.text}]}>
              Start Building Your Portfolio
            </Text>
            <Text style={[styles.emptySubtitle, {color: theme.colors.text}]}>
              Add your first stock to begin tracking your investments
            </Text>
          </Surface>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, {backgroundColor: theme.colors.primary}]}
        onPress={handleAddStock}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  groupsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  groupChip: {
    marginRight: 8,
  },
  emptyState: {
    margin: 16,
    padding: 32,
    alignItems: 'center',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
