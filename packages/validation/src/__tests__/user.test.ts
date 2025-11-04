/**
 * @module user.test
 * @description Tests for user validation schemas
 */

import { describe, it, expect } from 'vitest'
import { USER_ROLES } from '@concentrate/shared'
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserQuerySchema,
  SuspendUserSchema,
  UserIdParamSchema,
  BatchUserOperationSchema,
} from '../user'

describe('CreateUserSchema', () => {
  describe('valid inputs', () => {
    it('should validate complete user data with password', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = CreateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.name).toBe('John Doe')
        expect(result.data.role).toBe('student')
        expect(result.data.suspended).toBe(false)
      }
    })

    it('should validate user data without password (OAuth)', () => {
      const validData = {
        email: 'oauth@example.com',
        name: 'OAuth User',
        role: USER_ROLES.TEACHER,
      }

      const result = CreateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept suspended flag', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
        suspended: true,
      }

      const result = CreateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.suspended).toBe(true)
      }
    })

    it('should default suspended to false', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = CreateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.suspended).toBe(false)
      }
    })

    it('should accept all valid roles', () => {
      const roles = [USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]

      roles.forEach((role) => {
        const validData = {
          email: 'test@example.com',
          password: 'Password123!',
          name: 'John Doe',
          role,
        }

        const result = CreateUserSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })
    })

    it('should trim and lowercase email', () => {
      const validData = {
        email: '  TEST@EXAMPLE.COM  ',
        password: 'Password123!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = CreateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
      }
    })

    it('should trim name', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: '  John Doe  ',
        role: USER_ROLES.STUDENT,
      }

      const result = CreateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John Doe')
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing email', () => {
      const invalidData = {
        password: 'Password123!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = CreateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Email is required')
      }
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'Password123!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = CreateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid email format')
      }
    })

    it('should reject email exceeding 255 characters', () => {
      const invalidData = {
        email: 'a'.repeat(250) + '@test.com',
        password: 'Password123!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = CreateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Email must not exceed 255 characters'
        )
      }
    })

    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = CreateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Password must be at least 8 characters'
        )
      }
    })

    it('should reject missing name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        role: USER_ROLES.STUDENT,
      }

      const result = CreateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Name is required')
      }
    })

    it('should reject empty name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: '',
        role: USER_ROLES.STUDENT,
      }

      const result = CreateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Name is required')
      }
    })

    it('should reject name exceeding 255 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'a'.repeat(256),
        role: USER_ROLES.STUDENT,
      }

      const result = CreateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Name must not exceed 255 characters'
        )
      }
    })

    it('should reject missing role', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
      }

      const result = CreateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Role is required')
      }
    })

    it('should reject invalid role', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        role: 'invalid-role',
      }

      const result = CreateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Invalid enum value')
      }
    })

    it('should reject non-boolean suspended', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
        suspended: 'true',
      }

      const result = CreateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Suspended must be a boolean'
        )
      }
    })
  })
})

describe('UpdateUserSchema', () => {
  describe('valid inputs', () => {
    it('should validate update with all fields', () => {
      const validData = {
        email: 'newemail@example.com',
        name: 'Jane Doe',
        role: USER_ROLES.TEACHER,
      }

      const result = UpdateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate update with only email', () => {
      const validData = {
        email: 'newemail@example.com',
      }

      const result = UpdateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate update with only name', () => {
      const validData = {
        name: 'Jane Doe',
      }

      const result = UpdateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate update with only role', () => {
      const validData = {
        role: USER_ROLES.TEACHER,
      }

      const result = UpdateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate empty object', () => {
      const validData = {}

      const result = UpdateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should trim and lowercase email', () => {
      const validData = {
        email: '  NEW@EXAMPLE.COM  ',
      }

      const result = UpdateUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('new@example.com')
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'not-an-email',
      }

      const result = UpdateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid email format')
      }
    })

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
      }

      const result = UpdateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Name cannot be empty')
      }
    })

    it('should reject invalid role', () => {
      const invalidData = {
        role: 'invalid-role',
      }

      const result = UpdateUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Invalid enum value')
      }
    })
  })
})

