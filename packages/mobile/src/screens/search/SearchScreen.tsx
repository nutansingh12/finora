import React, {useState} from 'react';
import {View, StyleSheet, FlatList} from 'react-native';
import {
  Searchbar,
  List,
  Text,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export const SearchScreen: React.FC = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    // TODO: Implement actual search API call
    setTimeout(() => {
      setResults([
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          type: 'Stock',
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          exchange: 'NASDAQ',
          type: 'Stock',
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  const renderResult = ({item}: {item: SearchResult}) => (
    <List.Item
      title={item.symbol}
      description={`${item.name} • ${item.exchange}`}
      right={() => <Text>{item.type}</Text>}
      onPress={() => {
        // TODO: Navigate to stock details or add stock
        console.log('Selected:', item.symbol);
      }}
    />
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.content}>
        <Searchbar
          placeholder="Search stocks..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
        />

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        )}

        {!loading && results.length > 0 && (
          <FlatList
            data={results}
            renderItem={renderResult}
            keyExtractor={(item) => item.symbol}
            style={styles.resultsList}
          />
        )}

        {!loading && searchQuery.length >= 2 && results.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, {color: theme.colors.text}]}>
              No results found for "{searchQuery}"
            </Text>
          </View>
        )}

        {searchQuery.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, {color: theme.colors.text}]}>
              Start typing to search for stocks
            </Text>
          </View>
        )}
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
  searchbar: {
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
  },
});
