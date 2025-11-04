/**
 * @module auth
 * @description Authentication validation schemas
 */

import { z } from 'zod'
import { USER_ROLES } from '@concentrate/shared'

/**
 * Login validation schema
 * Validates user credentials for authentication
 */
export const LoginSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .trim()
    .toLowerCase()
    .email('Invalid email format'),
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(1, 'Password is required'),
})

/**
 * Registration validation schema
 * Validates new user registration data with strong password requirements
 */
export const RegisterSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .trim()
    .toLowerCase()
    .email('Invalid email format'),
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[^A-Za-z0-9]/,
      'Password must contain at least one special character'
    ),
  name: z
    .string({
      required_error: 'Name is required',
      invalid_type_error: 'Name must be a string',
    })
    .min(1, 'Name is required')
    .max(255, 'Name must not exceed 255 characters')
    .trim(),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT], {
    required_error: 'Role is required',
    invalid_type_error: 'Invalid role',
  }),
})

/**
 * OAuth callback validation schema
 * Validates OAuth provider callback data
 */
export const OAuthCallbackSchema = z.object({
  code: z
    .string({
      required_error: 'Authorization code is required',
      invalid_type_error: 'Authorization code must be a string',
    })
    .min(1, 'Authorization code is required'),
  state: z
    .string({
      required_error: 'State parameter is required',
      invalid_type_error: 'State parameter must be a string',
    })
    .min(1, 'State parameter is required')
    .optional(),
})

/**
 * Refresh token validation schema
 * Validates refresh token requests
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z
    .string({
      required_error: 'Refresh token is required',
      invalid_type_error: 'Refresh token must be a string',
    })
    .min(1, 'Refresh token is required'),
})

/**
 * Password reset request validation schema
 * Validates password reset email requests
 */
export const PasswordResetRequestSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .trim()
    .toLowerCase()
    .email('Invalid email format'),
})

/**
 * Password reset validation schema
 * Validates password reset with token
 */
export const PasswordResetSchema = z.object({
  token: z
    .string({
      required_error: 'Reset token is required',
      invalid_type_error: 'Reset token must be a string',
    })
    .min(1, 'Reset token is required'),
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[^A-Za-z0-9]/,
      'Password must contain at least one special character'
    ),
})

/**
 * Change password validation schema
 * Validates password change requests for authenticated users
 */
export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string({
      required_error: 'Current password is required',
      invalid_type_error: 'Current password must be a string',
    })
    .min(1, 'Current password is required'),
  newPassword: z
    .string({
      required_error: 'New password is required',
      invalid_type_error: 'New password must be a string',
    })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[^A-Za-z0-9]/,
      'Password must contain at least one special character'
    ),
})

// Export types inferred from schemas
export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type OAuthCallbackInput = z.infer<typeof OAuthCallbackSchema>
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>
export type PasswordResetRequestInput = z.infer<
  typeof PasswordResetRequestSchema
>
export type PasswordResetInput = z.infer<typeof PasswordResetSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
