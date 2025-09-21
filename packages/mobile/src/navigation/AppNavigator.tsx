import React from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {useAuth} from '../contexts/AuthContext';
import {LoginScreen} from '../screens/auth/LoginScreen';

export const AppNavigator: React.FC = () => {
  const {isAuthenticated, isLoading, user} = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Authenticated user - show main app
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Finora!</Text>
      <Text style={styles.subtitle}>Hello, {user?.firstName}!</Text>
      <Text style={styles.message}>
        Authentication is working! 🎉
      </Text>
      <Text style={styles.info}>
        Portfolio management features coming next...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#3B82F6',
    marginBottom: 24,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    color: '#10B981',
    marginBottom: 16,
    textAlign: 'center',
  },
  info: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
