/**
 * @module class.test
 * @description Tests for class validation schemas
 */

import { describe, it, expect } from 'vitest'
import {
  CreateClassSchema,
  UpdateClassSchema,
  ClassQuerySchema,
  AddStudentSchema,
  AddMultipleStudentsSchema,
  RemoveStudentSchema,
  ClassIdParamSchema,
  ClassStudentParamsSchema,
  TransferStudentsSchema,
} from '../class'

describe('CreateClassSchema', () => {
  describe('valid inputs', () => {
    it('should validate class with name and description', () => {
      const validData = {
        name: 'Mathematics 101',
        description: 'Introduction to basic mathematics',
      }

      const result = CreateClassSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Mathematics 101')
        expect(result.data.description).toBe('Introduction to basic mathematics')
      }
    })

    it('should validate class with name only', () => {
      const validData = {
        name: 'Mathematics 101',
      }

      const result = CreateClassSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should trim class name', () => {
      const validData = {
        name: '  Mathematics 101  ',
      }

      const result = CreateClassSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Mathematics 101')
      }
    })

    it('should trim description', () => {
      const validData = {
        name: 'Mathematics 101',
        description: '  Introduction to basic mathematics  ',
      }

      const result = CreateClassSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBe('Introduction to basic mathematics')
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing name', () => {
      const invalidData = {}

      const result = CreateClassSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Class name is required')
      }
    })

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
      }

      const result = CreateClassSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Class name is required')
      }
    })

    it('should reject name exceeding 255 characters', () => {
      const invalidData = {
        name: 'a'.repeat(256),
      }

      const result = CreateClassSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Class name must not exceed 255 characters'
        )
      }
    })

    it('should reject non-string name', () => {
      const invalidData = {
        name: 123,
      }

      const result = CreateClassSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Class name must be a string')
      }
    })

    it('should reject non-string description', () => {
      const invalidData = {
        name: 'Mathematics 101',
        description: 123,
      }

      const result = CreateClassSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Description must be a string')
      }
    })
  })
})

describe('UpdateClassSchema', () => {
  describe('valid inputs', () => {
    it('should validate update with name and description', () => {
      const validData = {
        name: 'Advanced Mathematics',
        description: 'Advanced topics in mathematics',
      }

      const result = UpdateClassSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate update with name only', () => {
      const validData = {
        name: 'Advanced Mathematics',
      }

      const result = UpdateClassSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate update with description only', () => {
      const validData = {
        description: 'Updated description',
      }

      const result = UpdateClassSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate empty object', () => {
      const validData = {}

      const result = UpdateClassSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should trim name', () => {
      const validData = {
        name: '  Advanced Mathematics  ',
      }

      const result = UpdateClassSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Advanced Mathematics')
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject empty name', () => {
      const invalidData = {
        name: '',
      }

      const result = UpdateClassSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Class name cannot be empty')
      }
    })

    it('should reject name exceeding 255 characters', () => {
      const invalidData = {
        name: 'a'.repeat(256),
      }

      const result = UpdateClassSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Class name must not exceed 255 characters'
        )
      }
    })

    it('should reject non-string name', () => {
      const invalidData = {
        name: 123,
      }

      const result = UpdateClassSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Class name must be a string')
      }
    })
  })
})

describe('ClassQuerySchema', () => {
  describe('valid inputs', () => {
    it('should validate query with all parameters', () => {
      const validData = {
        teacherId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '223e4567-e89b-12d3-a456-426614174001',
        search: 'math',
        page: '1',
        limit: '10',
      }

      const result = ClassQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.teacherId).toBe('123e4567-e89b-12d3-a456-426614174000')
        expect(result.data.studentId).toBe('223e4567-e89b-12d3-a456-426614174001')
        expect(result.data.search).toBe('math')
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10)
      }
    })

    it('should validate query with no parameters', () => {
      const validData = {}

      const result = ClassQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should transform page string to number', () => {
      const validData = {
        page: '5',
      }

      const result = ClassQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(5)
      }
    })

    it('should transform limit string to number', () => {
      const validData = {
        limit: '25',
      }

      const result = ClassQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(25)
      }
    })

    it('should trim search parameter', () => {
      const validData = {
        search: '  mathematics  ',
      }

      const result = ClassQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe('mathematics')
      }
    })
  })

  describe('invalid inputs', () => {
    it('should reject invalid teacher ID format', () => {
      const invalidData = {
        teacherId: 'not-a-uuid',
      }

      const result = ClassQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid teacher ID format')
      }
    })

    it('should reject invalid student ID format', () => {
      const invalidData = {
        studentId: 'not-a-uuid',
      }

      const result = ClassQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid student ID format')
      }
    })

    it('should reject non-numeric page', () => {
      const invalidData = {
        page: 'abc',
      }

      const result = ClassQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Page must be a positive integer'
        )
      }
    })

    it('should reject limit exceeding 100', () => {
      const invalidData = {
        limit: '101',
      }

      const result = ClassQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Limit must not exceed 100'
        )
      }
    })
  })
})

describe('AddStudentSchema', () => {
  describe('valid inputs', () => {
    it('should validate valid student ID', () => {
      const validData = {
        studentId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = AddStudentSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing student ID', () => {
      const invalidData = {}

      const result = AddStudentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Student ID is required')
      }
    })

    it('should reject invalid student ID format', () => {
      const invalidData = {
        studentId: 'not-a-uuid',
      }

      const result = AddStudentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid student ID format')
      }
    })

    it('should reject non-string student ID', () => {
      const invalidData = {
        studentId: 123,
      }

      const result = AddStudentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Student ID must be a string')
      }
    })
  })
})

