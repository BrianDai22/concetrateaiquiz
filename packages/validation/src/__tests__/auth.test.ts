/**
 * @module auth.test
 * @description Tests for authentication validation schemas
 */

import { describe, it, expect } from 'vitest'
import { USER_ROLES } from '@concentrate/shared'
import {
  LoginSchema,
  RegisterSchema,
  OAuthCallbackSchema,
  RefreshTokenSchema,
  PasswordResetRequestSchema,
  PasswordResetSchema,
  ChangePasswordSchema,
} from '../auth'

describe('LoginSchema', () => {
  describe('valid inputs', () => {
    it('should validate correct login credentials', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      }

      const result = LoginSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.password).toBe('password123')
      }
    })

    it('should lowercase email addresses', () => {
      const validData = {
        email: 'Test@EXAMPLE.COM',
        password: 'password123',
      }

      const result = LoginSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
      }
    })

    it('should trim email addresses', () => {
      const validData = {
        email: '  test@example.com  ',
        password: 'password123',
      }

      const result = LoginSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing email', () => {
      const invalidData = {
        password: 'password123',
      }

      const result = LoginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Email is required')
      }
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
      }

      const result = LoginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid email format')
      }
    })

    it('should reject missing password', () => {
      const invalidData = {
        email: 'test@example.com',
      }

      const result = LoginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Password is required')
      }
    })

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      }

      const result = LoginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Password is required')
      }
    })

    it('should reject non-string email', () => {
      const invalidData = {
        email: 123,
        password: 'password123',
      }

      const result = LoginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Email must be a string')
      }
    })

    it('should reject non-string password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 123,
      }

      const result = LoginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Password must be a string'
        )
      }
    })
  })
})

describe('RegisterSchema', () => {
  describe('valid inputs', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = RegisterSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.name).toBe('John Doe')
        expect(result.data.role).toBe('student')
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

        const result = RegisterSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })
    })

    it('should trim name', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: '  John Doe  ',
        role: USER_ROLES.STUDENT,
      }

      const result = RegisterSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John Doe')
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject password without uppercase letter', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = RegisterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('uppercase')
      }
    })

    it('should reject password without lowercase letter', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'PASSWORD123!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = RegisterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('lowercase')
      }
    })

    it('should reject password without number', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'PasswordABC!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = RegisterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('number')
      }
    })

    it('should reject password without special character', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = RegisterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('special character')
      }
    })

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Pass1!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = RegisterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Password must be at least 8 characters'
        )
      }
    })

    it('should reject password longer than 128 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'A'.repeat(129) + '1!',
        name: 'John Doe',
        role: USER_ROLES.STUDENT,
      }

      const result = RegisterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Password must not exceed 128 characters'
        )
      }
    })

    it('should reject missing name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        role: USER_ROLES.STUDENT,
      }

      const result = RegisterSchema.safeParse(invalidData)
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

      const result = RegisterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Name is required')
      }
    })

    it('should reject name longer than 255 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'a'.repeat(256),
        role: USER_ROLES.STUDENT,
      }

      const result = RegisterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Name must not exceed 255 characters'
        )
      }
    })

    it('should reject invalid role', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        role: 'invalid-role',
      }

      const result = RegisterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Invalid enum value')
      }
    })

    it('should reject missing role', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
      }

      const result = RegisterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Role is required')
      }
    })
  })
})

describe('OAuthCallbackSchema', () => {
  describe('valid inputs', () => {
    it('should validate OAuth callback with code and state', () => {
      const validData = {
        code: 'oauth-code-123',
        state: 'state-token-456',
      }

      const result = OAuthCallbackSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate OAuth callback with code only', () => {
      const validData = {
        code: 'oauth-code-123',
      }

      const result = OAuthCallbackSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing code', () => {
      const invalidData = {
        state: 'state-token-456',
      }

      const result = OAuthCallbackSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Authorization code is required'
        )
      }
    })

    it('should reject empty code', () => {
      const invalidData = {
        code: '',
        state: 'state-token-456',
      }

      const result = OAuthCallbackSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Authorization code is required'
        )
      }
    })

    it('should reject non-string code', () => {
      const invalidData = {
        code: 123,
      }

      const result = OAuthCallbackSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Authorization code must be a string'
        )
      }
    })
  })
})

describe('RefreshTokenSchema', () => {
  describe('valid inputs', () => {
    it('should validate refresh token', () => {
      const validData = {
        refreshToken: 'valid-refresh-token-123',
      }

      const result = RefreshTokenSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing refresh token', () => {
      const invalidData = {}

      const result = RefreshTokenSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Refresh token is required'
        )
      }
    })

    it('should reject empty refresh token', () => {
      const invalidData = {
        refreshToken: '',
      }

      const result = RefreshTokenSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Refresh token is required'
        )
      }
    })

    it('should reject non-string refresh token', () => {
      const invalidData = {
        refreshToken: 123,
      }

      const result = RefreshTokenSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Refresh token must be a string'
        )
      }
    })
  })
})

describe('PasswordResetRequestSchema', () => {
  describe('valid inputs', () => {
    it('should validate password reset request', () => {
      const validData = {
        email: 'test@example.com',
      }

      const result = PasswordResetRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should lowercase and trim email', () => {
      const validData = {
        email: '  Test@EXAMPLE.COM  ',
      }

      const result = PasswordResetRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing email', () => {
      const invalidData = {}

      const result = PasswordResetRequestSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Email is required')
      }
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'not-an-email',
      }

      const result = PasswordResetRequestSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid email format')
      }
    })
  })
})

describe('PasswordResetSchema', () => {
  describe('valid inputs', () => {
    it('should validate password reset with token', () => {
      const validData = {
        token: 'reset-token-123',
        password: 'NewPassword123!',
      }

      const result = PasswordResetSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing token', () => {
      const invalidData = {
        password: 'NewPassword123!',
      }

      const result = PasswordResetSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Reset token is required')
      }
    })

    it('should reject empty token', () => {
      const invalidData = {
        token: '',
        password: 'NewPassword123!',
      }

      const result = PasswordResetSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Reset token is required')
      }
    })

    it('should reject weak password', () => {
      const invalidData = {
        token: 'reset-token-123',
        password: 'weak',
      }

      const result = PasswordResetSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Password must be at least 8 characters'
        )
      }
    })
  })
})

describe('ChangePasswordSchema', () => {
  describe('valid inputs', () => {
    it('should validate password change request', () => {
      const validData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }

      const result = ChangePasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing current password', () => {
      const invalidData = {
        newPassword: 'NewPassword123!',
      }

      const result = ChangePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Current password is required'
        )
      }
    })

    it('should reject empty current password', () => {
      const invalidData = {
        currentPassword: '',
        newPassword: 'NewPassword123!',
      }

      const result = ChangePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Current password is required'
        )
      }
    })

    it('should reject missing new password', () => {
      const invalidData = {
        currentPassword: 'OldPassword123!',
      }

      const result = ChangePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'New password is required'
        )
      }
    })

    it('should reject weak new password', () => {
      const invalidData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weak',
      }

      const result = ChangePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Password must be at least 8 characters'
        )
      }
    })
  })
})
