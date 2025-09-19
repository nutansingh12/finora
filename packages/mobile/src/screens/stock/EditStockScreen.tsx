import React, {useState, useEffect} from 'react';
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

interface EditStockFormData {
  shares: string;
  purchasePrice: string;
  purchaseDate: string;
}

interface Props {
  navigation: any;
  route: {
    params: {
      stockId: string;
      symbol: string;
    };
  };
}

export const EditStockScreen: React.FC<Props> = ({navigation, route}) => {
  const theme = useTheme();
  const {stockId, symbol} = route.params;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const {
    control,
    handleSubmit,
    setValue,
    formState: {errors},
  } = useForm<EditStockFormData>();

  useEffect(() => {
    loadStockData();
  }, [stockId]);

  const loadStockData = async () => {
    try {
      setInitialLoading(true);
      
      // TODO: Load stock data from API
      // Mock data for now
      setValue('shares', '10');
      setValue('purchasePrice', '150.00');
      setValue('purchaseDate', '2024-01-15');
      
    } catch (error) {
      console.error('Error loading stock data:', error);
      Alert.alert('Error', 'Failed to load stock data');
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: EditStockFormData) => {
    try {
      setLoading(true);
      
      // TODO: Update stock via API
      console.log('Updating stock:', stockId, data);
      
      Alert.alert(
        'Success',
        'Stock updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Stock',
      `Are you sure you want to remove ${symbol} from your portfolio?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Delete stock via API
              console.log('Deleting stock:', stockId);
              
              Alert.alert(
                'Success',
                'Stock removed from portfolio',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete stock');
            }
          },
        },
      ]
    );
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.content}>
        <Text style={[styles.title, {color: theme.colors.text}]}>
          Edit {symbol}
        </Text>

        <Card style={styles.formCard}>
          <Card.Content>
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
            Update Stock
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={loading}
            style={styles.button}
          >
            Cancel
          </Button>

          <Button
            mode="outlined"
            onPress={handleDelete}
            disabled={loading}
            style={[styles.button, styles.deleteButton]}
            textColor={theme.colors.error}
          >
            Remove from Portfolio
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  deleteButton: {
    borderColor: 'red',
  },
});
