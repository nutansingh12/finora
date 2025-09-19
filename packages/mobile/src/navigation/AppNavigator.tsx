import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {useAuth} from '../store/AuthContext';
import {AuthNavigator} from './AuthNavigator';
import {MainNavigator} from './MainNavigator';
import {LoadingScreen} from '../screens/LoadingScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Loading: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const {user, isLoading} = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {user ? (
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};
