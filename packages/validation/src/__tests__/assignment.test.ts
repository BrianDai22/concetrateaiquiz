/**
 * @module assignment.test
 * @description Tests for assignment validation schemas
 */

import { describe, it, expect } from 'vitest'
import {
  CreateAssignmentSchema,
  UpdateAssignmentSchema,
  AssignmentQuerySchema,
  SubmitAssignmentSchema,
  UpdateSubmissionSchema,
  GradeSubmissionSchema,
  UpdateGradeSchema,
  AssignmentIdParamSchema,
  SubmissionIdParamSchema,
  GradeIdParamSchema,
  AssignmentSubmissionParamsSchema,
  BulkGradeSubmissionsSchema,
} from '../assignment'

describe('CreateAssignmentSchema', () => {
  describe('valid inputs', () => {
    it('should validate assignment with all fields', () => {
      const validData = {
        title: 'Homework Assignment 1',
        description: 'Complete exercises 1-10 from chapter 3',
        dueDate: '2024-12-31T23:59:59Z',
      }

      const result = CreateAssignmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Homework Assignment 1')
        expect(result.data.description).toBe('Complete exercises 1-10 from chapter 3')
        expect(result.data.dueDate).toBe('2024-12-31T23:59:59Z')
      }
    })

    it('should trim title and description', () => {
      const validData = {
        title: '  Homework Assignment 1  ',
        description: '  Complete exercises 1-10  ',
        dueDate: '2024-12-31T23:59:59Z',
      }

      const result = CreateAssignmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Homework Assignment 1')
        expect(result.data.description).toBe('Complete exercises 1-10')
      }
    })

    it('should accept ISO 8601 datetime formats', () => {
      const validData = {
        title: 'Assignment',
        description: 'Description',
        dueDate: '2024-12-31T23:59:59.000Z',
      }

      const result = CreateAssignmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing title', () => {
      const invalidData = {
        description: 'Complete exercises 1-10',
        dueDate: '2024-12-31T23:59:59Z',
      }

      const result = CreateAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Assignment title is required')
      }
    })

    it('should reject empty title', () => {
      const invalidData = {
        title: '',
        description: 'Complete exercises 1-10',
        dueDate: '2024-12-31T23:59:59Z',
      }

      const result = CreateAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Assignment title is required')
      }
    })

    it('should reject title exceeding 255 characters', () => {
      const invalidData = {
        title: 'a'.repeat(256),
        description: 'Complete exercises 1-10',
        dueDate: '2024-12-31T23:59:59Z',
      }

      const result = CreateAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Assignment title must not exceed 255 characters'
        )
      }
    })

    it('should reject missing description', () => {
      const invalidData = {
        title: 'Homework Assignment 1',
        dueDate: '2024-12-31T23:59:59Z',
      }

      const result = CreateAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Assignment description is required'
        )
      }
    })

    it('should reject empty description', () => {
      const invalidData = {
        title: 'Homework Assignment 1',
        description: '',
        dueDate: '2024-12-31T23:59:59Z',
      }

      const result = CreateAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Assignment description is required'
        )
      }
    })

    it('should reject missing due date', () => {
      const invalidData = {
        title: 'Homework Assignment 1',
        description: 'Complete exercises 1-10',
      }

      const result = CreateAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Due date is required')
      }
    })

    it('should reject invalid datetime format', () => {
      const invalidData = {
        title: 'Homework Assignment 1',
        description: 'Complete exercises 1-10',
        dueDate: '2024-12-31',
      }

      const result = CreateAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Due date must be in ISO 8601 format'
        )
      }
    })

    it('should reject non-string title', () => {
      const invalidData = {
        title: 123,
        description: 'Complete exercises 1-10',
        dueDate: '2024-12-31T23:59:59Z',
      }

      const result = CreateAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Assignment title must be a string'
        )
      }
    })
  })
})

