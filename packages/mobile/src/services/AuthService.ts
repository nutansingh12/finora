import {ApiService} from './ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

class AuthServiceClass {
  // Authentication Methods
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await ApiService.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      // Store tokens
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      
      // Set API token
      ApiService.setAuthToken(response.accessToken);

      return response;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await ApiService.post<RegisterResponse>('/auth/register', data);

      // Store tokens
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      
      // Set API token
      ApiService.setAuthToken(response.accessToken);

      return response;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint
      await ApiService.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear local storage regardless of API call result
      await this.clearAuthData();
    }
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await ApiService.post<RefreshTokenResponse>('/auth/refresh', {
        refreshToken,
      });

      // Update stored tokens
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      
      // Set new API token
      ApiService.setAuthToken(response.accessToken);

      return response;
    } catch (error: any) {
      console.error('Token refresh error:', error);
      await this.clearAuthData();
      throw new Error('Token refresh failed');
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await ApiService.get<User>('/auth/me');
      return response;
    } catch (error: any) {
      console.error('Get current user error:', error);
      throw new Error('Failed to get user data');
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!accessToken) {
        return false;
      }

      // Set token for API calls
      ApiService.setAuthToken(accessToken);

      // Try to get current user to verify token is valid
      await this.getCurrentUser();
      return true;
    } catch (error) {
      // Token is invalid, clear auth data
      await this.clearAuthData();
      return false;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await ApiService.post('/auth/forgot-password', { email });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      throw new Error(error.response?.data?.message || 'Failed to send reset email');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await ApiService.post('/auth/reset-password', {
        token,
        password: newPassword,
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.response?.data?.message || 'Failed to reset password');
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await ApiService.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error: any) {
      console.error('Change password error:', error);
      throw new Error(error.response?.data?.message || 'Failed to change password');
    }
  }

  // Utility Methods
  private async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);
      ApiService.clearAuthToken();
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  // Simplified Biometric Methods (placeholders for future implementation)
  async isBiometricAvailable(): Promise<boolean> {
    return false; // Not implemented yet
  }

  async enableBiometricAuth(email: string, password: string): Promise<BiometricAuthResult> {
    return { success: false, error: 'Biometric authentication not yet implemented' };
  }

  async authenticateWithBiometrics(): Promise<BiometricAuthResult> {
    return { success: false, error: 'Biometric authentication not yet implemented' };
  }

  async disableBiometricAuth(): Promise<void> {
    // Not implemented yet
  }

  async isBiometricEnabled(): Promise<boolean> {
    return false; // Not implemented yet
  }
}

export const AuthService = new AuthServiceClass();
