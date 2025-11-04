import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ClassService } from '../../src/ClassService'
import type { ClassRepository, UserRepository } from '@concentrate/database'
import type { Class, User } from '@concentrate/database'
import { NotFoundError, ForbiddenError, AlreadyExistsError } from '@concentrate/shared'

describe('ClassService - Unit Tests', () => {
  let service: ClassService
  let mockClassRepository: Partial<ClassRepository>
  let mockUserRepository: Partial<UserRepository>
  let mockDb: unknown

  const mockTeacher: User = {
    id: 'teacher-123',
    email: 'teacher@example.com',
    password_hash: 'hashed_password',
    name: 'Test Teacher',
    role: 'teacher',
    suspended: false,
    created_at: new Date(),
    updated_at: new Date(),
  }

  const mockStudent: User = {
    id: 'student-123',
    email: 'student@example.com',
    password_hash: 'hashed_password',
    name: 'Test Student',
    role: 'student',
    suspended: false,
    created_at: new Date(),
    updated_at: new Date(),
  }

  const mockClass: Class = {
    id: 'class-123',
    name: 'Test Class',
    description: 'Test Description',
    teacher_id: 'teacher-123',
    created_at: new Date(),
    updated_at: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockClassRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByTeacher: vi.fn(),
      findClassesForStudent: vi.fn(),
      addStudent: vi.fn(),
      addMultipleStudents: vi.fn(),
      removeStudent: vi.fn(),
      transferStudents: vi.fn(),
      getEnrolledStudents: vi.fn(),
      isStudentEnrolled: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
      countByTeacher: vi.fn(),
      countStudentsInClass: vi.fn(),
      countClassesForStudent: vi.fn(),
    }

    mockUserRepository = {
      findById: vi.fn(),
    }

    mockDb = {} as unknown
    service = new ClassService(mockDb as never)

    // Inject mocks
    ;(service as unknown as { classRepository: Partial<ClassRepository> }).classRepository =
      mockClassRepository
    ;(service as unknown as { userRepository: Partial<UserRepository> }).userRepository =
      mockUserRepository
  })

  // ===========================================
  // createClass() Tests
  // ===========================================
  describe('createClass', () => {
    it('should create class for valid teacher', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockTeacher)
      mockClassRepository.create = vi.fn().mockResolvedValue(mockClass)

      const result = await service.createClass('teacher-123', {
        name: 'New Class',
        description: 'New Description',
      })

      expect(mockUserRepository.findById).toHaveBeenCalledWith('teacher-123')
      expect(mockClassRepository.create).toHaveBeenCalledWith({
        name: 'New Class',
        description: 'New Description',
        teacher_id: 'teacher-123',
      })
      expect(result).toEqual(mockClass)
    })

    it('should throw NotFoundError if teacher not found', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(
        service.createClass('nonexistent-teacher', {
          name: 'Class',
          description: 'Description',
        })
      ).rejects.toThrow(NotFoundError)

      expect(mockClassRepository.create).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenError if user is not a teacher', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockStudent)

      await expect(
        service.createClass('student-123', {
          name: 'Class',
          description: 'Description',
        })
      ).rejects.toThrow(ForbiddenError)

      expect(mockClassRepository.create).not.toHaveBeenCalled()
    })

    it('should create class with teacher_id set correctly', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockTeacher)
      mockClassRepository.create = vi.fn().mockResolvedValue(mockClass)

      await service.createClass('teacher-123', {
        name: 'Test',
        description: 'Test',
      })

      const createCall = (mockClassRepository.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(createCall.teacher_id).toBe('teacher-123')
    })
  })

  // ===========================================
  // getClassById() Tests
  // ===========================================
  describe('getClassById', () => {
    it('should return class if found', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      const result = await service.getClassById('class-123')

      expect(result).toEqual(mockClass)
      expect(mockClassRepository.findById).toHaveBeenCalledWith('class-123')
    })

    it('should throw NotFoundError if class not found', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.getClassById('nonexistent-class')).rejects.toThrow(NotFoundError)
    })
  })

  // ===========================================
  // updateClass() Tests
  // ===========================================
  describe('updateClass', () => {
    it('should update class when teacher is owner', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockClassRepository.update = vi.fn().mockResolvedValue({
        ...mockClass,
        name: 'Updated Name',
      })

      const result = await service.updateClass('class-123', 'teacher-123', {
        name: 'Updated Name',
      })

      expect(mockClassRepository.update).toHaveBeenCalledWith('class-123', {
        name: 'Updated Name',
      })
      expect(result.name).toBe('Updated Name')
    })

    it('should throw ForbiddenError if teacher is not owner', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      await expect(
        service.updateClass('class-123', 'different-teacher', {
          name: 'Updated Name',
        })
      ).rejects.toThrow(ForbiddenError)

      expect(mockClassRepository.update).not.toHaveBeenCalled()
    })

    it('should throw NotFoundError if class not found', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(
        service.updateClass('nonexistent-class', 'teacher-123', {
          name: 'Updated',
        })
      ).rejects.toThrow(NotFoundError)
    })
  })

  // ===========================================
  // deleteClass() Tests
  // ===========================================
  describe('deleteClass', () => {
    it('should delete class when teacher is owner', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockClassRepository.delete = vi.fn().mockResolvedValue(undefined)

      await service.deleteClass('class-123', 'teacher-123')

      expect(mockClassRepository.delete).toHaveBeenCalledWith('class-123')
    })

    it('should throw ForbiddenError if teacher is not owner', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      await expect(service.deleteClass('class-123', 'different-teacher')).rejects.toThrow(
        ForbiddenError
      )

      expect(mockClassRepository.delete).not.toHaveBeenCalled()
    })

    it('should throw NotFoundError if class not found', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.deleteClass('nonexistent-class', 'teacher-123')).rejects.toThrow(
        NotFoundError
      )
    })
  })

  // ===========================================
  // getClassesByTeacher() Tests
  // ===========================================
  describe('getClassesByTeacher', () => {
    it('should return classes for teacher', async () => {
      const classes = [mockClass, { ...mockClass, id: 'class-456' }]
      mockClassRepository.findByTeacher = vi.fn().mockResolvedValue(classes)

      const result = await service.getClassesByTeacher('teacher-123')

      expect(result).toEqual(classes)
      expect(mockClassRepository.findByTeacher).toHaveBeenCalledWith('teacher-123', undefined)
    })

    it('should support pagination options', async () => {
      mockClassRepository.findByTeacher = vi.fn().mockResolvedValue([mockClass])

      await service.getClassesByTeacher('teacher-123', { page: 2, limit: 10 })

      expect(mockClassRepository.findByTeacher).toHaveBeenCalledWith('teacher-123', {
        page: 2,
        limit: 10,
      })
    })
  })

  // ===========================================
  // getClassesForStudent() Tests
  // ===========================================
  describe('getClassesForStudent', () => {
    it('should return classes for student', async () => {
      const classes = [mockClass]
      mockClassRepository.findClassesForStudent = vi.fn().mockResolvedValue(classes)

      const result = await service.getClassesForStudent('student-123')

      expect(result).toEqual(classes)
      expect(mockClassRepository.findClassesForStudent).toHaveBeenCalledWith('student-123')
    })
  })

  // ===========================================
  // enrollStudent() Tests
  // ===========================================
  describe('enrollStudent', () => {
    it('should enroll student successfully', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockStudent)
      mockClassRepository.isStudentEnrolled = vi.fn().mockResolvedValue(false)
      mockClassRepository.addStudent = vi.fn().mockResolvedValue(undefined)

      await service.enrollStudent('class-123', 'student-123', 'teacher-123')

      expect(mockClassRepository.addStudent).toHaveBeenCalledWith('class-123', 'student-123')
    })

    it('should throw ForbiddenError if teacher is not class owner', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      await expect(
        service.enrollStudent('class-123', 'student-123', 'different-teacher')
      ).rejects.toThrow(ForbiddenError)

      expect(mockClassRepository.addStudent).not.toHaveBeenCalled()
    })

    it('should throw NotFoundError if student not found', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockUserRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(
        service.enrollStudent('class-123', 'nonexistent-student', 'teacher-123')
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ForbiddenError if user is not a student', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockTeacher)

      await expect(
        service.enrollStudent('class-123', 'teacher-123', 'teacher-123')
      ).rejects.toThrow(ForbiddenError)
    })

    it('should throw AlreadyExistsError if student already enrolled', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockUserRepository.findById = vi.fn().mockResolvedValue(mockStudent)
      mockClassRepository.isStudentEnrolled = vi.fn().mockResolvedValue(true)

      await expect(
        service.enrollStudent('class-123', 'student-123', 'teacher-123')
      ).rejects.toThrow(AlreadyExistsError)

      expect(mockClassRepository.addStudent).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // enrollMultipleStudents() Tests
  // ===========================================
  describe('enrollMultipleStudents', () => {
    it('should enroll multiple students successfully', async () => {
      const studentIds = ['student-1', 'student-2', 'student-3']
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      // Mock findById to return different students for each ID
      mockUserRepository.findById = vi
        .fn()
        .mockResolvedValueOnce({ ...mockStudent, id: 'student-1' })
        .mockResolvedValueOnce({ ...mockStudent, id: 'student-2' })
        .mockResolvedValueOnce({ ...mockStudent, id: 'student-3' })

      mockClassRepository.isStudentEnrolled = vi.fn().mockResolvedValue(false)
      mockClassRepository.addMultipleStudents = vi.fn().mockResolvedValue(undefined)

      const result = await service.enrollMultipleStudents(
        'class-123',
        studentIds,
        'teacher-123'
      )

      expect(result).toBe(3)
      expect(mockClassRepository.addMultipleStudents).toHaveBeenCalledWith('class-123', studentIds)
    })

    it('should throw ForbiddenError if teacher is not owner', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      await expect(
        service.enrollMultipleStudents('class-123', ['student-1'], 'different-teacher')
      ).rejects.toThrow(ForbiddenError)
    })

    it('should filter out non-students and enroll only valid students', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockUserRepository.findById = vi
        .fn()
        .mockResolvedValueOnce({ ...mockStudent, id: 'student-1' })
        .mockResolvedValueOnce(mockTeacher) // Second user is not a student
        .mockResolvedValueOnce({ ...mockStudent, id: 'student-3' })
      mockClassRepository.isStudentEnrolled = vi.fn().mockResolvedValue(false)
      mockClassRepository.addMultipleStudents = vi.fn().mockResolvedValue(undefined)

      const result = await service.enrollMultipleStudents(
        'class-123',
        ['student-1', 'teacher-1', 'student-3'],
        'teacher-123'
      )

      // Should only enroll the 2 valid students
      expect(result).toBe(2)
      expect(mockClassRepository.addMultipleStudents).toHaveBeenCalledWith('class-123', [
        'student-1',
        'student-3',
      ])
    })

    it('should skip already enrolled students', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockUserRepository.findById = vi
        .fn()
        .mockResolvedValueOnce({ ...mockStudent, id: 'student-1' })
        .mockResolvedValueOnce({ ...mockStudent, id: 'student-2' })
      mockClassRepository.isStudentEnrolled = vi
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true) // Second student already enrolled
      mockClassRepository.addMultipleStudents = vi.fn().mockResolvedValue(undefined)

      const result = await service.enrollMultipleStudents(
        'class-123',
        ['student-1', 'student-2'],
        'teacher-123'
      )

      expect(result).toBe(1) // Only one student added
      expect(mockClassRepository.addMultipleStudents).toHaveBeenCalledWith('class-123', [
        'student-1',
      ])
    })
  })

  // ===========================================
  // removeStudent() Tests
  // ===========================================
  describe('removeStudent', () => {
    it('should remove student from class', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockClassRepository.removeStudent = vi.fn().mockResolvedValue(undefined)

      await service.removeStudent('class-123', 'student-123', 'teacher-123')

      expect(mockClassRepository.removeStudent).toHaveBeenCalledWith('class-123', 'student-123')
    })

    it('should throw ForbiddenError if teacher is not owner', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      await expect(
        service.removeStudent('class-123', 'student-123', 'different-teacher')
      ).rejects.toThrow(ForbiddenError)
    })
  })

  // ===========================================
  // transferStudents() Tests
  // ===========================================
  describe('transferStudents', () => {
    const targetClass: Class = {
      ...mockClass,
      id: 'class-456',
      name: 'Target Class',
    }

    it('should transfer students between classes', async () => {
      mockClassRepository.findById = vi
        .fn()
        .mockResolvedValueOnce(mockClass)
        .mockResolvedValueOnce(targetClass)
      mockClassRepository.transferStudents = vi.fn().mockResolvedValue(undefined)

      const result = await service.transferStudents(
        'class-123',
        'class-456',
        ['student-1', 'student-2'],
        'teacher-123'
      )

      expect(result).toBe(2)
      expect(mockClassRepository.transferStudents).toHaveBeenCalledWith(
        'class-123',
        'class-456',
        ['student-1', 'student-2']
      )
    })

    it('should throw ForbiddenError if teacher is not owner of source class', async () => {
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)

      await expect(
        service.transferStudents('class-123', 'class-456', ['student-1'], 'different-teacher')
      ).rejects.toThrow(ForbiddenError)
    })
  })

  // ===========================================
  // Query Methods Tests
  // ===========================================
  describe('Query Methods', () => {
    it('getEnrolledStudents should return student IDs', async () => {
      const studentIds = ['student-1', 'student-2', 'student-3']
      mockClassRepository.findById = vi.fn().mockResolvedValue(mockClass)
      mockClassRepository.getEnrolledStudents = vi.fn().mockResolvedValue(studentIds)

      const result = await service.getEnrolledStudents('class-123')

      expect(result).toEqual(studentIds)
    })

    it('isStudentEnrolled should return enrollment status', async () => {
      mockClassRepository.isStudentEnrolled = vi.fn().mockResolvedValue(true)

      const result = await service.isStudentEnrolled('class-123', 'student-123')

      expect(result).toBe(true)
    })

    it('getAllClasses should support pagination', async () => {
      mockClassRepository.findAll = vi.fn().mockResolvedValue([mockClass])

      await service.getAllClasses({ page: 1, limit: 10 })

      expect(mockClassRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 })
    })

    it('getClassCount should return total count', async () => {
      mockClassRepository.count = vi.fn().mockResolvedValue(42)

      const result = await service.getClassCount()

      expect(result).toBe(42)
    })

    it('getClassCountByTeacher should return teacher class count', async () => {
      mockClassRepository.countByTeacher = vi.fn().mockResolvedValue(5)

      const result = await service.getClassCountByTeacher('teacher-123')

      expect(result).toBe(5)
    })

    it('getStudentCountInClass should return enrollment count', async () => {
      mockClassRepository.countStudentsInClass = vi.fn().mockResolvedValue(25)

      const result = await service.getStudentCountInClass('class-123')

      expect(result).toBe(25)
    })

    it('getClassCountForStudent should return student class count', async () => {
      mockClassRepository.countClassesForStudent = vi.fn().mockResolvedValue(3)

      const result = await service.getClassCountForStudent('student-123')

      expect(result).toBe(3)
    })
  })
})
