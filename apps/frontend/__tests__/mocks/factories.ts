/**
 * Mock data factories for testing
 * Creates realistic test data matching production shapes
 */
import type { User } from '@/types/auth';

/**
 * Create a mock user with optional overrides
 */
export function createMockUser(
  overrides?: Partial<User>
): User {
  const defaultUser: User = {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: `test@example.com`,
    name: 'Test User',
    role: 'student',
  };

  return { ...defaultUser, ...overrides };
}

/**
 * Create a mock admin user
 */
export function createMockAdmin(overrides?: Partial<User>): User {
  return createMockUser({
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    ...overrides,
  });
}

/**
 * Create a mock teacher user
 */
export function createMockTeacher(overrides?: Partial<User>): User {
  return createMockUser({
    email: 'teacher@example.com',
    name: 'Teacher User',
    role: 'teacher',
    ...overrides,
  });
}

/**
 * Create a mock student user
 */
export function createMockStudent(overrides?: Partial<User>): User {
  return createMockUser({
    email: 'student@example.com',
    name: 'Student User',
    role: 'student',
    ...overrides,
  });
}
