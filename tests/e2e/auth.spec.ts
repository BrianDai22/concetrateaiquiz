/**
 * E2E Tests: Authentication
 * Tests login, registration, OAuth, and logout functionality
 */

import { test, expect } from '@playwright/test';
import {
  TEST_USERS,
  login,
  loginAsAdmin,
  loginAsTeacher,
  loginAsStudent,
  logout,
  expectOnDashboard,
  expectErrorMessage,
  expectRedirectToLogin,
  clearCookies,
} from './helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies before each test to ensure clean state
    await clearCookies(page);
  });

  test.describe('Login', () => {
    test('should login admin successfully', async ({ page }) => {
      await loginAsAdmin(page);
      await expectOnDashboard(page, 'admin');
    });

    test('should login teacher successfully', async ({ page }) => {
      await loginAsTeacher(page);
      await expectOnDashboard(page, 'teacher');
    });

    test('should login student successfully', async ({ page }) => {
      await loginAsStudent(page);
      await expectOnDashboard(page, 'student');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Try to login with invalid credentials
      await page.fill('input[type="email"]', 'invalid@email.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('text=Invalid email or password')).toBeVisible({
        timeout: 5000,
      });

      // Should still be on login page
      await expect(page).toHaveURL('/login');
    });

    test('should show error for empty fields', async ({ page }) => {
      await page.goto('/login');

      // Try to submit without filling fields
      await page.click('button[type="submit"]');

      // Should show validation errors (Zod validation)
      const emailError = page.locator('text=Invalid email');
      const passwordError = page.locator('text=String must contain at least');

      // At least one validation error should be visible
      const emailVisible = await emailError.isVisible().catch(() => false);
      const passwordVisible = await passwordError
        .isVisible()
        .catch(() => false);
      expect(emailVisible || passwordVisible).toBeTruthy();
    });

    test('should redirect to login when accessing protected route while logged out', async ({
      page,
    }) => {
      // Try to access student dashboard without logging in
      await page.goto('/student/dashboard');

      // Should redirect to login
      await expectRedirectToLogin(page);
    });
  });

  test.describe('Logout', () => {
    test('should logout admin successfully', async ({ page }) => {
      await loginAsAdmin(page);
      await expectOnDashboard(page, 'admin');

      await logout(page);
      await expectRedirectToLogin(page);

      // Should not be able to access admin dashboard after logout
      await page.goto('/admin/dashboard');
      await expectRedirectToLogin(page);
    });

    test('should logout teacher successfully', async ({ page }) => {
      await loginAsTeacher(page);
      await expectOnDashboard(page, 'teacher');

      await logout(page);
      await expectRedirectToLogin(page);
    });

    test('should logout student successfully', async ({ page }) => {
      await loginAsStudent(page);
      await expectOnDashboard(page, 'student');

      await logout(page);
      await expectRedirectToLogin(page);
    });
  });

  test.describe('Google OAuth', () => {
    test('should display "Sign in with Google" button', async ({ page }) => {
      await page.goto('/login');

      const googleButton = page.locator('button:has-text("Sign in with Google")');
      await expect(googleButton).toBeVisible();
    });

    test('should show error message when OAuth fails with suspended account', async ({
      page,
    }) => {
      // Navigate to login page with error parameter
      // This simulates the redirect from OAuth callback when account is suspended
      await page.goto('/login?error=Your%20account%20has%20been%20suspended');

      // Should display suspension error message
      await expectErrorMessage(page, 'Your account has been suspended');

      // Verify error message is styled correctly (red border)
      const errorBox = page.locator('div').filter({
        hasText: 'Your account has been suspended',
      });
      await expect(errorBox).toHaveClass(/border-red-500/);
    });

    test('should show error message when OAuth fails generically', async ({
      page,
    }) => {
      await page.goto('/login?error=oauth_failed');

      // Should display OAuth error
      const errorElement = page.locator('text=oauth_failed');
      await expect(errorElement).toBeVisible();
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session after page refresh', async ({ page }) => {
      await loginAsStudent(page);
      await expectOnDashboard(page, 'student');

      // Refresh the page
      await page.reload();

      // Should still be logged in
      await expectOnDashboard(page, 'student');
    });

    test('should maintain session when navigating between pages', async ({
      page,
    }) => {
      await loginAsStudent(page);
      await expectOnDashboard(page, 'student');

      // Navigate to different pages
      await page.goto('/student/classes');
      await expect(page).toHaveURL('/student/classes');

      await page.goto('/student/dashboard');
      await expectOnDashboard(page, 'student');
    });
  });

  test.describe('Password Security', () => {
    test('should not expose password in the DOM', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeVisible();

      // Password field should have type="password"
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Navigation Links', () => {
    test('should navigate to register page from login', async ({ page }) => {
      await page.goto('/login');

      // Click the register link
      await page.click('text=Register');

      // Should navigate to register page
      await expect(page).toHaveURL('/register');
    });

    test('should navigate to login page from register', async ({ page }) => {
      await page.goto('/register');

      // Click the login link (if it exists)
      const loginLink = page.locator('text=Log in');
      if (await loginLink.isVisible()) {
        await loginLink.click();
        await expect(page).toHaveURL('/login');
      }
    });
  });
});
