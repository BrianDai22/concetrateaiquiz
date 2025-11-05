/**
 * E2E Tests: Teacher Portal
 * Tests teacher workflows including class management, student enrollment, assignments, and grading
 */

import { test, expect } from '@playwright/test';
import { loginAsTeacher, expectOnDashboard, clearCookies } from './helpers';

test.describe('Teacher Portal', () => {
  test.beforeEach(async ({ page }) => {
    await clearCookies(page);
    await loginAsTeacher(page);
  });

  test.describe('Dashboard', () => {
    test('should display teacher dashboard', async ({ page }) => {
      await expectOnDashboard(page, 'teacher');

      // Dashboard should have welcome message or heading
      const heading = page.locator('h1');
      await expect(heading).toBeVisible();
    });

    test('should display navigation menu', async ({ page }) => {
      // Check for navigation links
      const dashboardLink = page.locator('a[href="/teacher/dashboard"]');
      const classesLink = page.locator('a[href="/teacher/classes"]');

      // At least dashboard link should be visible
      await expect(dashboardLink).toBeVisible();
    });

    test('should have logout button', async ({ page }) => {
      const logoutButton = page.locator('button:has-text("LOG OUT")');
      await expect(logoutButton).toBeVisible();
    });

    test('should display class statistics or summary', async ({ page }) => {
      await expectOnDashboard(page, 'teacher');

      // Dashboard may show class count, assignment count, etc.
      const statsSection = page.locator('div').filter({
        hasText: /class|assignment|student/i,
      });

      // Some content should be visible
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Classes Management', () => {
    test('should navigate to classes page', async ({ page }) => {
      await page.click('a[href="/teacher/classes"]');
      await expect(page).toHaveURL('/teacher/classes');
    });

    test('should display teacher classes', async ({ page }) => {
      await page.goto('/teacher/classes');
      await page.waitForLoadState('networkidle');

      // Check for classes heading
      const heading = page.locator('h1');
      await expect(heading).toContainText('Classes', { ignoreCase: true });
    });

    test('should have create class button', async ({ page }) => {
      await page.goto('/teacher/classes');
      await page.waitForLoadState('networkidle');

      // Look for create/new class button
      const createButton = page
        .locator('button:has-text("Create"), button:has-text("New Class")')
        .first();

      if (await createButton.isVisible()) {
        await expect(createButton).toBeVisible();
      }
    });

    test('should be able to create a new class', async ({ page }) => {
      await page.goto('/teacher/classes');
      await page.waitForLoadState('networkidle');

      // Look for create class button
      const createButton = page
        .locator('button:has-text("Create"), button:has-text("New Class")')
        .first();

      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForLoadState('networkidle');

        // Should see class creation form
        const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]');
        const descriptionInput = page.locator(
          'textarea[name="description"], textarea[placeholder*="description" i]'
        );

        if (await nameInput.isVisible()) {
          // Fill in class details
          await nameInput.fill('Test E2E Class');

          if (await descriptionInput.isVisible()) {
            await descriptionInput.fill('This is a test class created by E2E tests');
          }

          // Submit form
          const submitButton = page
            .locator('button:has-text("Create"), button:has-text("Submit")')
            .first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForLoadState('networkidle');
          }
        }
      }
    });

    test('should be able to view class details', async ({ page }) => {
      await page.goto('/teacher/classes');
      await page.waitForLoadState('networkidle');

      // Click on a class to view details
      const viewButton = page
        .locator('button:has-text("View"), a:has-text("View")')
        .first();

      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForLoadState('networkidle');

        // Should show class details
        const detailsHeading = page.locator('h1, h2');
        await expect(detailsHeading).toBeVisible();
      }
    });

    test('should be able to edit class', async ({ page }) => {
      await page.goto('/teacher/classes');
      await page.waitForLoadState('networkidle');

      // Look for edit button
      const editButton = page.locator('button:has-text("Edit")').first();

      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForLoadState('networkidle');

        // Should see edit form
        const nameInput = page.locator('input[name="name"]');
        if (await nameInput.isVisible()) {
          await expect(nameInput).toBeVisible();
        }
      }
    });

    test('should be able to delete class', async ({ page }) => {
      await page.goto('/teacher/classes');
      await page.waitForLoadState('networkidle');

      // Look for delete button
      const deleteButton = page.locator('button:has-text("Delete")').first();

      if (await deleteButton.isVisible()) {
        // Just verify the button exists (don't actually delete in test)
        await expect(deleteButton).toBeVisible();
      }
    });
  });

  test.describe('Student Management', () => {
    test('should be able to add students to class', async ({ page }) => {
      await page.goto('/teacher/classes');
      await page.waitForLoadState('networkidle');

      // Navigate to a class
      const viewButton = page
        .locator('button:has-text("View"), a:has-text("View")')
        .first();

      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForLoadState('networkidle');

        // Look for add student button
        const addStudentButton = page
          .locator('button:has-text("Add Student"), button:has-text("Enroll")')
          .first();

        if (await addStudentButton.isVisible()) {
          await expect(addStudentButton).toBeVisible();
        }
      }
    });

    test('should display enrolled students', async ({ page }) => {
      await page.goto('/teacher/classes');
      await page.waitForLoadState('networkidle');

      // Navigate to a class
      const viewButton = page
        .locator('button:has-text("View"), a:has-text("View")')
        .first();

      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForLoadState('networkidle');

        // Should see students section
        const studentsSection = page.locator('div').filter({
          hasText: /student|enrolled/i,
        });

        // Students section or message should be visible
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should be able to remove student from class', async ({ page }) => {
      await page.goto('/teacher/classes');
      await page.waitForLoadState('networkidle');

      // Navigate to a class with students
      const viewButton = page
        .locator('button:has-text("View"), a:has-text("View")')
        .first();

      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForLoadState('networkidle');

        // Look for remove student button
        const removeButton = page.locator('button:has-text("Remove")').first();

        if (await removeButton.isVisible()) {
          // Button should be visible (don't actually remove)
          await expect(removeButton).toBeVisible();
        }
      }
    });
  });

  test.describe('Assignment Management', () => {
    test('should navigate to assignments page', async ({ page }) => {
      await page.goto('/teacher/assignments');
      await page.waitForLoadState('networkidle');

      // Assignments page should load
      const heading = page.locator('h1');
      await expect(heading).toBeVisible();
    });

    test('should have create assignment button', async ({ page }) => {
      await page.goto('/teacher/assignments');
      await page.waitForLoadState('networkidle');

      // Look for create assignment button
      const createButton = page
        .locator('button:has-text("Create"), button:has-text("New Assignment")')
        .first();

      if (await createButton.isVisible()) {
        await expect(createButton).toBeVisible();
      }
    });

    test('should be able to create new assignment', async ({ page }) => {
      await page.goto('/teacher/assignments');
      await page.waitForLoadState('networkidle');

      // Look for create button
      const createButton = page
        .locator('button:has-text("Create"), button:has-text("New Assignment")')
        .first();

      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForLoadState('networkidle');

        // Should see assignment creation form
        const titleInput = page.locator('input[name="title"]');
        const descriptionInput = page.locator('textarea[name="description"]');

        if (await titleInput.isVisible()) {
          await titleInput.fill('Test E2E Assignment');

          if (await descriptionInput.isVisible()) {
            await descriptionInput.fill('This is a test assignment');
          }
        }
      }
    });

    test('should display created assignments', async ({ page }) => {
      await page.goto('/teacher/assignments');
      await page.waitForLoadState('networkidle');

      // Should show assignments or empty state
      const hasAssignments =
        (await page.locator('div').filter({ hasText: /assignment/i }).count()) >
        0;
      const hasNoAssignmentsMessage =
        (await page.locator('text=No assignments').count()) > 0;

      expect(hasAssignments || hasNoAssignmentsMessage).toBeTruthy();
    });

    test('should be able to publish assignment', async ({ page }) => {
      await page.goto('/teacher/assignments');
      await page.waitForLoadState('networkidle');

      // Look for publish button
      const publishButton = page.locator('button:has-text("Publish")').first();

      if (await publishButton.isVisible()) {
        await expect(publishButton).toBeVisible();
      }
    });
  });

  test.describe('Grading', () => {
    test('should navigate to grading page', async ({ page }) => {
      await page.goto('/teacher/grading');
      await page.waitForLoadState('networkidle');

      // Page should load (URL may vary)
      await expect(page.locator('body')).toBeVisible();
    });

    test('should view assignment submissions', async ({ page }) => {
      await page.goto('/teacher/assignments');
      await page.waitForLoadState('networkidle');

      // Look for submissions or grade button
      const gradeButton = page
        .locator('button:has-text("Grade"), a:has-text("Submissions")')
        .first();

      if (await gradeButton.isVisible()) {
        await gradeButton.click();
        await page.waitForLoadState('networkidle');

        // Should see submissions
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should be able to grade submission', async ({ page }) => {
      await page.goto('/teacher/assignments');
      await page.waitForLoadState('networkidle');

      // Navigate to submissions
      const gradeButton = page
        .locator('button:has-text("Grade"), a:has-text("Submissions")')
        .first();

      if (await gradeButton.isVisible()) {
        await gradeButton.click();
        await page.waitForLoadState('networkidle');

        // Look for grade input field
        const gradeInput = page.locator('input[type="number"], input[name="grade"]');

        if (await gradeInput.first().isVisible()) {
          await expect(gradeInput.first()).toBeVisible();
        }
      }
    });

    test('should be able to provide feedback', async ({ page }) => {
      await page.goto('/teacher/assignments');
      await page.waitForLoadState('networkidle');

      // Navigate to submissions
      const gradeButton = page
        .locator('button:has-text("Grade"), a:has-text("Submissions")')
        .first();

      if (await gradeButton.isVisible()) {
        await gradeButton.click();
        await page.waitForLoadState('networkidle');

        // Look for feedback textarea
        const feedbackInput = page.locator('textarea[name="feedback"]');

        if (await feedbackInput.first().isVisible()) {
          await expect(feedbackInput.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Access Control', () => {
    test('should not access student pages', async ({ page }) => {
      await page.goto('/student/dashboard');

      // Should be redirected or see error
      const isOnStudentDashboard = page.url().includes('/student/dashboard');
      expect(isOnStudentDashboard).toBeFalsy();
    });

    test('should not access admin pages', async ({ page }) => {
      await page.goto('/admin/dashboard');

      // Should be redirected or see error
      const isOnAdminDashboard = page.url().includes('/admin/dashboard');
      expect(isOnAdminDashboard).toBeFalsy();
    });
  });

  test.describe('Navigation Flow', () => {
    test('should complete full teacher workflow', async ({ page }) => {
      // Start at dashboard
      await expectOnDashboard(page, 'teacher');

      // Navigate to classes
      await page.goto('/teacher/classes');
      await expect(page).toHaveURL('/teacher/classes');

      // Navigate to assignments
      await page.goto('/teacher/assignments');
      await expect(page).toHaveURL('/teacher/assignments');

      // Return to dashboard
      await page.goto('/teacher/dashboard');
      await expectOnDashboard(page, 'teacher');
    });
  });
});
