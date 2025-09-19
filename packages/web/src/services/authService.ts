import apiService from './api';
import { User, LoginForm, RegisterForm, ApiResponse } from '@/types';

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

class AuthService {
  async login(credentials: LoginForm): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/login', credentials);
    
    if (response.success && response.data) {
      // Store token in API service
      apiService.setAuthToken(response.data.token);
      
      // Store refresh token separately
      if (typeof window !== 'undefined') {
        localStorage.setItem('finora_refresh_token', response.data.refreshToken);
      }
      
      return response.data;
    }
    
    throw new Error(response.message || 'Login failed');
  }

  async register(userData: RegisterForm): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/register', userData);
    
    if (response.success && response.data) {
      // Store token in API service
      apiService.setAuthToken(response.data.token);
      
      // Store refresh token separately
      if (typeof window !== 'undefined') {
        localStorage.setItem('finora_refresh_token', response.data.refreshToken);
      }
      
      return response.data;
    }
    
    throw new Error(response.message || 'Registration failed');
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('finora_token');
        localStorage.removeItem('finora_refresh_token');
      }
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('finora_refresh_token') 
      : null;
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    });
    
    if (response.success && response.data) {
      // Update stored tokens
      apiService.setAuthToken(response.data.token);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('finora_refresh_token', response.data.refreshToken);
      }
      
      return response.data;
    }
    
    throw new Error(response.message || 'Token refresh failed');
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<User>('/auth/me');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get current user');
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await apiService.patch<User>('/auth/profile', userData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update profile');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await apiService.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to change password');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const response = await apiService.post('/auth/forgot-password', { email });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to send reset email');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await apiService.post('/auth/reset-password', {
      token,
      newPassword,
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to reset password');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const response = await apiService.post('/auth/verify-email', { token });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to verify email');
    }
  }

  async resendVerificationEmail(): Promise<void> {
    const response = await apiService.post('/auth/resend-verification');
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to resend verification email');
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return apiService.isAuthenticated();
  }

  getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('finora_token');
    }
    return null;
  }

  getStoredRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('finora_refresh_token');
    }
    return null;
  }
}

// Create and export singleton instance
const authService = new AuthService();
export default authService;
