/**
 * @module assignment
 * @description Assignment validation schemas
 */

import { z } from 'zod'

/**
 * Create assignment validation schema
 * For teachers to create new assignments for a class
 */
export const CreateAssignmentSchema = z.object({
  title: z
    .string({
      required_error: 'Assignment title is required',
      invalid_type_error: 'Assignment title must be a string',
    })
    .min(1, 'Assignment title is required')
    .max(255, 'Assignment title must not exceed 255 characters')
    .trim(),
  description: z
    .string({
      required_error: 'Assignment description is required',
      invalid_type_error: 'Assignment description must be a string',
    })
    .min(1, 'Assignment description is required')
    .trim(),
  dueDate: z
    .string({
      required_error: 'Due date is required',
      invalid_type_error: 'Due date must be a string',
    })
    .datetime('Due date must be in ISO 8601 format'),
})

/**
 * Update assignment validation schema
 * For teachers to update assignment details
 */
export const UpdateAssignmentSchema = z.object({
  title: z
    .string({
      invalid_type_error: 'Assignment title must be a string',
    })
    .min(1, 'Assignment title cannot be empty')
    .max(255, 'Assignment title must not exceed 255 characters')
    .trim()
    .optional(),
  description: z
    .string({
      invalid_type_error: 'Assignment description must be a string',
    })
    .min(1, 'Assignment description cannot be empty')
    .trim()
    .optional(),
  dueDate: z
    .string({
      invalid_type_error: 'Due date must be a string',
    })
    .datetime('Due date must be in ISO 8601 format')
    .optional(),
})

/**
 * Assignment query validation schema
 * For filtering and searching assignments
 */
export const AssignmentQuerySchema = z.object({
  classId: z
    .string({
      invalid_type_error: 'Class ID must be a string',
    })
    .uuid('Invalid class ID format')
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
 * Submit assignment validation schema
 * For students to submit their assignments
 */
export const SubmitAssignmentSchema = z.object({
  content: z
    .string({
      required_error: 'Submission content is required',
      invalid_type_error: 'Submission content must be a string',
    })
    .min(1, 'Submission content is required')
    .trim(),
  fileUrl: z
    .string({
      invalid_type_error: 'File URL must be a string',
    })
    .url('Invalid file URL format')
    .max(500, 'File URL must not exceed 500 characters')
    .optional(),
})

/**
 * Update submission validation schema
 * For students to update their submissions before grading
 */
export const UpdateSubmissionSchema = z.object({
  content: z
    .string({
      invalid_type_error: 'Submission content must be a string',
    })
    .min(1, 'Submission content cannot be empty')
    .trim()
    .optional(),
  fileUrl: z
    .string({
      invalid_type_error: 'File URL must be a string',
    })
    .url('Invalid file URL format')
    .max(500, 'File URL must not exceed 500 characters')
    .optional(),
})

/**
 * Grade submission validation schema
 * For teachers to grade student submissions
 */
export const GradeSubmissionSchema = z.object({
  grade: z
    .number({
      required_error: 'Grade is required',
      invalid_type_error: 'Grade must be a number',
    })
    .min(0, 'Grade must be at least 0')
    .max(100, 'Grade must not exceed 100')
    .multipleOf(0.01, 'Grade must have at most 2 decimal places'),
  feedback: z
    .string({
      invalid_type_error: 'Feedback must be a string',
    })
    .trim()
    .optional(),
})

/**
 * Update grade validation schema
 * For teachers to update existing grades
 */
export const UpdateGradeSchema = z.object({
  grade: z
    .number({
      invalid_type_error: 'Grade must be a number',
    })
    .min(0, 'Grade must be at least 0')
    .max(100, 'Grade must not exceed 100')
    .multipleOf(0.01, 'Grade must have at most 2 decimal places')
    .optional(),
  feedback: z
    .string({
      invalid_type_error: 'Feedback must be a string',
    })
    .trim()
    .optional(),
})

/**
 * Assignment ID parameter validation schema
 * For validating UUID parameters in routes
 */
export const AssignmentIdParamSchema = z.object({
  id: z
    .string({
      required_error: 'Assignment ID is required',
      invalid_type_error: 'Assignment ID must be a string',
    })
    .uuid('Invalid assignment ID format'),
})

/**
 * Submission ID parameter validation schema
 * For validating submission UUID parameters in routes
 */
export const SubmissionIdParamSchema = z.object({
  id: z
    .string({
      required_error: 'Submission ID is required',
      invalid_type_error: 'Submission ID must be a string',
    })
    .uuid('Invalid submission ID format'),
})

/**
 * Grade ID parameter validation schema
 * For validating grade UUID parameters in routes
 */
export const GradeIdParamSchema = z.object({
  id: z
    .string({
      required_error: 'Grade ID is required',
      invalid_type_error: 'Grade ID must be a string',
    })
    .uuid('Invalid grade ID format'),
})

/**
 * Assignment and submission parameters validation schema
 * For routes that require both assignment and submission IDs
 */
export const AssignmentSubmissionParamsSchema = z.object({
  assignmentId: z
    .string({
      required_error: 'Assignment ID is required',
      invalid_type_error: 'Assignment ID must be a string',
    })
    .uuid('Invalid assignment ID format'),
  submissionId: z
    .string({
      required_error: 'Submission ID is required',
      invalid_type_error: 'Submission ID must be a string',
    })
    .uuid('Invalid submission ID format'),
})

/**
 * Bulk grade submissions validation schema
 * For grading multiple submissions at once
 */
export const BulkGradeSubmissionsSchema = z.object({
  grades: z
    .array(
      z.object({
        submissionId: z.string().uuid('Invalid submission ID format'),
        grade: z
          .number()
          .min(0, 'Grade must be at least 0')
          .max(100, 'Grade must not exceed 100')
          .multipleOf(0.01, 'Grade must have at most 2 decimal places'),
        feedback: z.string().trim().optional(),
      }),
      {
        required_error: 'Grades are required',
        invalid_type_error: 'Grades must be an array',
      }
    )
    .min(1, 'At least one grade is required')
    .max(50, 'Cannot grade more than 50 submissions at once'),
})

// Export types inferred from schemas
export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>
export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentSchema>
export type AssignmentQueryInput = z.infer<typeof AssignmentQuerySchema>
export type SubmitAssignmentInput = z.infer<typeof SubmitAssignmentSchema>
export type UpdateSubmissionInput = z.infer<typeof UpdateSubmissionSchema>
export type GradeSubmissionInput = z.infer<typeof GradeSubmissionSchema>
export type UpdateGradeInput = z.infer<typeof UpdateGradeSchema>
export type AssignmentIdParam = z.infer<typeof AssignmentIdParamSchema>
export type SubmissionIdParam = z.infer<typeof SubmissionIdParamSchema>
export type GradeIdParam = z.infer<typeof GradeIdParamSchema>
export type AssignmentSubmissionParams = z.infer<
  typeof AssignmentSubmissionParamsSchema
>
export type BulkGradeSubmissionsInput = z.infer<
  typeof BulkGradeSubmissionsSchema
>
