import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios';
// Safe AsyncStorage import with in-memory fallback (avoids native crash if not linked)
let AsyncStorage: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  const __mem = new Map<string, string>();
  AsyncStorage = {
    async getItem(key: string) { return __mem.has(key) ? (__mem.get(key) as string) : null; },
    async setItem(key: string, value: string) { __mem.set(key, value); },
    async removeItem(key: string) { __mem.delete(key); },
    async multiRemove(keys: string[]) { keys.forEach(k => __mem.delete(k)); },
    async clear() { __mem.clear(); },
  } as const;
}
import {API_BASE_URL} from '../config/constants';

class ApiServiceClass {
  private api: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();

    // On app start, restore access token from storage so API calls have auth
    (async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) this.setAuthToken(token);
      } catch {}
    })();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.post('/auth/refresh', {
                refreshToken,
              });
              
              const newAccessToken = response.data.accessToken;
              await AsyncStorage.setItem('accessToken', newAccessToken);
              this.setAuthToken(newAccessToken);
              
              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
            this.clearAuthToken();
            // You might want to emit an event here to trigger logout in the app
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  async setTokens(accessToken: string, refreshToken?: string) {
    this.setAuthToken(accessToken);
    try {
      await AsyncStorage.setItem('accessToken', accessToken);
      if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
    } catch {}
  }

  clearAuthToken() {
    this.authToken = null;
  }

  async clearTokens() {
    try { await AsyncStorage.multiRemove(['accessToken','refreshToken']); } catch {}
    this.clearAuthToken();
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.get(url, config);
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.api.post(url, data, config);
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.api.put(url, data, config);
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.api.patch(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.delete(url, config);
  }

  // Helper method for handling API errors
  handleError(error: any): never {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.statusText;
      throw new Error(message);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error. Please check your connection.');
    } else {
      // Something else happened
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export const ApiService = new ApiServiceClass();
