/**
 * Mock implementations for authApi
 * Used in component tests to simulate API behavior
 */
import { vi } from 'vitest';
import type { AuthResponse, User } from '@/types/auth';
import { createMockUser } from './factories';

/**
 * Create mock authApi with configurable behavior
 */
export function createMockAuthApi(config?: {
  currentUser?: User | null;
  loginResponse?: AuthResponse;
  shouldFailLogin?: boolean;
  shouldFailLogout?: boolean;
  shouldFailGetCurrentUser?: boolean;
}) {
  const {
    currentUser = createMockUser(),
    loginResponse = { user: currentUser! },
    shouldFailLogin = false,
    shouldFailLogout = false,
    shouldFailGetCurrentUser = false,
  } = config || {};

  return {
    login: vi.fn().mockImplementation(async () => {
      if (shouldFailLogin) {
        throw new Error('Invalid credentials');
      }
      return loginResponse;
    }),

    logout: vi.fn().mockImplementation(async () => {
      if (shouldFailLogout) {
        throw new Error('Logout failed');
      }
      return undefined;
    }),

    getCurrentUser: vi.fn().mockImplementation(async () => {
      if (shouldFailGetCurrentUser) {
        throw new Error('Unauthorized');
      }
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      return currentUser;
    }),

    register: vi.fn().mockImplementation(async () => {
      return { user: createMockUser({ role: 'student' }) };
    }),
  };
}

/**
 * Mock authApi for authenticated state
 */
export const mockAuthApiAuthenticated = createMockAuthApi({
  currentUser: createMockUser(),
});

/**
 * Mock authApi for unauthenticated state
 */
export const mockAuthApiUnauthenticated = createMockAuthApi({
  currentUser: null,
  shouldFailGetCurrentUser: true,
});
