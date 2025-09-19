import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Card, Text, useTheme} from 'react-native-paper';
import {formatCurrency, formatPercent} from '../../utils/formatters';

interface Props {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayGain: number;
  dayGainPercent: number;
}

export const PortfolioSummary: React.FC<Props> = ({
  totalValue,
  totalGain,
  totalGainPercent,
  dayGain,
  dayGainPercent,
}) => {
  const theme = useTheme();

  const getTotalGainColor = () => {
    if (totalGain > 0) return theme.colors.success || '#4CAF50';
    if (totalGain < 0) return theme.colors.error || '#F44336';
    return theme.colors.text;
  };

  const getDayGainColor = () => {
    if (dayGain > 0) return theme.colors.success || '#4CAF50';
    if (dayGain < 0) return theme.colors.error || '#F44336';
    return theme.colors.text;
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.container}>
          <View style={styles.mainValue}>
            <Text style={[styles.totalValue, {color: theme.colors.text}]}>
              {formatCurrency(totalValue)}
            </Text>
            <Text style={[styles.label, {color: theme.colors.text}]}>
              Total Portfolio Value
            </Text>
          </View>

          <View style={styles.gainsContainer}>
            <View style={styles.gainItem}>
              <Text style={[styles.gainValue, {color: getTotalGainColor()}]}>
                {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
              </Text>
              <Text style={[styles.gainPercent, {color: getTotalGainColor()}]}>
                ({totalGainPercent >= 0 ? '+' : ''}{formatPercent(totalGainPercent)})
              </Text>
              <Text style={[styles.gainLabel, {color: theme.colors.text}]}>
                Total Gain/Loss
              </Text>
            </View>

            <View style={styles.gainItem}>
              <Text style={[styles.gainValue, {color: getDayGainColor()}]}>
                {dayGain >= 0 ? '+' : ''}{formatCurrency(dayGain)}
              </Text>
              <Text style={[styles.gainPercent, {color: getDayGainColor()}]}>
                ({dayGainPercent >= 0 ? '+' : ''}{formatPercent(dayGainPercent)})
              </Text>
              <Text style={[styles.gainLabel, {color: theme.colors.text}]}>
                Today's Gain/Loss
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    marginBottom: 8,
  },
  container: {
    alignItems: 'center',
  },
  mainValue: {
    alignItems: 'center',
    marginBottom: 24,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    opacity: 0.7,
  },
  gainsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  gainItem: {
    alignItems: 'center',
    flex: 1,
  },
  gainValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  gainPercent: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  gainLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
});
