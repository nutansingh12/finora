import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useAuth} from '../store/AuthContext';
import {PortfolioScreen} from '../screens/portfolio/PortfolioScreen';

export const SimpleAppNavigator: React.FC = () => {
  const {user, isLoading} = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.authText}>Please log in</Text>
      </View>
    );
  }

  // For now, just show the portfolio screen
  return <PortfolioScreen />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  authText: {
    fontSize: 18,
    color: '#666',
  },
});
