import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import { Text } from 'react-native';
import {useTheme} from 'react-native-paper';

// Screens
import {PortfolioScreen} from '../screens/portfolio/PortfolioScreen';
import {SearchScreen} from '../screens/search/SearchScreen';
import {AlertsScreen} from '../screens/alerts/AlertsScreen';
import {ProfileScreen} from '../screens/profile/ProfileScreen';
import {ChangePasswordScreen} from '../screens/profile/ChangePasswordScreen';
import {StockDetailsScreen} from '../screens/stock/StockDetailsScreen';
import {AddStockScreen} from '../screens/stock/AddStockScreen';
import {EditStockScreen} from '../screens/stock/EditStockScreen';
import { CreateAlertScreen } from '../screens/alerts/CreateAlertScreen';

export type MainTabParamList = {
  Portfolio: undefined;
  Search: undefined;
  Alerts: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  StockDetails: {symbol: string; stockId?: string};
  AddStock: {symbol?: string};
  EditStock: {stockId: string};
  CreateAlert: undefined;
  ChangePassword: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<MainStackParamList>();

const MainTabs: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let emoji: string;

          switch (route.name) {
            case 'Portfolio':
              emoji = '📊';
              break;
            case 'Search':
              emoji = '🔎';
              break;
            case 'Alerts':
              emoji = '🔔';
              break;
            case 'Profile':
              emoji = '👤';
              break;
            default:
              emoji = '❓';
          }

          return <Text style={{ fontSize: size, color }}>{emoji}</Text>;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}>
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="StockDetails"
        component={StockDetailsScreen}
        options={{title: 'Stock Details'}}
      />
      <Stack.Screen
        name="AddStock"
        component={AddStockScreen}
        options={{title: 'Add Stock'}}
      />
      <Stack.Screen
        name="EditStock"
        component={EditStockScreen}
        options={{title: 'Edit Stock'}}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{title: 'Change Password'}}
      />
      <Stack.Screen
        name="CreateAlert"
        component={CreateAlertScreen}
        options={{title: 'Create Alert'}}
      />
    </Stack.Navigator>
  );
};
