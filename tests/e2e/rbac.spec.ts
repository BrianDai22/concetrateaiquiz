/**
 * E2E Tests: Role-Based Access Control (RBAC)
 * Tests access control and authorization rules across different user roles
 */

import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  loginAsTeacher,
  loginAsStudent,
  clearCookies,
  expectRedirectToLogin,
} from './helpers';

test.describe('Role-Based Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await clearCookies(page);
  });

  test.describe('Unauthenticated Access', () => {
    test('should redirect to login when accessing student dashboard without auth', async ({
      page,
    }) => {
      await page.goto('/student/dashboard');
      await expectRedirectToLogin(page);
    });

    test('should redirect to login when accessing teacher dashboard without auth', async ({
      page,
    }) => {
      await page.goto('/teacher/dashboard');
      await expectRedirectToLogin(page);
    });

    test('should redirect to login when accessing admin dashboard without auth', async ({
      page,
    }) => {
      await page.goto('/admin/dashboard');
      await expectRedirectToLogin(page);
    });

    test('should redirect to login when accessing student classes without auth', async ({
      page,
    }) => {
      await page.goto('/student/classes');
      await expectRedirectToLogin(page);
    });

    test('should redirect to login when accessing teacher classes without auth', async ({
      page,
    }) => {
      await page.goto('/teacher/classes');
      await expectRedirectToLogin(page);
    });

    test('should redirect to login when accessing admin users without auth', async ({
      page,
    }) => {
      await page.goto('/admin/users');
      await expectRedirectToLogin(page);
    });
  });

  test.describe('Student Access Control', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsStudent(page);
    });

    test('should have access to student dashboard', async ({ page }) => {
      await page.goto('/student/dashboard');
      await expect(page).toHaveURL('/student/dashboard');
    });

    test('should have access to student classes', async ({ page }) => {
      await page.goto('/student/classes');
      await expect(page).toHaveURL('/student/classes');
    });

    test('should have access to student assignments', async ({ page }) => {
      await page.goto('/student/assignments');
      await expect(page).toHaveURL('/student/assignments');
    });

    test('should have access to student grades', async ({ page }) => {
      await page.goto('/student/grades');
      await expect(page).toHaveURL('/student/grades');
    });

    test('should NOT have access to teacher dashboard', async ({ page }) => {
      await page.goto('/teacher/dashboard');

      // Should be redirected away from teacher dashboard
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/teacher/dashboard');
    });

    test('should NOT have access to teacher classes', async ({ page }) => {
      await page.goto('/teacher/classes');

      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/teacher/classes');
    });

    test('should NOT have access to teacher assignments', async ({ page }) => {
      await page.goto('/teacher/assignments');

      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/teacher/assignments');
    });

    test('should NOT have access to admin dashboard', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin/dashboard');
    });

    test('should NOT have access to admin users', async ({ page }) => {
      await page.goto('/admin/users');

      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin/users');
    });
  });

  test.describe('Teacher Access Control', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsTeacher(page);
    });

    test('should have access to teacher dashboard', async ({ page }) => {
      await page.goto('/teacher/dashboard');
      await expect(page).toHaveURL('/teacher/dashboard');
    });

    test('should have access to teacher classes', async ({ page }) => {
      await page.goto('/teacher/classes');
      await expect(page).toHaveURL('/teacher/classes');
    });

    test('should have access to teacher assignments', async ({ page }) => {
      await page.goto('/teacher/assignments');
      await expect(page).toHaveURL('/teacher/assignments');
    });

    test('should NOT have access to student dashboard', async ({ page }) => {
      await page.goto('/student/dashboard');

      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/student/dashboard');
    });

    test('should NOT have access to student pages', async ({ page }) => {
      await page.goto('/student/classes');

      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/student/classes');
    });

    test('should NOT have access to admin dashboard', async ({ page }) => {
      await page.goto('/admin/dashboard');

      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin/dashboard');
    });

    test('should NOT have access to admin users management', async ({
      page,
    }) => {
      await page.goto('/admin/users');

      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin/users');
    });
  });

  test.describe('Admin Access Control', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should have access to admin dashboard', async ({ page }) => {
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL('/admin/dashboard');
    });

    test('should have access to admin users management', async ({ page }) => {
      await page.goto('/admin/users');
      await expect(page).toHaveURL('/admin/users');
    });

    test('should NOT have access to student dashboard', async ({ page }) => {
      await page.goto('/student/dashboard');

      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/student/dashboard');
    });

    test('should NOT have access to student pages', async ({ page }) => {
      await page.goto('/student/classes');

      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/student/classes');
    });

    test('should NOT have access to teacher dashboard', async ({ page }) => {
      await page.goto('/teacher/dashboard');

      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/teacher/dashboard');
    });

    test('should NOT have access to teacher pages', async ({ page }) => {
      await page.goto('/teacher/classes');

      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/teacher/classes');
    });
  });

  test.describe('Direct URL Access Attempts', () => {
    test('student attempting direct admin URL access', async ({ page }) => {
      await loginAsStudent(page);

      // Try to directly access admin dashboard
      await page.goto('/admin/dashboard');
      await page.waitForTimeout(1000);

      // Should be blocked or redirected
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin/dashboard');
    });

    test('teacher attempting direct admin URL access', async ({ page }) => {
      await loginAsTeacher(page);

      // Try to directly access admin users page
      await page.goto('/admin/users');
      await page.waitForTimeout(1000);

      // Should be blocked or redirected
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin/users');
    });

    test('student attempting direct teacher URL access', async ({ page }) => {
      await loginAsStudent(page);

      // Try to directly access teacher dashboard
      await page.goto('/teacher/dashboard');
      await page.waitForTimeout(1000);

      // Should be blocked or redirected
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/teacher/dashboard');
    });
  });

  test.describe('Role Switching Prevention', () => {
    test('should maintain student role throughout session', async ({
      page,
    }) => {
      await loginAsStudent(page);

      // Navigate between student pages
      await page.goto('/student/dashboard');
      await expect(page).toHaveURL('/student/dashboard');

      await page.goto('/student/classes');
      await expect(page).toHaveURL('/student/classes');

      // Try to access teacher page
      await page.goto('/teacher/dashboard');
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/teacher/dashboard');

      // Should still be able to access student pages
      await page.goto('/student/dashboard');
      await expect(page).toHaveURL('/student/dashboard');
    });

    test('should maintain teacher role throughout session', async ({
      page,
    }) => {
      await loginAsTeacher(page);

      // Navigate between teacher pages
      await page.goto('/teacher/dashboard');
      await expect(page).toHaveURL('/teacher/dashboard');

      await page.goto('/teacher/classes');
      await expect(page).toHaveURL('/teacher/classes');

      // Try to access admin page
      await page.goto('/admin/users');
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin/users');

      // Should still be able to access teacher pages
      await page.goto('/teacher/dashboard');
      await expect(page).toHaveURL('/teacher/dashboard');
    });

    test('should maintain admin role throughout session', async ({ page }) => {
      await loginAsAdmin(page);

      // Navigate between admin pages
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL('/admin/dashboard');

      await page.goto('/admin/users');
      await expect(page).toHaveURL('/admin/users');

      // Try to access student page
      await page.goto('/student/dashboard');
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/student/dashboard');

      // Should still be able to access admin pages
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL('/admin/dashboard');
    });
  });

  test.describe('Navigation Menu Restrictions', () => {
    test('student should only see student navigation links', async ({
      page,
    }) => {
      await loginAsStudent(page);

      // Should not see admin or teacher links in navigation
      const adminLink = page.locator('a[href="/admin/dashboard"]');
      const teacherLink = page.locator('a[href="/teacher/dashboard"]');

      const hasAdminLink = await adminLink.isVisible().catch(() => false);
      const hasTeacherLink = await teacherLink.isVisible().catch(() => false);

      expect(hasAdminLink).toBeFalsy();
      expect(hasTeacherLink).toBeFalsy();
    });

    test('teacher should only see teacher navigation links', async ({
      page,
    }) => {
      await loginAsTeacher(page);

      // Should not see admin or student links in navigation
      const adminLink = page.locator('a[href="/admin/dashboard"]');
      const studentLink = page.locator('a[href="/student/dashboard"]');

      const hasAdminLink = await adminLink.isVisible().catch(() => false);
      const hasStudentLink = await studentLink.isVisible().catch(() => false);

      expect(hasAdminLink).toBeFalsy();
      expect(hasStudentLink).toBeFalsy();
    });

    test('admin should only see admin navigation links', async ({ page }) => {
      await loginAsAdmin(page);

      // Should not see teacher or student links in navigation
      const teacherLink = page.locator('a[href="/teacher/dashboard"]');
      const studentLink = page.locator('a[href="/student/dashboard"]');

      const hasTeacherLink = await teacherLink.isVisible().catch(() => false);
      const hasStudentLink = await studentLink.isVisible().catch(() => false);

      expect(hasTeacherLink).toBeFalsy();
      expect(hasStudentLink).toBeFalsy();
    });
  });
});