describe('UpdateAssignmentSchema', () => {
  describe('valid inputs', () => {
    it('should validate update with all fields', () => {
      const validData = {
        title: 'Updated Assignment',
        description: 'Updated description',
        dueDate: '2024-12-31T23:59:59Z',
      }

      const result = UpdateAssignmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate update with single field', () => {
      const validData = {
        title: 'Updated Assignment',
      }

      const result = UpdateAssignmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate empty object', () => {
      const validData = {}

      const result = UpdateAssignmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should trim title and description', () => {
      const validData = {
        title: '  Updated Assignment  ',
        description: '  Updated description  ',
      }

      const result = UpdateAssignmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Updated Assignment')
        expect(result.data.description).toBe('Updated description')
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject empty title', () => {
      const invalidData = {
        title: '',
      }

      const result = UpdateAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Assignment title cannot be empty'
        )
      }
    })

    it('should reject empty description', () => {
      const invalidData = {
        description: '',
      }

      const result = UpdateAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Assignment description cannot be empty'
        )
      }
    })

    it('should reject invalid datetime format', () => {
      const invalidData = {
        dueDate: 'not-a-datetime',
      }

      const result = UpdateAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Due date must be in ISO 8601 format'
        )
      }
    })
  })
})

describe('AssignmentQuerySchema', () => {
  describe('valid inputs', () => {
    it('should validate query with all parameters', () => {
      const validData = {
        classId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '223e4567-e89b-12d3-a456-426614174001',
        search: 'homework',
        page: '1',
        limit: '10',
      }

      const result = AssignmentQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10)
      }
    })

    it('should validate query with no parameters', () => {
      const validData = {}

      const result = AssignmentQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should transform page and limit to numbers', () => {
      const validData = {
        page: '5',
        limit: '25',
      }

      const result = AssignmentQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(5)
        expect(result.data.limit).toBe(25)
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject invalid class ID', () => {
      const invalidData = {
        classId: 'not-a-uuid',
      }

      const result = AssignmentQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid class ID format')
      }
    })

    it('should reject invalid student ID', () => {
      const invalidData = {
        studentId: 'not-a-uuid',
      }

      const result = AssignmentQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid student ID format')
      }
    })

    it('should reject limit exceeding 100', () => {
      const invalidData = {
        limit: '101',
      }

      const result = AssignmentQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Limit must not exceed 100')
      }
    })
  })
})

describe('SubmitAssignmentSchema', () => {
  describe('valid inputs', () => {
    it('should validate submission with content only', () => {
      const validData = {
        content: 'My submission content',
      }

      const result = SubmitAssignmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate submission with content and file URL', () => {
      const validData = {
        content: 'My submission content',
        fileUrl: 'https://example.com/files/submission.pdf',
      }

      const result = SubmitAssignmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should trim content', () => {
      const validData = {
        content: '  My submission content  ',
      }

      const result = SubmitAssignmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe('My submission content')
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing content', () => {
      const invalidData = {}

      const result = SubmitAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Submission content is required')
      }
    })

    it('should reject empty content', () => {
      const invalidData = {
        content: '',
      }

      const result = SubmitAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Submission content is required')
      }
    })

    it('should reject invalid file URL', () => {
      const invalidData = {
        content: 'My submission content',
        fileUrl: 'not-a-url',
      }

      const result = SubmitAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid file URL format')
      }
    })

    it('should reject file URL exceeding 500 characters', () => {
      const invalidData = {
        content: 'My submission content',
        fileUrl: 'https://example.com/' + 'a'.repeat(500),
      }

      const result = SubmitAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'File URL must not exceed 500 characters'
        )
      }
    })

    it('should reject non-string content', () => {
      const invalidData = {
        content: 123,
      }

      const result = SubmitAssignmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Submission content must be a string'
        )
      }
    })
  })
})

