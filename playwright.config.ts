import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 *
 * Key settings:
 * - Sequential test execution (single worker) to avoid DB conflicts
 * - Tests run against local development servers
 * - HTML reporter for detailed test results
 * - Automatic retry on failure in CI environment
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Run tests sequentially to avoid database conflicts
  fullyParallel: false,

  // Fail build on CI if test.only is left in
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,

  // Single worker to avoid database conflicts
  workers: 1,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:3000',

    // Collect trace on first retry for debugging
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on first retry
    video: 'retain-on-failure',

    // Default timeout for actions (e.g., click, fill)
    actionTimeout: 10000,
  },

  // Timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test on additional browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before starting tests
  // This ensures frontend and backend are running
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
