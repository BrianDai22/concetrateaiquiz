import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, userEvent, waitFor } from '@/__tests__/test-utils';
import { LogoutButton } from './LogoutButton';
import { AuthProvider } from '@/contexts/AuthContext';
import { createMockUser } from '@/__tests__/mocks/factories';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock authApi
const mockLogout = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock('@/lib/api/authApi', () => ({
  authApi: {
    logout: () => mockLogout(),
    getCurrentUser: () => mockGetCurrentUser(),
    login: vi.fn(),
    register: vi.fn(),
  },
}));

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockLogout.mockResolvedValue(undefined);
    mockGetCurrentUser.mockResolvedValue(createMockUser());
  });

  it('should render button with text', async () => {
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>
    );

    // Wait for auth to load
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /log out/i });
    expect(button).toHaveTextContent('Log Out');
  });

  it('should call logout when clicked', async () => {
    const user = userEvent.setup();

    // Mock window.location for AuthContext logout
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' } as any;

    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /log out/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });

    // Restore window.location
    window.location = originalLocation;
  });

  it('should show loading state during logout', async () => {
    const user = userEvent.setup();

    // Delay the logout to see loading state
    mockLogout.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    // Mock window.location for AuthContext logout
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' } as any;

    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /log out/i });
    await user.click(button);

    // Check loading state
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Logging out...');
      expect(screen.getByRole('button')).toBeDisabled();
    });

    // Wait for logout to complete
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });

    // Restore window.location
    window.location = originalLocation;
  });

  it('should handle logout errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logoutError = new Error('Logout failed');
    mockLogout.mockRejectedValue(logoutError);

    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /log out/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Logout failed:', logoutError);
    });

    // Button should be enabled again after error
    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should be disabled while loading', async () => {
    const user = userEvent.setup();

    mockLogout.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    // Mock window.location for AuthContext logout
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' } as any;

    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /log out/i });

    // Button should not be disabled initially
    expect(button).not.toBeDisabled();

    // Click the button
    await user.click(button);

    // Button should be disabled during logout
    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    // Restore window.location
    window.location = originalLocation;
  });
});
