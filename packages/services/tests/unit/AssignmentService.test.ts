import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AssignmentService } from '../../src/AssignmentService'
import type { AssignmentRepository, ClassRepository } from '@concentrate/database'
import type { Assignment, Class, Submission, Grade } from '@concentrate/database'
import {
  NotFoundError,
  ForbiddenError,
  InvalidStateError,
  ValidationError,
} from '@concentrate/shared'

describe('AssignmentService - Unit Tests', () => {
  let service: AssignmentService
  let mockAssignmentRepository: Partial<AssignmentRepository>
  let mockClassRepository: Partial<ClassRepository>
  let mockDb: unknown

  const mockClass: Class = {
    id: 'class-123',
    name: 'Math 101',
    description: 'Math class',
    teacher_id: 'teacher-123',
    created_at: new Date(),
    updated_at: new Date(),
  }

  const mockAssignment: Assignment = {
    id: 'assignment-123',
    class_id: 'class-123',
    title: 'Homework 1',
    description: 'Complete exercises 1-10',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    created_at: new Date(),
    updated_at: new Date(),
  }

  const mockSubmission: Submission = {
    id: 'submission-123',
    assignment_id: 'assignment-123',
    student_id: 'student-123',
    content: 'My submission',
    file_url: null,
    submitted_at: new Date(),
    updated_at: new Date(),
  }

  const mockGrade: Grade = {
    id: 'grade-123',
    submission_id: 'submission-123',
    graded_by: 'teacher-123',
    grade: 85,
    feedback: 'Good work',
    graded_at: new Date(),
    updated_at: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockAssignmentRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByClass: vi.fn(),
      findByTeacher: vi.fn(),
      findByStudent: vi.fn(),
      findUpcoming: vi.fn(),
      findOverdue: vi.fn(),
      submitAssignment: vi.fn(),
      getSubmission: vi.fn(),
      getSubmissionsByAssignment: vi.fn(),
      getSubmissionsByStudent: vi.fn(),
      updateSubmission: vi.fn(),
      gradeSubmission: vi.fn(),
      getGrade: vi.fn(),
      updateGrade: vi.fn(),
      bulkGradeSubmissions: vi.fn(),
      countByClass: vi.fn(),
    }

    mockClassRepository = {
      findById: vi.fn(),
      isStudentEnrolled: vi.fn(),
    }

    mockDb = {} as unknown
    service = new AssignmentService(mockDb as never)

    // Inject mocks
    ;(service as unknown as { assignmentRepository: Partial<AssignmentRepository> }).assignmentRepository =
      mockAssignmentRepository
    ;(service as unknown as { classRepository: Partial<ClassRepository> }).classRepository =
      mockClassRepository
  })

  // ===========================================
  // createAssignment() Tests
  // ===========================================
  describe('createAssignment', () => {
    it('should create assignment for valid teacher', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockAssignmentRepository.create = vi.fn().mockResolvedValue(mockAssignment)

      const result = await service.createAssignment('class-123', 'teacher-123', {
        title: 'Homework 1',
        description: 'Complete exercises',
        due_date: new Date(),
      })

      expect(mockClassRepository.findById).toHaveBeenCalledWith('class-123')
      expect(mockAssignmentRepository.create).toHaveBeenCalledWith({
        title: 'Homework 1',
        description: 'Complete exercises',
        due_date: expect.any(Date),
        class_id: 'class-123',
      })
      expect(result).toEqual(mockAssignment)
    })

    it('should throw NotFoundError if class not found', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(
        service.createAssignment('nonexistent-class', 'teacher-123', {
          title: 'Homework',
          description: 'Description',
        })
      ).rejects.toThrow(NotFoundError)

      expect(mockAssignmentRepository.create).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenError if not the class teacher', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      await expect(
        service.createAssignment('class-123', 'different-teacher', {
          title: 'Homework',
          description: 'Description',
        })
      ).rejects.toThrow(ForbiddenError)

      expect(mockAssignmentRepository.create).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // getAssignmentById() Tests
  // ===========================================
  describe('getAssignmentById', () => {
    it('should return assignment if found', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)

      const result = await service.getAssignmentById('assignment-123')

      expect(result).toEqual(mockAssignment)
      expect(mockAssignmentRepository.findById).toHaveBeenCalledWith('assignment-123')
    })

    it('should throw NotFoundError if assignment not found', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.getAssignmentById('nonexistent-assignment')).rejects.toThrow(
        NotFoundError
      )
    })
  })

  // ===========================================
  // updateAssignment() Tests
  // ===========================================
  describe('updateAssignment', () => {
    it('should update assignment when teacher is owner', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockAssignmentRepository.update = vi.fn().mockResolvedValue({
        ...mockAssignment,
        title: 'Updated Title',
      })

      const result = await service.updateAssignment('assignment-123', 'teacher-123', {
        title: 'Updated Title',
      })

      expect(mockAssignmentRepository.update).toHaveBeenCalledWith('assignment-123', {
        title: 'Updated Title',
      })
      expect(result.title).toBe('Updated Title')
    })

    it('should throw ForbiddenError if teacher is not owner', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      await expect(
        service.updateAssignment('assignment-123', 'different-teacher', {
          title: 'Updated',
        })
      ).rejects.toThrow(ForbiddenError)

      expect(mockAssignmentRepository.update).not.toHaveBeenCalled()
    })

    it('should throw NotFoundError if assignment not found', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(
        service.updateAssignment('nonexistent-assignment', 'teacher-123', {
          title: 'Updated',
        })
      ).rejects.toThrow(NotFoundError)
    })
  })

  // ===========================================
  // deleteAssignment() Tests
  // ===========================================
  describe('deleteAssignment', () => {
    it('should delete assignment when no graded submissions', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockAssignmentRepository.getSubmissionsByAssignment = vi.fn().mockResolvedValue([])
      mockAssignmentRepository.delete = vi.fn().mockResolvedValue(undefined)

      await service.deleteAssignment('assignment-123', 'teacher-123')

      expect(mockAssignmentRepository.delete).toHaveBeenCalledWith('assignment-123')
    })

    it('should throw InvalidStateError if graded submissions exist', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockAssignmentRepository.getSubmissionsByAssignment = vi
        .fn()
        .mockResolvedValue([mockSubmission])
      mockAssignmentRepository.getGrade = vi.fn().mockResolvedValue(mockGrade)

      await expect(
        service.deleteAssignment('assignment-123', 'teacher-123')
      ).rejects.toThrow(InvalidStateError)

      expect(mockAssignmentRepository.delete).not.toHaveBeenCalled()
    })

    it('should allow deletion if submissions exist but not graded', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockAssignmentRepository.getSubmissionsByAssignment = vi
        .fn()
        .mockResolvedValue([mockSubmission])
      mockAssignmentRepository.getGrade = vi.fn().mockResolvedValue(null)
      mockAssignmentRepository.delete = vi.fn().mockResolvedValue(undefined)

      await service.deleteAssignment('assignment-123', 'teacher-123')

      expect(mockAssignmentRepository.delete).toHaveBeenCalled()
    })

    it('should throw ForbiddenError if teacher is not owner', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      await expect(
        service.deleteAssignment('assignment-123', 'different-teacher')
      ).rejects.toThrow(ForbiddenError)
    })
  })

  // ===========================================
  // Query Methods Tests
  // ===========================================
  describe('Query Methods', () => {
    it('getAssignmentsByClass should return assignments', async () => {
      const assignments = [mockAssignment]
      mockAssignmentRepository.findByClass = vi.fn().mockResolvedValue(assignments)

      const result = await service.getAssignmentsByClass('class-123')

      expect(result).toEqual(assignments)
      expect(mockAssignmentRepository.findByClass).toHaveBeenCalledWith('class-123', undefined)
    })

    it('getAssignmentsByClass should support pagination', async () => {
      mockAssignmentRepository.findByClass = vi.fn().mockResolvedValue([mockAssignment])

      await service.getAssignmentsByClass('class-123', { page: 2, limit: 10 })

      expect(mockAssignmentRepository.findByClass).toHaveBeenCalledWith('class-123', {
        page: 2,
        limit: 10,
      })
    })

    it('getAssignmentsByTeacher should return assignments', async () => {
      const assignments = [mockAssignment]
      mockAssignmentRepository.findByTeacher = vi.fn().mockResolvedValue(assignments)

      const result = await service.getAssignmentsByTeacher('teacher-123')

      expect(result).toEqual(assignments)
      expect(mockAssignmentRepository.findByTeacher).toHaveBeenCalledWith('teacher-123', undefined)
    })

    it('getAssignmentsForStudent should return assignments', async () => {
      const assignments = [mockAssignment]
      mockAssignmentRepository.findByStudent = vi.fn().mockResolvedValue(assignments)

      const result = await service.getAssignmentsForStudent('student-123')

      expect(result).toEqual(assignments)
      expect(mockAssignmentRepository.findByStudent).toHaveBeenCalledWith('student-123', undefined)
    })

    it('getUpcomingAssignments should return upcoming assignments', async () => {
      const assignments = [mockAssignment]
      mockAssignmentRepository.findUpcoming = vi.fn().mockResolvedValue(assignments)

      const result = await service.getUpcomingAssignments('class-123')

      expect(result).toEqual(assignments)
      expect(mockAssignmentRepository.findUpcoming).toHaveBeenCalledWith('class-123')
    })

    it('getOverdueAssignments should return overdue assignments', async () => {
      const assignments = [mockAssignment]
      mockAssignmentRepository.findOverdue = vi.fn().mockResolvedValue(assignments)

      const result = await service.getOverdueAssignments('student-123')

      expect(result).toEqual(assignments)
      expect(mockAssignmentRepository.findOverdue).toHaveBeenCalledWith('student-123')
    })
  })

  // ===========================================
  // submitAssignment() Tests
  // ===========================================
  describe('submitAssignment', () => {
    it('should submit assignment successfully', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.isStudentEnrolled = vi.fn().mockResolvedValue(true)
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(null)
      mockAssignmentRepository.submitAssignment = vi.fn().mockResolvedValue(mockSubmission)

      const result = await service.submitAssignment(
        'assignment-123',
        'student-123',
        'My answer'
      )

      expect(mockAssignmentRepository.submitAssignment).toHaveBeenCalledWith(
        'assignment-123',
        'student-123',
        'My answer',
        undefined
      )
      expect(result).toEqual(mockSubmission)
    })

    it('should throw ForbiddenError if student not enrolled', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.isStudentEnrolled = vi.fn().mockResolvedValue(false)

      await expect(
        service.submitAssignment('assignment-123', 'student-123', 'My answer')
      ).rejects.toThrow(ForbiddenError)

      expect(mockAssignmentRepository.submitAssignment).not.toHaveBeenCalled()
    })

    it('should throw InvalidStateError if already submitted', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.isStudentEnrolled = vi.fn().mockResolvedValue(true)
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)

      await expect(
        service.submitAssignment('assignment-123', 'student-123', 'My answer')
      ).rejects.toThrow(InvalidStateError)
    })

    it('should throw InvalidStateError if past due date', async () => {
      const pastDueAssignment: Assignment = {
        ...mockAssignment,
        due_date: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      }
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(pastDueAssignment)
      mockClassRepository.isStudentEnrolled = vi.fn().mockResolvedValue(true)
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(null)

      await expect(
        service.submitAssignment('assignment-123', 'student-123', 'My answer')
      ).rejects.toThrow(InvalidStateError)
    })

    it('should submit with file URL', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.isStudentEnrolled = vi.fn().mockResolvedValue(true)
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(null)
      mockAssignmentRepository.submitAssignment = vi.fn().mockResolvedValue(mockSubmission)

      await service.submitAssignment(
        'assignment-123',
        'student-123',
        'My answer',
        'https://example.com/file.pdf'
      )

      expect(mockAssignmentRepository.submitAssignment).toHaveBeenCalledWith(
        'assignment-123',
        'student-123',
        'My answer',
        'https://example.com/file.pdf'
      )
    })
  })

  // ===========================================
  // updateSubmission() Tests
  // ===========================================
  describe('updateSubmission', () => {
    it('should update submission when not graded', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)
      mockAssignmentRepository.getGrade = vi.fn().mockResolvedValue(null)
      mockAssignmentRepository.updateSubmission = vi.fn().mockResolvedValue({
        ...mockSubmission,
        content: 'Updated content',
      })

      const result = await service.updateSubmission('assignment-123', 'student-123', {
        content: 'Updated content',
      })

      expect(mockAssignmentRepository.updateSubmission).toHaveBeenCalledWith('submission-123', {
        content: 'Updated content',
      })
      expect(result.content).toBe('Updated content')
    })

    it('should throw NotFoundError if submission not found', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(null)

      await expect(
        service.updateSubmission('assignment-123', 'student-123', {
          content: 'Updated',
        })
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ForbiddenError if not submission owner', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)

      await expect(
        service.updateSubmission('assignment-123', 'different-student', {
          content: 'Updated',
        })
      ).rejects.toThrow(ForbiddenError)
    })

    it('should throw InvalidStateError if submission already graded', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)
      mockAssignmentRepository.getGrade = vi.fn().mockResolvedValue(mockGrade)

      await expect(
        service.updateSubmission('assignment-123', 'student-123', {
          content: 'Updated',
        })
      ).rejects.toThrow(InvalidStateError)
    })
  })

  // ===========================================
  // Submission Retrieval Tests
  // ===========================================
  describe('Submission Retrieval', () => {
    it('getSubmission should return submission if found', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)

      const result = await service.getSubmission('assignment-123', 'student-123')

      expect(result).toEqual(mockSubmission)
    })

    it('getSubmission should return null if not found', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(null)

      const result = await service.getSubmission('assignment-123', 'student-123')

      expect(result).toBeNull()
    })

    it('getSubmissionsByAssignment should return submissions when teacher owns class', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockAssignmentRepository.getSubmissionsByAssignment = vi
        .fn()
        .mockResolvedValue([mockSubmission])

      const result = await service.getSubmissionsByAssignment('assignment-123', 'teacher-123')

      expect(result).toEqual([mockSubmission])
    })

    it('getSubmissionsByAssignment should throw ForbiddenError if not class teacher', async () => {
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      await expect(
        service.getSubmissionsByAssignment('assignment-123', 'different-teacher')
      ).rejects.toThrow(ForbiddenError)
    })

    it('getSubmissionsByStudent should return student submissions', async () => {
      mockAssignmentRepository.getSubmissionsByStudent = vi
        .fn()
        .mockResolvedValue([mockSubmission])

      const result = await service.getSubmissionsByStudent('student-123')

      expect(result).toEqual([mockSubmission])
      expect(mockAssignmentRepository.getSubmissionsByStudent).toHaveBeenCalledWith('student-123')
    })
  })

  // ===========================================
  // gradeSubmission() Tests
  // ===========================================
  describe('gradeSubmission', () => {
    it('should grade submission successfully', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockAssignmentRepository.gradeSubmission = vi.fn().mockResolvedValue(mockGrade)

      const result = await service.gradeSubmission(
        'assignment-123',
        'student-123',
        'teacher-123',
        85,
        'Good work'
      )

      expect(mockAssignmentRepository.gradeSubmission).toHaveBeenCalledWith(
        'submission-123',
        'teacher-123',
        85,
        'Good work'
      )
      expect(result).toEqual(mockGrade)
    })

    it('should throw ValidationError if grade < 0', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)

      await expect(
        service.gradeSubmission('assignment-123', 'student-123', 'teacher-123', -5)
      ).rejects.toThrow(ValidationError)

      expect(mockAssignmentRepository.gradeSubmission).not.toHaveBeenCalled()
    })

    it('should throw ValidationError if grade > 100', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)

      await expect(
        service.gradeSubmission('assignment-123', 'student-123', 'teacher-123', 105)
      ).rejects.toThrow(ValidationError)
    })

    it('should throw NotFoundError if submission not found', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(null)

      await expect(
        service.gradeSubmission('assignment-123', 'student-123', 'teacher-123', 85)
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ForbiddenError if not class teacher', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      await expect(
        service.gradeSubmission('assignment-123', 'student-123', 'different-teacher', 85)
      ).rejects.toThrow(ForbiddenError)
    })

    it('should accept grade of 0', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockAssignmentRepository.gradeSubmission = vi.fn().mockResolvedValue(mockGrade)

      await service.gradeSubmission('assignment-123', 'student-123', 'teacher-123', 0)

      expect(mockAssignmentRepository.gradeSubmission).toHaveBeenCalled()
    })

    it('should accept grade of 100', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockAssignmentRepository.gradeSubmission = vi.fn().mockResolvedValue(mockGrade)

      await service.gradeSubmission('assignment-123', 'student-123', 'teacher-123', 100)

      expect(mockAssignmentRepository.gradeSubmission).toHaveBeenCalled()
    })
  })

  // ===========================================
  // updateGrade() Tests
  // ===========================================
  describe('updateGrade', () => {
    it('should update grade successfully', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)
      mockAssignmentRepository.getGrade = vi.fn().mockResolvedValue(mockGrade)
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockAssignmentRepository.updateGrade = vi.fn().mockResolvedValue({
        ...mockGrade,
        grade: 90,
      })

      const result = await service.updateGrade(
        'assignment-123',
        'student-123',
        'teacher-123',
        { grade: 90 }
      )

      expect(mockAssignmentRepository.updateGrade).toHaveBeenCalledWith('grade-123', {
        grade: 90,
      })
      expect(result.grade).toBe(90)
    })

    it('should throw ValidationError if grade < 0', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)

      await expect(
        service.updateGrade('assignment-123', 'student-123', 'teacher-123', { grade: -5 })
      ).rejects.toThrow(ValidationError)
    })

    it('should throw ValidationError if grade > 100', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)

      await expect(
        service.updateGrade('assignment-123', 'student-123', 'teacher-123', { grade: 105 })
      ).rejects.toThrow(ValidationError)
    })

    it('should throw NotFoundError if submission not found', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(null)

      await expect(
        service.updateGrade('assignment-123', 'student-123', 'teacher-123', { grade: 90 })
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw NotFoundError if grade not found', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)
      mockAssignmentRepository.getGrade = vi.fn().mockResolvedValue(null)

      await expect(
        service.updateGrade('assignment-123', 'student-123', 'teacher-123', { grade: 90 })
      ).rejects.toThrow(NotFoundError)
    })

    it('should allow updating feedback only', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)
      mockAssignmentRepository.getGrade = vi.fn().mockResolvedValue(mockGrade)
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockAssignmentRepository.updateGrade = vi.fn().mockResolvedValue(mockGrade)

      await service.updateGrade('assignment-123', 'student-123', 'teacher-123', {
        feedback: 'Updated feedback',
      })

      expect(mockAssignmentRepository.updateGrade).toHaveBeenCalledWith('grade-123', {
        feedback: 'Updated feedback',
      })
    })
  })

  // ===========================================
  // bulkGradeSubmissions() Tests
  // ===========================================
  describe('bulkGradeSubmissions', () => {
    it('should bulk grade submissions successfully', async () => {
      const grades = [
        { assignmentId: 'assignment-123', studentId: 'student-1', grade: 85, feedback: 'Good' },
        { assignmentId: 'assignment-123', studentId: 'student-2', grade: 90, feedback: 'Great' },
      ]

      mockAssignmentRepository.getSubmission = vi
        .fn()
        .mockResolvedValueOnce({ ...mockSubmission, id: 'submission-1', student_id: 'student-1' })
        .mockResolvedValueOnce({ ...mockSubmission, id: 'submission-2', student_id: 'student-2' })

      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockAssignmentRepository.bulkGradeSubmissions = vi.fn().mockResolvedValue(2)

      const result = await service.bulkGradeSubmissions(grades, 'teacher-123')

      expect(result).toBe(2)
      expect(mockAssignmentRepository.bulkGradeSubmissions).toHaveBeenCalledWith([
        { submissionId: 'submission-1', teacherId: 'teacher-123', grade: 85, feedback: 'Good' },
        { submissionId: 'submission-2', teacherId: 'teacher-123', grade: 90, feedback: 'Great' },
      ])
    })

    it('should return 0 for empty array', async () => {
      const result = await service.bulkGradeSubmissions([], 'teacher-123')

      expect(result).toBe(0)
      expect(mockAssignmentRepository.bulkGradeSubmissions).not.toHaveBeenCalled()
    })

    it('should throw ValidationError if any grade < 0', async () => {
      const grades = [
        { assignmentId: 'assignment-123', studentId: 'student-1', grade: 85 },
        { assignmentId: 'assignment-123', studentId: 'student-2', grade: -5 },
      ]

      await expect(service.bulkGradeSubmissions(grades, 'teacher-123')).rejects.toThrow(
        ValidationError
      )
    })

    it('should throw ValidationError if any grade > 100', async () => {
      const grades = [
        { assignmentId: 'assignment-123', studentId: 'student-1', grade: 85 },
        { assignmentId: 'assignment-123', studentId: 'student-2', grade: 105 },
      ]

      await expect(service.bulkGradeSubmissions(grades, 'teacher-123')).rejects.toThrow(
        ValidationError
      )
    })

    it('should throw ForbiddenError if not teacher for any submission', async () => {
      const grades = [
        { assignmentId: 'assignment-123', studentId: 'student-1', grade: 85 },
      ]

      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)
      mockAssignmentRepository.findById = vi.fn().mockResolvedValue(mockAssignment)
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      await expect(
        service.bulkGradeSubmissions(grades, 'different-teacher')
      ).rejects.toThrow(ForbiddenError)
    })
  })

  // ===========================================
  // getGrade() Tests
  // ===========================================
  describe('getGrade', () => {
    it('should return grade if found', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)
      mockAssignmentRepository.getGrade = vi.fn().mockResolvedValue(mockGrade)

      const result = await service.getGrade('assignment-123', 'student-123')

      expect(result).toEqual(mockGrade)
    })

    it('should return null if submission not found', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(null)

      const result = await service.getGrade('assignment-123', 'student-123')

      expect(result).toBeNull()
    })

    it('should return null if grade not found', async () => {
      mockAssignmentRepository.getSubmission = vi.fn().mockResolvedValue(mockSubmission)
      mockAssignmentRepository.getGrade = vi.fn().mockResolvedValue(null)

      const result = await service.getGrade('assignment-123', 'student-123')

      expect(result).toBeNull()
    })
  })

  // ===========================================
  // Count Methods Tests
  // ===========================================
  describe('Count Methods', () => {
    it('getAssignmentCountByClass should return count', async () => {
      mockAssignmentRepository.countByClass = vi.fn().mockResolvedValue(5)

      const result = await service.getAssignmentCountByClass('class-123')

      expect(result).toBe(5)
      expect(mockAssignmentRepository.countByClass).toHaveBeenCalledWith('class-123')
    })
  })
})
