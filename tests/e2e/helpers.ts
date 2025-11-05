/**
 * E2E Test Helpers
 * Shared utilities for Playwright tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Test user credentials
 * These users should exist in the test database
 */
export const TEST_USERS = {
  admin: {
    email: 'admin@school.edu',
    password: 'Admin123!@#',
    role: 'admin',
    name: 'Test Admin',
  },
  teacher: {
    email: 'teacher@school.edu',
    password: 'Teacher123!@#',
    role: 'teacher',
    name: 'Test Teacher',
  },
  student: {
    email: 'student@school.edu',
    password: 'Student123!@#',
    role: 'student',
    name: 'Test Student',
  },
  suspended: {
    email: 'mooprules@gmail.com',
    password: 'Password123!',
    role: 'student',
    name: 'Suspended User',
  },
} as const;

/**
 * Login helper function
 * Logs in a user via the login form
 */
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Navigate to login page
  await page.goto('/login');

  // Fill in credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL(/\/(admin|teacher|student)\/dashboard/, {
    timeout: 10000,
  });
}

/**
 * Login as admin
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
}

/**
 * Login as teacher
 */
export async function loginAsTeacher(page: Page): Promise<void> {
  await login(page, TEST_USERS.teacher.email, TEST_USERS.teacher.password);
}

/**
 * Login as student
 */
export async function loginAsStudent(page: Page): Promise<void> {
  await login(page, TEST_USERS.student.email, TEST_USERS.student.password);
}

/**
 * Logout helper function
 */
export async function logout(page: Page): Promise<void> {
  // Click logout button
  await page.click('button:has-text("LOG OUT")');

  // Wait for redirect to login page
  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * Check if user is on the correct dashboard
 */
export async function expectOnDashboard(
  page: Page,
  role: 'admin' | 'teacher' | 'student'
): Promise<void> {
  await expect(page).toHaveURL(`/${role}/dashboard`);
  await expect(page.locator('h1')).toContainText('Dashboard', {
    ignoreCase: true,
  });
}

/**
 * Check if user sees an error message
 */
export async function expectErrorMessage(
  page: Page,
  message: string
): Promise<void> {
  const errorElement = page.locator('div').filter({ hasText: message }).first();
  await expect(errorElement).toBeVisible();
}

/**
 * Check if user is redirected to login page
 */
export async function expectRedirectToLogin(page: Page): Promise<void> {
  await page.waitForURL('/login', { timeout: 5000 });
  await expect(page).toHaveURL('/login');
}

/**
 * Fill form fields
 * Helper to fill multiple form fields at once
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string>
): Promise<void> {
  for (const [selector, value] of Object.entries(fields)) {
    await page.fill(selector, value);
  }
}

/**
 * Wait for API response
 * Useful for waiting for specific API calls to complete
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 10000 }
  );
}

/**
 * Check if element is visible
 */
export async function expectVisible(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * Check if element is hidden
 */
export async function expectHidden(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeHidden();
}

/**
 * Take screenshot with timestamp
 * Useful for debugging failed tests
 */
export async function takeTimestampedScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Clear all cookies
 * Useful for ensuring clean state between tests
 */
export async function clearCookies(page: Page): Promise<void> {
  const context = page.context();
  await context.clearCookies();
}

/**
 * Check if user has access to a page
 * Returns true if accessible, false if redirected
 */
export async function hasAccessToPage(
  page: Page,
  url: string
): Promise<boolean> {
  const initialUrl = page.url();
  await page.goto(url);
  await page.waitForTimeout(1000);
  const currentUrl = page.url();
  return currentUrl.includes(url);
}
