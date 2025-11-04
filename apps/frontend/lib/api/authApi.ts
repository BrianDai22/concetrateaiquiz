import { apiClient } from '../apiClient';
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types/auth';

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/api/v0/auth/login', { email, password });
  },

  /**
   * Register a new user (always creates student role)
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/api/v0/auth/register', {
      ...data,
      role: 'student', // Always student for self-registration
    });
  },

  /**
   * Logout current user
   */
  logout: async (): Promise<void> => {
    return apiClient.post<void>('/api/v0/auth/logout');
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<{ user: User }>('/api/v0/auth/me');
    return response.user; // Unwrap the nested user object
  },
};
