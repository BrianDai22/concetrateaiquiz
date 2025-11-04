/**
 * Integration test setup for database and Redis testing
 *
 * This setup file:
 * - Connects to test database
 * - Initializes Redis test connection
 * - Provides cleanup utilities
 * - Runs before/after all integration tests
 */

import { beforeAll, afterAll, beforeEach } from 'vitest'
import './setup' // Import base setup

// Database imports
import { db, destroyDatabase } from '@concentrate/database/src/client/database'
import { clearAllTables } from '@concentrate/database/src/test-helpers/cleanup'
import { setupRedisTest, teardownRedisTest } from '@concentrate/database/src/test-helpers/redis'

// Global setup - runs once before all tests
beforeAll(async () => {
  console.log('🔧 Setting up integration test environment...')

  // Verify we're using test database
  const dbUrl = process.env['DATABASE_URL']
  if (!dbUrl?.includes('test')) {
    throw new Error(
      '⚠️ DANGER: Not using test database! ' +
      'Integration tests must run against test database. ' +
      `Current: ${dbUrl}`
    )
  }

  try {
    // Initialize Redis test connection and clear any existing data
    await setupRedisTest()
    console.log('✅ Redis test connection established')

    // Clear database to start fresh
    await clearAllTables(db)
    console.log('✅ Database cleared and ready for testing')

  } catch (error) {
    console.error('❌ Failed to setup integration test environment:', error)
    throw error
  }
})

// Global teardown - runs once after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...')

  try {
    // Clear all test data
    await clearAllTables(db)
    await teardownRedisTest()

    // Destroy database connection
    await destroyDatabase()

    console.log('✅ Integration test environment cleaned up')
  } catch (error) {
    console.error('❌ Failed to cleanup integration test environment:', error)
    // Don't throw in cleanup to avoid masking test failures
  }
})

// Before each test - ensure clean state
beforeEach(async () => {
  // Clear all tables before each test to ensure isolation
  await clearAllTables(db)
})

// Export database for use in integration tests
export { db }

// Helper to create authenticated test requests (for future API tests)
export const createAuthenticatedRequest = (_role: 'admin' | 'teacher' | 'student') => {
  // This will be implemented when we create the auth system
  const token = 'test-jwt-token'
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
}