describe('AddMultipleStudentsSchema', () => {
  describe('valid inputs', () => {
    it('should validate single student ID', () => {
      const validData = {
        studentIds: ['123e4567-e89b-12d3-a456-426614174000'],
      }

      const result = AddMultipleStudentsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate multiple student IDs', () => {
      const validData = {
        studentIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '223e4567-e89b-12d3-a456-426614174001',
          '323e4567-e89b-12d3-a456-426614174002',
        ],
      }

      const result = AddMultipleStudentsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate 100 student IDs', () => {
      const validData = {
        studentIds: Array.from({ length: 100 }, (_, i) =>
          `${i.toString().padStart(8, '0')}-0000-0000-0000-000000000000`
        ),
      }

      const result = AddMultipleStudentsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing studentIds', () => {
      const invalidData = {}

      const result = AddMultipleStudentsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Student IDs are required')
      }
    })

    it('should reject empty array', () => {
      const invalidData = {
        studentIds: [],
      }

      const result = AddMultipleStudentsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'At least one student ID is required'
        )
      }
    })

    it('should reject more than 100 student IDs', () => {
      const invalidData = {
        studentIds: Array.from({ length: 101 }, (_, i) =>
          `${i.toString().padStart(8, '0')}-0000-0000-0000-000000000000`
        ),
      }

      const result = AddMultipleStudentsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Cannot add more than 100 students at once'
        )
      }
    })

    it('should reject invalid UUID in array', () => {
      const invalidData = {
        studentIds: ['not-a-uuid'],
      }

      const result = AddMultipleStudentsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid student ID format')
      }
    })
  })
})

describe('RemoveStudentSchema', () => {
  describe('valid inputs', () => {
    it('should validate valid student ID', () => {
      const validData = {
        studentId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = RemoveStudentSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing student ID', () => {
      const invalidData = {}

      const result = RemoveStudentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Student ID is required')
      }
    })

    it('should reject invalid student ID format', () => {
      const invalidData = {
        studentId: 'not-a-uuid',
      }

      const result = RemoveStudentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid student ID format')
      }
    })
  })
})

describe('ClassIdParamSchema', () => {
  describe('valid inputs', () => {
    it('should validate valid class ID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = ClassIdParamSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing class ID', () => {
      const invalidData = {}

      const result = ClassIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Class ID is required')
      }
    })

    it('should reject invalid class ID format', () => {
      const invalidData = {
        id: 'not-a-uuid',
      }

      const result = ClassIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid class ID format')
      }
    })

    it('should reject non-string class ID', () => {
      const invalidData = {
        id: 123,
      }

      const result = ClassIdParamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Class ID must be a string')
      }
    })
  })
})

describe('ClassStudentParamsSchema', () => {
  describe('valid inputs', () => {
    it('should validate valid class and student IDs', () => {
      const validData = {
        classId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '223e4567-e89b-12d3-a456-426614174001',
      }

      const result = ClassStudentParamsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing class ID', () => {
      const invalidData = {
        studentId: '223e4567-e89b-12d3-a456-426614174001',
      }

      const result = ClassStudentParamsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Class ID is required')
      }
    })

    it('should reject missing student ID', () => {
      const invalidData = {
        classId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = ClassStudentParamsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Student ID is required')
      }
    })

    it('should reject invalid class ID format', () => {
      const invalidData = {
        classId: 'not-a-uuid',
        studentId: '223e4567-e89b-12d3-a456-426614174001',
      }

      const result = ClassStudentParamsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid class ID format')
      }
    })

    it('should reject invalid student ID format', () => {
      const invalidData = {
        classId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: 'not-a-uuid',
      }

      const result = ClassStudentParamsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid student ID format')
      }
    })
  })
})

describe('TransferStudentsSchema', () => {
  describe('valid inputs', () => {
    it('should validate transfer with single student', () => {
      const validData = {
        studentIds: ['123e4567-e89b-12d3-a456-426614174000'],
        targetClassId: '223e4567-e89b-12d3-a456-426614174001',
      }

      const result = TransferStudentsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate transfer with multiple students', () => {
      const validData = {
        studentIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '223e4567-e89b-12d3-a456-426614174001',
        ],
        targetClassId: '323e4567-e89b-12d3-a456-426614174002',
      }

      const result = TransferStudentsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject missing studentIds', () => {
      const invalidData = {
        targetClassId: '223e4567-e89b-12d3-a456-426614174001',
      }

      const result = TransferStudentsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Student IDs are required')
      }
    })

    it('should reject missing targetClassId', () => {
      const invalidData = {
        studentIds: ['123e4567-e89b-12d3-a456-426614174000'],
      }

      const result = TransferStudentsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Target class ID is required')
      }
    })

    it('should reject empty studentIds array', () => {
      const invalidData = {
        studentIds: [],
        targetClassId: '223e4567-e89b-12d3-a456-426614174001',
      }

      const result = TransferStudentsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'At least one student ID is required'
        )
      }
    })

    it('should reject invalid target class ID format', () => {
      const invalidData = {
        studentIds: ['123e4567-e89b-12d3-a456-426614174000'],
        targetClassId: 'not-a-uuid',
      }

      const result = TransferStudentsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Invalid target class ID format'
        )
      }
    })
  })
})
