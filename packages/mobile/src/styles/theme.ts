import {DefaultTheme} from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#03DAC6',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#000000',
    disabled: '#BDBDBD',
    placeholder: '#757575',
    backdrop: '#000000',
    onSurface: '#000000',
    notification: '#F44336',
    // Custom colors for stock app
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    // Stock specific colors
    stockGreen: '#4CAF50',
    stockRed: '#F44336',
    stockGray: '#9E9E9E',
    cardBackground: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100' as const,
    },
  },
  roundness: 8,
};
