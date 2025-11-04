/**
 * @module class
 * @description Class validation schemas
 */

import { z } from 'zod'

/**
 * Create class validation schema
 * For teachers to create new classes
 */
export const CreateClassSchema = z.object({
  name: z
    .string({
      required_error: 'Class name is required',
      invalid_type_error: 'Class name must be a string',
    })
    .min(1, 'Class name is required')
    .max(255, 'Class name must not exceed 255 characters')
    .trim(),
  description: z
    .string({
      invalid_type_error: 'Description must be a string',
    })
    .trim()
    .optional(),
})

/**
 * Update class validation schema
 * For teachers to update class details
 */
export const UpdateClassSchema = z.object({
  name: z
    .string({
      invalid_type_error: 'Class name must be a string',
    })
    .min(1, 'Class name cannot be empty')
    .max(255, 'Class name must not exceed 255 characters')
    .trim()
    .optional(),
  description: z
    .string({
      invalid_type_error: 'Description must be a string',
    })
    .trim()
    .optional(),
})

/**
 * Class query validation schema
 * For filtering and searching classes
 */
export const ClassQuerySchema = z.object({
  teacherId: z
    .string({
      invalid_type_error: 'Teacher ID must be a string',
    })
    .uuid('Invalid teacher ID format')
    .optional(),
  studentId: z
    .string({
      invalid_type_error: 'Student ID must be a string',
    })
    .uuid('Invalid student ID format')
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
 * Add student validation schema
 * For adding a student to a class
 */
export const AddStudentSchema = z.object({
  studentId: z
    .string({
      required_error: 'Student ID is required',
      invalid_type_error: 'Student ID must be a string',
    })
    .uuid('Invalid student ID format'),
})

/**
 * Add multiple students validation schema
 * For adding multiple students to a class at once
 */
export const AddMultipleStudentsSchema = z.object({
  studentIds: z
    .array(
      z.string().uuid('Invalid student ID format'),
      {
        required_error: 'Student IDs are required',
        invalid_type_error: 'Student IDs must be an array',
      }
    )
    .min(1, 'At least one student ID is required')
    .max(100, 'Cannot add more than 100 students at once'),
})

/**
 * Remove student validation schema
 * For removing a student from a class
 */
export const RemoveStudentSchema = z.object({
  studentId: z
    .string({
      required_error: 'Student ID is required',
      invalid_type_error: 'Student ID must be a string',
    })
    .uuid('Invalid student ID format'),
})

/**
 * Class ID parameter validation schema
 * For validating UUID parameters in routes
 */
export const ClassIdParamSchema = z.object({
  id: z
    .string({
      required_error: 'Class ID is required',
      invalid_type_error: 'Class ID must be a string',
    })
    .uuid('Invalid class ID format'),
})

/**
 * Class and student ID parameters validation schema
 * For routes that require both class and student IDs
 */
export const ClassStudentParamsSchema = z.object({
  classId: z
    .string({
      required_error: 'Class ID is required',
      invalid_type_error: 'Class ID must be a string',
    })
    .uuid('Invalid class ID format'),
  studentId: z
    .string({
      required_error: 'Student ID is required',
      invalid_type_error: 'Student ID must be a string',
    })
    .uuid('Invalid student ID format'),
})

/**
 * Transfer students validation schema
 * For transferring students from one class to another
 */
export const TransferStudentsSchema = z.object({
  studentIds: z
    .array(
      z.string().uuid('Invalid student ID format'),
      {
        required_error: 'Student IDs are required',
        invalid_type_error: 'Student IDs must be an array',
      }
    )
    .min(1, 'At least one student ID is required')
    .max(100, 'Cannot transfer more than 100 students at once'),
  targetClassId: z
    .string({
      required_error: 'Target class ID is required',
      invalid_type_error: 'Target class ID must be a string',
    })
    .uuid('Invalid target class ID format'),
})

// Export types inferred from schemas
export type CreateClassInput = z.infer<typeof CreateClassSchema>
export type UpdateClassInput = z.infer<typeof UpdateClassSchema>
export type ClassQueryInput = z.infer<typeof ClassQuerySchema>
export type AddStudentInput = z.infer<typeof AddStudentSchema>
export type AddMultipleStudentsInput = z.infer<typeof AddMultipleStudentsSchema>
export type RemoveStudentInput = z.infer<typeof RemoveStudentSchema>
export type ClassIdParam = z.infer<typeof ClassIdParamSchema>
export type ClassStudentParams = z.infer<typeof ClassStudentParamsSchema>
export type TransferStudentsInput = z.infer<typeof TransferStudentsSchema>
