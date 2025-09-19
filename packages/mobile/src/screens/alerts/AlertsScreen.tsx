import React, {useState, useEffect} from 'react';
import {View, StyleSheet, FlatList} from 'react-native';
import {
  FAB,
  List,
  Text,
  useTheme,
  Switch,
  IconButton,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';

interface Alert {
  id: string;
  symbol: string;
  type: 'price' | 'percent';
  condition: 'above' | 'below';
  value: number;
  isActive: boolean;
  createdAt: string;
}

export const AlertsScreen: React.FC = () => {
  const theme = useTheme();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // TODO: Load alerts from API
    setAlerts([
      {
        id: '1',
        symbol: 'AAPL',
        type: 'price',
        condition: 'above',
        value: 200,
        isActive: true,
        createdAt: '2024-01-15',
      },
      {
        id: '2',
        symbol: 'GOOGL',
        type: 'percent',
        condition: 'below',
        value: -5,
        isActive: false,
        createdAt: '2024-01-14',
      },
    ]);
  }, []);

  const toggleAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId
          ? {...alert, isActive: !alert.isActive}
          : alert
      )
    );
  };

  const deleteAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const formatAlertDescription = (alert: Alert) => {
    const conditionText = alert.condition === 'above' ? 'rises above' : 'falls below';
    const valueText = alert.type === 'price' 
      ? `$${alert.value}` 
      : `${alert.value}%`;
    
    return `Alert when ${alert.symbol} ${conditionText} ${valueText}`;
  };

  const renderAlert = ({item}: {item: Alert}) => (
    <List.Item
      title={item.symbol}
      description={formatAlertDescription(item)}
      left={() => (
        <Switch
          value={item.isActive}
          onValueChange={() => toggleAlert(item.id)}
        />
      )}
      right={() => (
        <IconButton
          icon="delete"
          onPress={() => deleteAlert(item.id)}
        />
      )}
    />
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.content}>
        {alerts.length > 0 ? (
          <FlatList
            data={alerts}
            renderItem={renderAlert}
            keyExtractor={(item) => item.id}
            style={styles.alertsList}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, {color: theme.colors.text}]}>
              No price alerts set
            </Text>
            <Text style={[styles.emptySubtext, {color: theme.colors.text}]}>
              Tap the + button to create your first alert
            </Text>
          </View>
        )}
      </View>

      <FAB
        icon="plus"
        style={[styles.fab, {backgroundColor: theme.colors.primary}]}
        onPress={() => {
          // TODO: Navigate to create alert screen
          console.log('Create new alert');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  alertsList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
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