describe('UserQuerySchema', () => {
  describe('valid inputs', () => {
    it('should validate query with all parameters', () => {
      const validData = {
        role: USER_ROLES.STUDENT,
        suspended: 'true',
        search: 'john',
        page: '1',
        limit: '10',
      }

      const result = UserQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.role).toBe('student')
        expect(result.data.suspended).toBe(true)
        expect(result.data.search).toBe('john')
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10)
      }
    })

    it('should validate query with no parameters', () => {
      const validData = {}

      const result = UserQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should transform suspended string to boolean', () => {
      const validData = {
        suspended: 'false',
      }

      const result = UserQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.suspended).toBe(false)
      }
    })

    it('should transform page string to number', () => {
      const validData = {
        page: '5',
      }

      const result = UserQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(5)
      }
    })

    it('should transform limit string to number', () => {
      const validData = {
        limit: '25',
      }

      const result = UserQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(25)
      }
    })

    it('should trim search parameter', () => {
      const validData = {
        search: '  john doe  ',
      }

      const result = UserQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe('john doe')
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject invalid role', () => {
      const invalidData = {
        role: 'invalid-role',
      }

      const result = UserQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Invalid enum value')
      }
    })

    it('should reject invalid suspended value', () => {
      const invalidData = {
        suspended: 'yes',
      }

      const result = UserQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Invalid enum value')
      }
    })

    it('should reject non-numeric page', () => {
      const invalidData = {
        page: 'abc',
      }

      const result = UserQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Page must be a positive integer'
        )
      }
    })

    it('should reject zero page', () => {
      const invalidData = {
        page: '0',
      }

      const result = UserQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Page must be a positive integer'
        )
      }
    })

    it('should reject negative page', () => {
      const invalidData = {
        page: '-1',
      }

      const result = UserQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Page must be a positive integer'
        )
      }
    })

    it('should reject non-numeric limit', () => {
      const invalidData = {
        limit: 'abc',
      }

      const result = UserQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Limit must be a positive integer'
        )
      }
    })

    it('should reject limit exceeding 100', () => {
      const invalidData = {
        limit: '101',
      }

      const result = UserQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Limit must not exceed 100'
        )
      }
    })
  })
})

describe('SuspendUserSchema', () => {
  describe('valid inputs', () => {
    it('should validate suspend action', () => {
      const validData = {
        suspended: true,
      }

      const result = SuspendUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate unsuspend action', () => {
      const validData = {
        suspended: false,
      }

      const result = SuspendUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing suspended', () => {
      const invalidData = {}

      const result = SuspendUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Suspended status is required'
        )
      }
    })

    it('should reject non-boolean suspended', () => {
      const invalidData = {
        suspended: 'true',
      }

      const result = SuspendUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Suspended must be a boolean'
        )
      }
    })
  })
})

describe('UserIdParamSchema', () => {
  describe('valid inputs', () => {
    it('should validate valid UUID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = UserIdParamSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing ID', () => {
      const invalidData = {}

      const result = UserIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('User ID is required')
      }
    })

    it('should reject invalid UUID format', () => {
      const invalidData = {
        id: 'not-a-uuid',
      }

      const result = UserIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid user ID format')
      }
    })

    it('should reject non-string ID', () => {
      const invalidData = {
        id: 123,
      }

      const result = UserIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('User ID must be a string')
      }
    })
  })
})

describe('BatchUserOperationSchema', () => {
  describe('valid inputs', () => {
    it('should validate single user ID', () => {
      const validData = {
        userIds: ['123e4567-e89b-12d3-a456-426614174000'],
      }

      const result = BatchUserOperationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate multiple user IDs', () => {
      const validData = {
        userIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '223e4567-e89b-12d3-a456-426614174001',
          '323e4567-e89b-12d3-a456-426614174002',
        ],
      }

      const result = BatchUserOperationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate 100 user IDs', () => {
      const validData = {
        userIds: Array.from({ length: 100 }, (_, i) =>
          `${i.toString().padStart(8, '0')}-0000-0000-0000-000000000000`
        ),
      }

      const result = BatchUserOperationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing userIds', () => {
      const invalidData = {}

      const result = BatchUserOperationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('User IDs are required')
      }
    })

    it('should reject empty array', () => {
      const invalidData = {
        userIds: [],
      }

      const result = BatchUserOperationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'At least one user ID is required'
        )
      }
    })

    it('should reject more than 100 user IDs', () => {
      const invalidData = {
        userIds: Array.from({ length: 101 }, (_, i) =>
          `${i.toString().padStart(8, '0')}-0000-0000-0000-000000000000`
        ),
      }

      const result = BatchUserOperationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Cannot process more than 100 users at once'
        )
      }
    })

    it('should reject invalid UUID in array', () => {
      const invalidData = {
        userIds: ['not-a-uuid'],
      }

      const result = BatchUserOperationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid user ID format')
      }
    })

    it('should reject non-array userIds', () => {
      const invalidData = {
        userIds: 'not-an-array',
      }

      const result = BatchUserOperationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('User IDs must be an array')
      }
    })
  })
})
