/**
 * @module user
 * @description User validation schemas
 */

import { z } from 'zod'
import { USER_ROLES } from '@concentrate/shared'

/**
 * Create user validation schema
 * For admin users to create new user accounts
 */
export const CreateUserSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .trim()
    .toLowerCase()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters'),
  password: z
    .string({
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
    )
    .optional(), // Optional for OAuth users
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
  suspended: z
    .boolean({
      invalid_type_error: 'Suspended must be a boolean',
    })
    .optional()
    .default(false),
})

/**
 * Update user validation schema
 * For updating user profile information
 */
export const UpdateUserSchema = z.object({
  email: z
    .string({
      invalid_type_error: 'Email must be a string',
    })
    .trim()
    .toLowerCase()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .optional(),
  name: z
    .string({
      invalid_type_error: 'Name must be a string',
    })
    .min(1, 'Name cannot be empty')
    .max(255, 'Name must not exceed 255 characters')
    .trim()
    .optional(),
  role: z
    .enum([USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT], {
      invalid_type_error: 'Invalid role',
    })
    .optional(),
})

/**
 * User query validation schema
 * For filtering and searching users
 */
export const UserQuerySchema = z.object({
  role: z
    .enum([USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT], {
      invalid_type_error: 'Invalid role',
    })
    .optional(),
  suspended: z
    .enum(['true', 'false'], {
      invalid_type_error: 'Suspended must be "true" or "false"',
    })
    .transform((val) => val === 'true')
    .optional(),
  search: z
    .string({
      invalid_type_error: 'Search must be a string',
    })
    .trim()
    .optional(),
  page: z
    .string({
      invalid_type_error: 'Page must be a string',
    })
    .regex(/^\d+$/, 'Page must be a positive integer')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive('Page must be a positive integer'))
    .optional(),
  limit: z
    .string({
      invalid_type_error: 'Limit must be a string',
    })
    .regex(/^\d+$/, 'Limit must be a positive integer')
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .int()
        .positive('Limit must be a positive integer')
        .max(100, 'Limit must not exceed 100')
    )
    .optional(),
})

/**
 * Suspend user validation schema
 * For suspending or unsuspending user accounts
 */
export const SuspendUserSchema = z.object({
  suspended: z.boolean({
    required_error: 'Suspended status is required',
    invalid_type_error: 'Suspended must be a boolean',
  }),
})

/**
 * User ID parameter validation schema
 * For validating UUID parameters in routes
 */
export const UserIdParamSchema = z.object({
  id: z
    .string({
      required_error: 'User ID is required',
      invalid_type_error: 'User ID must be a string',
    })
    .uuid('Invalid user ID format'),
})

/**
 * Batch user operation validation schema
 * For operations on multiple users at once
 */
export const BatchUserOperationSchema = z.object({
  userIds: z
    .array(
      z.string().uuid('Invalid user ID format'),
      {
        required_error: 'User IDs are required',
        invalid_type_error: 'User IDs must be an array',
      }
    )
    .min(1, 'At least one user ID is required')
    .max(100, 'Cannot process more than 100 users at once'),
})

// Export types inferred from schemas
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type UserQueryInput = z.infer<typeof UserQuerySchema>
export type SuspendUserInput = z.infer<typeof SuspendUserSchema>
export type UserIdParam = z.infer<typeof UserIdParamSchema>
export type BatchUserOperationInput = z.infer<typeof BatchUserOperationSchema>
