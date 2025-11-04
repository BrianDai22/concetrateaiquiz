// Global test setup for Vitest
import { afterEach, beforeEach, vi } from 'vitest'

// Mock environment variables for testing
process.env['NODE_ENV'] = 'test'
process.env['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/concentrate_quiz_test'
process.env['REDIS_URL'] = 'redis://localhost:6379/1'
process.env['JWT_SECRET'] = 'test-secret-key-for-testing-only'
process.env['JWT_EXPIRES_IN'] = '7d'
process.env['REFRESH_TOKEN_EXPIRES_IN'] = '30d'

// Clean up function after each test
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

// Setup before each test
beforeEach(() => {
  // Reset any module mocks
  vi.resetModules()
})

// Global test utilities
global.testUtils = {
  createMockUser: (role: 'admin' | 'teacher' | 'student' = 'student') => ({
    id: `test-user-${Math.random().toString(36).substr(2, 9)}`,
    email: `test-${role}@example.com`,
    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    role,
    suspended: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }),

  createMockClass: (teacherId: string) => ({
    id: `test-class-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Class',
    description: 'A test class for unit testing',
    teacherId,
    createdAt: new Date(),
    updatedAt: new Date()
  }),

  createMockAssignment: (classId: string) => ({
    id: `test-assignment-${Math.random().toString(36).substr(2, 9)}`,
    classId,
    title: 'Test Assignment',
    description: 'Complete the test assignment',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
    updatedAt: new Date()
  })
}

// Extend global type definitions
declare global {
  var testUtils: {
    createMockUser: (role?: 'admin' | 'teacher' | 'student') => any
    createMockClass: (teacherId: string) => any
    createMockAssignment: (classId: string) => any
  }
}