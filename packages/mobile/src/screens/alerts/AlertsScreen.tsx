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
import { useNavigation } from '@react-navigation/native';

type AlertCondition = 'above' | 'below';

type AlertType = 'price' | 'percent' | 'price_below' | 'price_above' | 'target_reached' | 'cutoff_reached';

interface Alert {
  id: string;
  symbol: string;
  type: AlertType;
  condition: AlertCondition;
  value: number;
  isActive: boolean;
  createdAt: string;
}

export const AlertsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const { ApiService } = await import('../../services/ApiService');
        const resp: any = await ApiService.get('/alerts');
        const body = resp.data;
        if (body?.success) {
          const items = (body.data?.alerts || []).map((a: any) => ({
            id: a.id,
            symbol: a.stock_symbol || a.symbol,
            type: (a.alert_type as AlertType) || 'price',
            condition: (a.alert_type?.includes('above') ? 'above' : 'below') as AlertCondition,
            value: Number(a.target_price ?? a.threshold ?? 0) || 0,
            isActive: !!a.is_active,
            createdAt: a.created_at || ''
          }));
          setAlerts(items);
        }
      } catch (e) {
        console.error('Failed to load alerts', e);
      }
    };
    loadAlerts();
  }, []);

  const toggleAlert = async (alertId: string) => {
    try {
      const { ApiService } = await import('../../services/ApiService');
      await ApiService.patch(`/alerts/${alertId}/toggle`);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isActive: !a.isActive } : a));
    } catch (e) {
      console.error('Failed to toggle alert', e);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { ApiService } = await import('../../services/ApiService');
      await ApiService.delete(`/alerts/${alertId}`);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (e) {
      console.error('Failed to delete alert', e);
    }
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
        onPress={() => navigation.navigate('CreateAlert')}
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
