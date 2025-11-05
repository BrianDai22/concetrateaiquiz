import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, userEvent } from '@/__tests__/test-utils';
import { AuthProvider, useAuth, useRequireAuth } from './AuthContext';
import { createMockUser, createMockAdmin, createMockTeacher } from '@/__tests__/mocks/factories';
import type { User } from '@/types/auth';

// Mock next/navigation
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock authApi
const mockGetCurrentUser = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock('@/lib/api/authApi', () => ({
  authApi: {
    getCurrentUser: () => mockGetCurrentUser(),
    login: (email: string, password: string) => mockLogin(email, password),
    logout: () => mockLogout(),
    register: vi.fn(),
  },
}));

// Test component to consume auth context
function TestComponent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user">{user ? user.name : 'No User'}</div>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('should fetch current user on mount', async () => {
      const mockUser = createMockUser();
      mockGetCurrentUser.mockResolvedValue(mockUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Initially loading
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

      // Wait for user to be fetched
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent(mockUser.name);
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('should handle unauthenticated state when getCurrentUser fails', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Unauthorized'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      spy.mockRestore();
    });

    it('should return correct values after login', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      mockGetCurrentUser.mockResolvedValue(null);
      mockLogin.mockResolvedValue({ user: mockUser });

      function LoginTestComponent() {
        const { login, user, isAuthenticated } = useAuth();

        return (
          <div>
            <button onClick={() => login('test@example.com', 'password')}>Login</button>
            <div data-testid="user">{user ? user.email : 'No User'}</div>
            <div data-testid="authenticated">{isAuthenticated ? 'Yes' : 'No'}</div>
          </div>
        );
      }

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <LoginTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
      });

      // Click login button
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
      });

      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
    });
  });

  describe('logout', () => {
    it('should clear user and redirect to login on logout', async () => {
      const mockUser = createMockUser();
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockLogout.mockResolvedValue(undefined);

      // Mock window.location
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' } as any;

      function LogoutTestComponent() {
        const { logout, user } = useAuth();

        return (
          <div>
            <button onClick={() => logout()}>Logout</button>
            <div data-testid="user">{user ? user.name : 'No User'}</div>
          </div>
        );
      }

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <LogoutTestComponent />
        </AuthProvider>
      );

      // Wait for user to be loaded
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.name);
      });

      // Click logout
      await user.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
        expect(window.location.href).toBe('/login');
      });

      // Restore window.location
      window.location = originalLocation;
    });
  });

  describe('useRequireAuth hook', () => {
    it('should redirect to login when not authenticated', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Unauthorized'));

      function ProtectedComponent() {
        useRequireAuth();
        return <div>Protected Content</div>;
      }

      render(
        <AuthProvider>
          <ProtectedComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should not redirect when authenticated', async () => {
      const mockUser = createMockUser();
      mockGetCurrentUser.mockResolvedValue(mockUser);

      function ProtectedComponent() {
        useRequireAuth();
        return <div>Protected Content</div>;
      }

      render(
        <AuthProvider>
          <ProtectedComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should redirect to role-specific dashboard when user lacks required role', async () => {
      const studentUser = createMockUser({ role: 'student' });
      mockGetCurrentUser.mockResolvedValue(studentUser);

      function AdminOnlyComponent() {
        useRequireAuth(['admin']);
        return <div>Admin Content</div>;
      }

      render(
        <AuthProvider>
          <AdminOnlyComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/student/dashboard');
      });
    });

    it('should allow access when user has required role', async () => {
      const adminUser = createMockAdmin();
      mockGetCurrentUser.mockResolvedValue(adminUser);

      function AdminOnlyComponent() {
        useRequireAuth(['admin']);
        return <div>Admin Content</div>;
      }

      render(
        <AuthProvider>
          <AdminOnlyComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple allowed roles', async () => {
      const teacherUser = createMockTeacher();
      mockGetCurrentUser.mockResolvedValue(teacherUser);

      function TeacherOrAdminComponent() {
        useRequireAuth(['admin', 'teacher']);
        return <div>Teacher or Admin Content</div>;
      }

      render(
        <AuthProvider>
          <TeacherOrAdminComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Teacher or Admin Content')).toBeInTheDocument();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('refetchUser', () => {
    it('should refetch current user', async () => {
      const initialUser = createMockUser({ name: 'Initial User' });
      const updatedUser = createMockUser({ name: 'Updated User' });

      mockGetCurrentUser.mockResolvedValueOnce(initialUser).mockResolvedValueOnce(updatedUser);

      function RefetchTestComponent() {
        const { refetchUser, user } = useAuth();

        return (
          <div>
            <button onClick={() => refetchUser()}>Refetch</button>
            <div data-testid="user">{user ? user.name : 'No User'}</div>
          </div>
        );
      }

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <RefetchTestComponent />
        </AuthProvider>
      );

      // Wait for initial user
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Initial User');
      });

      // Click refetch
      await user.click(screen.getByRole('button', { name: /refetch/i }));

      // Wait for updated user
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Updated User');
      });

      expect(mockGetCurrentUser).toHaveBeenCalledTimes(2);
    });
  });
});
