import {ApiService} from './ApiService';

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

class AuthServiceClass {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await ApiService.post<LoginResponse>('/auth/login', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await ApiService.post<RegisterResponse>('/auth/register', data);
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await ApiService.post('/auth/logout');
    } catch (error) {
      // Don't throw on logout errors, just log them
      console.error('Logout error:', error);
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const response = await ApiService.post<RefreshTokenResponse>('/auth/refresh', {
        refreshToken,
      });
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await ApiService.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await ApiService.post('/auth/forgot-password', {email});
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await ApiService.post('/auth/reset-password', {token, password});
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await ApiService.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      await ApiService.post('/auth/verify-email', {token});
    } catch (error) {
      ApiService.handleError(error);
    }
  }

  async resendVerificationEmail(): Promise<void> {
    try {
      await ApiService.post('/auth/resend-verification');
    } catch (error) {
      ApiService.handleError(error);
    }
  }
}

export const AuthService = new AuthServiceClass();
