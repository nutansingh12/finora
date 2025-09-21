import React from 'react';
import {View, StyleSheet, Image, Alert} from 'react-native';
import {Button, Text, useTheme} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';

export const WelcomeScreen: React.FC = () => {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={[styles.logo, {color: theme.colors.primary}]}>
            Finora
          </Text>
          <Text style={[styles.tagline, {color: theme.colors.text}]}>
            Smart Stock Portfolio Management
          </Text>
        </View>

        <View style={styles.features}>
          <Text style={[styles.feature, {color: theme.colors.text}]}>
            📊 Track your portfolio performance
          </Text>
          <Text style={[styles.feature, {color: theme.colors.text}]}>
            🎯 Set target prices and alerts
          </Text>
          <Text style={[styles.feature, {color: theme.colors.text}]}>
            📈 Analyze historical trends
          </Text>
          <Text style={[styles.feature, {color: theme.colors.text}]}>
            🔔 Get real-time notifications
          </Text>
        </View>

        <View style={styles.buttons}>
          <Button
            mode="contained"
            onPress={() => Alert.alert('Sign In', 'Sign in functionality will be available soon!')}
            style={styles.button}
            contentStyle={styles.buttonContent}>
            Sign In
          </Button>
          <Button
            mode="outlined"
            onPress={() => Alert.alert('Create Account', 'Account creation will be available soon!')}
            style={styles.button}
            contentStyle={styles.buttonContent}>
            Create Account
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
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  features: {
    marginVertical: 40,
  },
  feature: {
    fontSize: 16,
    marginBottom: 16,
    paddingLeft: 8,
  },
  buttons: {
    marginBottom: 40,
  },
  button: {
    marginBottom: 12,
  },
  buttonContent: {
    height: 48,
  },
});
