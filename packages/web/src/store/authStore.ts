import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthState, LoginForm, RegisterForm } from '@/types';
import authService from '@/services/authService';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginForm) => Promise<void>;
  register: (userData: RegisterForm) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  
  // State setters
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  
  // Initialization
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: async (credentials: LoginForm) => {
        set({ isLoading: true });
        try {
          const authData = await authService.login(credentials);
          set({
            user: authData.user,
            token: authData.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData: RegisterForm) => {
        set({ isLoading: true });
        try {
          const authData = await authService.register(userData);
          set({
            user: authData.user,
            token: authData.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } catch (error) {
          console.warn('Logout error:', error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      refreshToken: async () => {
        try {
          const authData = await authService.refreshToken();
          set({
            user: authData.user,
            token: authData.token,
            isAuthenticated: true,
          });
        } catch (error) {
          // If refresh fails, clear auth state
          get().clearAuth();
          throw error;
        }
      },

      getCurrentUser: async () => {
        set({ isLoading: true });
        try {
          const user = await authService.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          throw error;
        }
      },

      updateProfile: async (userData: Partial<User>) => {
        set({ isLoading: true });
        try {
          const updatedUser = await authService.updateProfile(userData);
          set({
            user: updatedUser,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true });
        try {
          await authService.changePassword(currentPassword, newPassword);
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true });
        try {
          await authService.forgotPassword(email);
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      resetPassword: async (token: string, newPassword: string) => {
        set({ isLoading: true });
        try {
          await authService.resetPassword(token, newPassword);
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyEmail: async (token: string) => {
        set({ isLoading: true });
        try {
          await authService.verifyEmail(token);
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      resendVerificationEmail: async () => {
        set({ isLoading: true });
        try {
          await authService.resendVerificationEmail();
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // State setters
      setUser: (user: User | null) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        });
      },

      setToken: (token: string | null) => {
        set({ 
          token, 
          isAuthenticated: !!token 
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      // Initialization
      initialize: async () => {
        const token = authService.getStoredToken();
        
        if (token) {
          set({ token, isLoading: true });
          
          try {
            // Try to get current user to validate token
            await get().getCurrentUser();
          } catch (error) {
            // Token is invalid, try to refresh
            try {
              await get().refreshToken();
            } catch (refreshError) {
              // Both token and refresh failed, clear auth
              get().clearAuth();
            }
          }
        }
      },
    }),
    {
      name: 'finora-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
