import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, RefreshControl, Alert} from 'react-native';
import {
  Text,
  Card,
  FAB,
  IconButton,
  useTheme,
  Chip,
  Surface,
  Snackbar,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StockService} from '../../services/StockService';
import {PortfolioSummary} from '../../components/portfolio/PortfolioSummary';
import {StockList} from '../../components/portfolio/StockList';
import {useAuth} from '../../store/AuthContext';
import {PortfolioService} from '../../services/PortfolioService';

export const PortfolioScreen: React.FC = () => {
  const theme = useTheme();
  const {user} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [snackbar, setSnackbar] = useState<{visible: boolean; message: string}>({visible:false, message:''});

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
          <View style={styles.headerRow}>
            <View style={{flex: 1}}>
              <Text style={[styles.title, {color: theme.colors.text}]}>Portfolio</Text>
              <Text style={[styles.subtitle, {color: theme.colors.text}]}>Welcome back, {user?.firstName}</Text>
            </View>
            <View style={styles.headerActions}>
              <IconButton
                icon="download"
                size={20}
                onPress={async () => {
                  try {
                    const {savedPath} = await PortfolioService.exportCSV();
                    setSnackbar({visible: true, message: `Exported to\n${savedPath}`});
                  } catch (e: any) {
                    setSnackbar({visible: true, message: e?.message || 'Export failed'});
                  }
                }}
              />
              <IconButton
                icon="folder"
                size={20}
                onPress={async () => {
                  try {
                    const result = await PortfolioService.pickAndImportCSV();
                    setSnackbar({visible: true, message: `Imported ${result.successfulImports}/${result.totalRows}`});
                    await loadPortfolio();
                  } catch (e: any) {
                    if (e?.code === 'DOCUMENT_PICKER_CANCELED') return;
                    setSnackbar({visible: true, message: e?.message || 'Import failed'});
                  }
                }}
              />
            </View>
          </View>
          <View style={{marginTop: 6}}>
            <Text style={styles.importHint}>
              Tip: Select a .csv from Downloads. If files appear greyed out, open the Files app and pick the CSV.
            </Text>
          </View>
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
                  style={styles.groupChip}
                  textStyle={styles.groupChipText}
                >
                  All Stocks
                </Chip>
                {portfolio.groups?.map((group: any) => (
                  <Chip
                    key={group.id}
                    selected={selectedGroup === group.id}
                    onPress={() => setSelectedGroup(group.id)}
                    style={styles.groupChip}
                    textStyle={styles.groupChipText}
                  >
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

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({visible:false, message:''})}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
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
  importHint: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  groupsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  groupChip: {
    marginRight: 8,
    height: 28,
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
  groupChipText: {
    fontSize: 12,
    lineHeight: 16,
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
