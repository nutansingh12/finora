import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import { ApiService } from '../../services/ApiService';

export const CreateAlertScreen: React.FC<any> = ({ navigation }) => {
  const theme = useTheme();
  const [symbol, setSymbol] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = symbol.trim().length > 0 && Number(price) > 0 && !submitting;

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const sym = symbol.trim().toUpperCase();
      // Resolve stockId by calling public quote endpoint (which upserts stock if missing)
      const quoteResp: any = await ApiService.get(`/search/quote/${sym}`);
      const stockId = quoteResp?.data?.data?.stock?.id;
      if (!stockId) {
        setError('Could not resolve stock');
        setSubmitting(false);
        return;
      }
      const payload = {
        stockId,
        alertType: 'price_below',
        targetPrice: Number(price),
      } as any;
      const ensure = await ApiService.post('/alerts', payload);
      if (ensure?.data?.success) {
        navigation.goBack();
      } else {
        setError(ensure?.data?.message || 'Failed to create alert');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to create alert');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TextInput
        label="Symbol"
        value={symbol}
        onChangeText={setSymbol}
        autoCapitalize="characters"
        style={styles.input}
      />
      <TextInput
        label="Target price (alert when price falls below)"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button mode="contained" onPress={onSubmit} disabled={!canSubmit} loading={submitting}>
        Create Alert
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: { marginBottom: 12 },
});