describe('UpdateSubmissionSchema', () => {
  describe('valid inputs', () => {
    it('should validate update with content', () => {
      const validData = {
        content: 'Updated submission content',
      }

      const result = UpdateSubmissionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate update with file URL', () => {
      const validData = {
        fileUrl: 'https://example.com/files/updated.pdf',
      }

      const result = UpdateSubmissionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate empty object', () => {
      const validData = {}

      const result = UpdateSubmissionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject empty content', () => {
      const invalidData = {
        content: '',
      }

      const result = UpdateSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Submission content cannot be empty'
        )
      }
    })

    it('should reject invalid file URL', () => {
      const invalidData = {
        fileUrl: 'not-a-url',
      }

      const result = UpdateSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid file URL format')
      }
    })
  })
})

describe('GradeSubmissionSchema', () => {
  describe('valid inputs', () => {
    it('should validate grade with feedback', () => {
      const validData = {
        grade: 85.5,
        feedback: 'Good work!',
      }

      const result = GradeSubmissionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate grade without feedback', () => {
      const validData = {
        grade: 90,
      }

      const result = GradeSubmissionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate grade of 0', () => {
      const validData = {
        grade: 0,
      }

      const result = GradeSubmissionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate grade of 100', () => {
      const validData = {
        grade: 100,
      }

      const result = GradeSubmissionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate grade with 2 decimal places', () => {
      const validData = {
        grade: 85.75,
      }

      const result = GradeSubmissionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing grade', () => {
      const invalidData = {}

      const result = GradeSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Grade is required')
      }
    })

    it('should reject grade below 0', () => {
      const invalidData = {
        grade: -1,
      }

      const result = GradeSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Grade must be at least 0')
      }
    })

    it('should reject grade above 100', () => {
      const invalidData = {
        grade: 101,
      }

      const result = GradeSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Grade must not exceed 100')
      }
    })

    it('should reject grade with more than 2 decimal places', () => {
      const invalidData = {
        grade: 85.755,
      }

      const result = GradeSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Grade must have at most 2 decimal places'
        )
      }
    })

    it('should reject non-number grade', () => {
      const invalidData = {
        grade: '85',
      }

      const result = GradeSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Grade must be a number')
      }
    })

    it('should reject non-string feedback', () => {
      const invalidData = {
        grade: 85,
        feedback: 123,
      }

      const result = GradeSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Feedback must be a string')
      }
    })
  })
})

describe('UpdateGradeSchema', () => {
  describe('valid inputs', () => {
    it('should validate update with grade', () => {
      const validData = {
        grade: 90,
      }

      const result = UpdateGradeSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate update with feedback', () => {
      const validData = {
        feedback: 'Updated feedback',
      }

      const result = UpdateGradeSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate empty object', () => {
      const validData = {}

      const result = UpdateGradeSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject grade below 0', () => {
      const invalidData = {
        grade: -1,
      }

      const result = UpdateGradeSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Grade must be at least 0')
      }
    })

    it('should reject grade above 100', () => {
      const invalidData = {
        grade: 101,
      }

      const result = UpdateGradeSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Grade must not exceed 100')
      }
    })
  })
})

describe('AssignmentIdParamSchema', () => {
  describe('valid inputs', () => {
    it('should validate valid assignment ID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = AssignmentIdParamSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing assignment ID', () => {
      const invalidData = {}

      const result = AssignmentIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Assignment ID is required')
      }
    })

    it('should reject invalid assignment ID format', () => {
      const invalidData = {
        id: 'not-a-uuid',
      }

      const result = AssignmentIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid assignment ID format')
      }
    })
  })
})

describe('SubmissionIdParamSchema', () => {
  describe('valid inputs', () => {
    it('should validate valid submission ID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = SubmissionIdParamSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing submission ID', () => {
      const invalidData = {}

      const result = SubmissionIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Submission ID is required')
      }
    })

    it('should reject invalid submission ID format', () => {
      const invalidData = {
        id: 'not-a-uuid',
      }

      const result = SubmissionIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid submission ID format')
      }
    })
  })
})

