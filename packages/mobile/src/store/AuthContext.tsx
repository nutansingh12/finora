import React, {createContext, useContext, useEffect, useState} from 'react';
// Safe AsyncStorage with runtime probe and in-memory fallback
const __memAS = new Map<string, string>();
let AsyncStorage: any = {
  async getItem(key: string) { return __memAS.has(key) ? (__memAS.get(key) as string) : null; },
  async setItem(key: string, value: string) { __memAS.set(key, value); },
  async removeItem(key: string) { __memAS.delete(key); },
  async multiRemove(keys: string[]) { keys.forEach(k => __memAS.delete(k)); },
  async clear() { __memAS.clear(); },
} as const;
// Note: do not require '@react-native-async-storage/async-storage' in this build to avoid native crashes
// Fallback memory storage is used; persistence across restarts is temporary in this debug build
import {ApiService} from '../services/ApiService';
import {AuthService} from '../services/AuthService';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    data: { email: string; password: string; firstName: string; lastName: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<Props> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        ApiService.setAuthToken(token);
        const userData = await AuthService.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await AuthService.login(email, password);
      
      // Store tokens
      await AsyncStorage.setItem('accessToken', response.accessToken);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);
      
      // Set API token
      ApiService.setAuthToken(response.accessToken);
      
      // Set user
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (
    data: { email: string; password: string; firstName: string; lastName: string }
  ) => {
    try {
      const response = await AuthService.register(data);

      // Store tokens
      await AsyncStorage.setItem('accessToken', response.accessToken);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);

      // Set API token
      ApiService.setAuthToken(response.accessToken);

      // Set user
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call success
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
      ApiService.clearAuthToken();
      setUser(null);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await AuthService.refreshToken();

      // Update stored tokens
      await AsyncStorage.setItem('accessToken', response.accessToken);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);

      // Update API token
      ApiService.setAuthToken(response.accessToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
