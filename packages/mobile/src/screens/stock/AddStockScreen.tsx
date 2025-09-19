import React, {useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  useTheme,
  HelperText,
  Card,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useForm, Controller} from 'react-hook-form';

interface AddStockFormData {
  symbol: string;
  shares: string;
  purchasePrice: string;
  purchaseDate: string;
}

interface Props {
  navigation: any;
  route?: {
    params?: {
      symbol?: string;
    };
  };
}

export const AddStockScreen: React.FC<Props> = ({navigation, route}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const prefilledSymbol = route?.params?.symbol || '';

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<AddStockFormData>({
    defaultValues: {
      symbol: prefilledSymbol,
      shares: '',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: AddStockFormData) => {
    try {
      setLoading(true);
      
      // TODO: Add stock to portfolio via API
      console.log('Adding stock:', data);
      
      Alert.alert(
        'Success',
        'Stock added to your portfolio!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.content}>
        <Text style={[styles.title, {color: theme.colors.text}]}>
          Add Stock to Portfolio
        </Text>

        <Card style={styles.formCard}>
          <Card.Content>
            <Controller
              control={control}
              name="symbol"
              rules={{
                required: 'Stock symbol is required',
                pattern: {
                  value: /^[A-Z]{1,5}$/,
                  message: 'Enter a valid stock symbol (e.g., AAPL)',
                },
              }}
              render={({field: {onChange, onBlur, value}}) => (
                <TextInput
                  label="Stock Symbol"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text.toUpperCase())}
                  autoCapitalize="characters"
                  error={!!errors.symbol}
                  style={styles.input}
                  placeholder="e.g., AAPL"
                />
              )}
            />
            <HelperText type="error" visible={!!errors.symbol}>
              {errors.symbol?.message}
            </HelperText>

            <Controller
              control={control}
              name="shares"
              rules={{
                required: 'Number of shares is required',
                pattern: {
                  value: /^\d*\.?\d+$/,
                  message: 'Enter a valid number',
                },
                validate: (value) => {
                  const num = parseFloat(value);
                  return num > 0 || 'Shares must be greater than 0';
                },
              }}
              render={({field: {onChange, onBlur, value}}) => (
                <TextInput
                  label="Number of Shares"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  error={!!errors.shares}
                  style={styles.input}
                  placeholder="e.g., 10"
                />
              )}
            />
            <HelperText type="error" visible={!!errors.shares}>
              {errors.shares?.message}
            </HelperText>

            <Controller
              control={control}
              name="purchasePrice"
              rules={{
                required: 'Purchase price is required',
                pattern: {
                  value: /^\d*\.?\d+$/,
                  message: 'Enter a valid price',
                },
                validate: (value) => {
                  const num = parseFloat(value);
                  return num > 0 || 'Price must be greater than 0';
                },
              }}
              render={({field: {onChange, onBlur, value}}) => (
                <TextInput
                  label="Purchase Price ($)"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  error={!!errors.purchasePrice}
                  style={styles.input}
                  placeholder="e.g., 150.00"
                />
              )}
            />
            <HelperText type="error" visible={!!errors.purchasePrice}>
              {errors.purchasePrice?.message}
            </HelperText>

            <Controller
              control={control}
              name="purchaseDate"
              rules={{
                required: 'Purchase date is required',
              }}
              render={({field: {onChange, onBlur, value}}) => (
                <TextInput
                  label="Purchase Date"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={!!errors.purchaseDate}
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                />
              )}
            />
            <HelperText type="error" visible={!!errors.purchaseDate}>
              {errors.purchaseDate?.message}
            </HelperText>
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Add to Portfolio
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={loading}
            style={styles.button}
          >
            Cancel
          </Button>
        </View>
      </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 8,
  },
  actions: {
    gap: 12,
  },
  button: {
    marginBottom: 8,
  },
});