describe('GradeIdParamSchema', () => {
  describe('valid inputs', () => {
    it('should validate valid grade ID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = GradeIdParamSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing grade ID', () => {
      const invalidData = {}

      const result = GradeIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Grade ID is required')
      }
    })

    it('should reject invalid grade ID format', () => {
      const invalidData = {
        id: 'not-a-uuid',
      }

      const result = GradeIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid grade ID format')
      }
    })
  })
})

describe('AssignmentSubmissionParamsSchema', () => {
  describe('valid inputs', () => {
    it('should validate valid assignment and submission IDs', () => {
      const validData = {
        assignmentId: '123e4567-e89b-12d3-a456-426614174000',
        submissionId: '223e4567-e89b-12d3-a456-426614174001',
      }

      const result = AssignmentSubmissionParamsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing assignment ID', () => {
      const invalidData = {
        submissionId: '223e4567-e89b-12d3-a456-426614174001',
      }

      const result = AssignmentSubmissionParamsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Assignment ID is required')
      }
    })

    it('should reject missing submission ID', () => {
      const invalidData = {
        assignmentId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = AssignmentSubmissionParamsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Submission ID is required')
      }
    })

    it('should reject invalid assignment ID format', () => {
      const invalidData = {
        assignmentId: 'not-a-uuid',
        submissionId: '223e4567-e89b-12d3-a456-426614174001',
      }

      const result = AssignmentSubmissionParamsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid assignment ID format')
      }
    })
  })
})

describe('BulkGradeSubmissionsSchema', () => {
  describe('valid inputs', () => {
    it('should validate single grade', () => {
      const validData = {
        grades: [
          {
            submissionId: '123e4567-e89b-12d3-a456-426614174000',
            grade: 85.5,
            feedback: 'Good work',
          },
        ],
      }

      const result = BulkGradeSubmissionsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate multiple grades', () => {
      const validData = {
        grades: [
          {
            submissionId: '123e4567-e89b-12d3-a456-426614174000',
            grade: 85.5,
          },
          {
            submissionId: '223e4567-e89b-12d3-a456-426614174001',
            grade: 90,
            feedback: 'Excellent!',
          },
        ],
      }

      const result = BulkGradeSubmissionsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate 50 grades', () => {
      const validData = {
        grades: Array.from({ length: 50 }, (_, i) => ({
          submissionId: `${i.toString().padStart(8, '0')}-0000-0000-0000-000000000000`,
          grade: 85,
        })),
      }

      const result = BulkGradeSubmissionsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing grades', () => {
      const invalidData = {}

      const result = BulkGradeSubmissionsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Grades are required')
      }
    })

    it('should reject empty grades array', () => {
      const invalidData = {
        grades: [],
      }

      const result = BulkGradeSubmissionsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('At least one grade is required')
      }
    })

    it('should reject more than 50 grades', () => {
      const invalidData = {
        grades: Array.from({ length: 51 }, (_, i) => ({
          submissionId: `${i.toString().padStart(8, '0')}-0000-0000-0000-000000000000`,
          grade: 85,
        })),
      }

      const result = BulkGradeSubmissionsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Cannot grade more than 50 submissions at once'
        )
      }
    })

    it('should reject invalid submission ID in array', () => {
      const invalidData = {
        grades: [
          {
            submissionId: 'not-a-uuid',
            grade: 85,
          },
        ],
      }

      const result = BulkGradeSubmissionsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid submission ID format')
      }
    })

    it('should reject invalid grade in array', () => {
      const invalidData = {
        grades: [
          {
            submissionId: '123e4567-e89b-12d3-a456-426614174000',
            grade: 101,
          },
        ],
      }

      const result = BulkGradeSubmissionsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Grade must not exceed 100')
      }
    })
  })
})
