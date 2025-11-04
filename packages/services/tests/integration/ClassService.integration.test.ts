import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ClassService } from '../../src/ClassService'
import {
  db,
  clearAllTables,
  createTestUser,
} from '@concentrate/database'
import type { User } from '@concentrate/database'
import {
  NotFoundError,
  ForbiddenError,
  AlreadyExistsError,
} from '@concentrate/shared'

describe('ClassService - Integration Tests', () => {
  let service: ClassService
  let teacher1: User
  let teacher2: User
  let student1: User
  let student2: User
  let student3: User

  beforeEach(async () => {
    await clearAllTables(db)
    service = new ClassService(db)

    // Create test users
    teacher1 = await createTestUser(db, {
      email: 'teacher1@example.com',
      name: 'Teacher One',
      role: 'teacher',
    })

    teacher2 = await createTestUser(db, {
      email: 'teacher2@example.com',
      name: 'Teacher Two',
      role: 'teacher',
    })

    student1 = await createTestUser(db, {
      email: 'student1@example.com',
      name: 'Student One',
      role: 'student',
    })

    student2 = await createTestUser(db, {
      email: 'student2@example.com',
      name: 'Student Two',
      role: 'student',
    })

    student3 = await createTestUser(db, {
      email: 'student3@example.com',
      name: 'Student Three',
      role: 'student',
    })
  })

  afterEach(async () => {
    await clearAllTables(db)
  })

  // ===========================================
  // Class CRUD with Real Database
  // ===========================================
  describe('Class CRUD Operations', () => {
    it('should create class with real database', async () => {
      const classData = {
        name: 'Math 101',
        description: 'Introduction to Mathematics',
      }

      const createdClass = await service.createClass(teacher1.id, classData)

      expect(createdClass.id).toBeDefined()
      expect(createdClass.name).toBe('Math 101')
      expect(createdClass.description).toBe('Introduction to Mathematics')
      expect(createdClass.teacher_id).toBe(teacher1.id)
      expect(createdClass.created_at).toBeInstanceOf(Date)
      expect(createdClass.updated_at).toBeInstanceOf(Date)
    })

    it('should retrieve created class by ID', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Science 101',
        description: 'Introduction to Science',
      })

      const retrievedClass = await service.getClassById(createdClass.id)

      expect(retrievedClass).toEqual(createdClass)
    })

    it('should update class in database', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'History 101',
        description: 'Old description',
      })

      const updatedClass = await service.updateClass(
        createdClass.id,
        teacher1.id,
        {
          name: 'History 102',
          description: 'New description',
        }
      )

      expect(updatedClass.name).toBe('History 102')
      expect(updatedClass.description).toBe('New description')
      expect(updatedClass.updated_at.getTime()).toBeGreaterThan(
        createdClass.updated_at.getTime()
      )
    })

    it('should delete class from database', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'To Delete',
        description: 'This class will be deleted',
      })

      await service.deleteClass(createdClass.id, teacher1.id)

      await expect(service.getClassById(createdClass.id)).rejects.toThrow(
        NotFoundError
      )
    })

    it('should throw NotFoundError when creating class for non-existent teacher', async () => {
      // Use a valid UUID format that doesn't exist in the database
      const nonExistentTeacherId = '00000000-0000-0000-0000-000000000000'

      await expect(
        service.createClass(nonExistentTeacherId, {
          name: 'Class',
          description: 'Description',
        })
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ForbiddenError when non-teacher creates class', async () => {
      await expect(
        service.createClass(student1.id, {
          name: 'Class',
          description: 'Description',
        })
      ).rejects.toThrow(ForbiddenError)
    })

    it('should throw ForbiddenError when teacher updates another teacher\'s class', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Teacher 1 Class',
        description: 'Description',
      })

      await expect(
        service.updateClass(createdClass.id, teacher2.id, {
          name: 'Updated',
        })
      ).rejects.toThrow(ForbiddenError)
    })

    it('should throw ForbiddenError when teacher deletes another teacher\'s class', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Teacher 1 Class',
        description: 'Description',
      })

      await expect(
        service.deleteClass(createdClass.id, teacher2.id)
      ).rejects.toThrow(ForbiddenError)
    })
  })

  // ===========================================
  // Enrollment Flows
  // ===========================================
  describe('Enrollment Flows', () => {
    it('should enroll student in class with real database', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math class',
      })

      await service.enrollStudent(createdClass.id, student1.id, teacher1.id)

      const isEnrolled = await service.isStudentEnrolled(
        createdClass.id,
        student1.id
      )
      expect(isEnrolled).toBe(true)
    })

    it('should enroll multiple students in class', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math class',
      })

      const studentIds = [student1.id, student2.id, student3.id]
      const enrolledCount = await service.enrollMultipleStudents(
        createdClass.id,
        studentIds,
        teacher1.id
      )

      expect(enrolledCount).toBe(3)

      // Verify all students are enrolled
      for (const studentId of studentIds) {
        const isEnrolled = await service.isStudentEnrolled(
          createdClass.id,
          studentId
        )
        expect(isEnrolled).toBe(true)
      }
    })

    it('should skip already enrolled students when enrolling multiple', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math class',
      })

      // Enroll student1 first
      await service.enrollStudent(createdClass.id, student1.id, teacher1.id)

      // Try to enroll student1, student2, student3
      const enrolledCount = await service.enrollMultipleStudents(
        createdClass.id,
        [student1.id, student2.id, student3.id],
        teacher1.id
      )

      // Should only enroll 2 (student2 and student3)
      expect(enrolledCount).toBe(2)
    })

    it('should throw AlreadyExistsError when enrolling already enrolled student', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math class',
      })

      await service.enrollStudent(createdClass.id, student1.id, teacher1.id)

      await expect(
        service.enrollStudent(createdClass.id, student1.id, teacher1.id)
      ).rejects.toThrow(AlreadyExistsError)
    })

    it('should remove student from class', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math class',
      })

      await service.enrollStudent(createdClass.id, student1.id, teacher1.id)

      const beforeRemoval = await service.isStudentEnrolled(
        createdClass.id,
        student1.id
      )
      expect(beforeRemoval).toBe(true)

      await service.removeStudent(createdClass.id, student1.id, teacher1.id)

      const afterRemoval = await service.isStudentEnrolled(
        createdClass.id,
        student1.id
      )
      expect(afterRemoval).toBe(false)
    })

    it('should transfer students between classes', async () => {
      const class1 = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math class',
      })

      const class2 = await service.createClass(teacher1.id, {
        name: 'Math 102',
        description: 'Advanced Math class',
      })

      // Enroll students in class1
      await service.enrollMultipleStudents(
        class1.id,
        [student1.id, student2.id],
        teacher1.id
      )

      // Transfer students to class2
      const transferredCount = await service.transferStudents(
        class1.id,
        class2.id,
        [student1.id, student2.id],
        teacher1.id
      )

      expect(transferredCount).toBe(2)

      // Verify students are removed from class1
      expect(await service.isStudentEnrolled(class1.id, student1.id)).toBe(false)
      expect(await service.isStudentEnrolled(class1.id, student2.id)).toBe(false)

      // Verify students are added to class2
      expect(await service.isStudentEnrolled(class2.id, student1.id)).toBe(true)
      expect(await service.isStudentEnrolled(class2.id, student2.id)).toBe(true)
    })

    it('should throw ForbiddenError when teacher enrolls student in another teacher\'s class', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Teacher 1 Class',
        description: 'Description',
      })

      await expect(
        service.enrollStudent(createdClass.id, student1.id, teacher2.id)
      ).rejects.toThrow(ForbiddenError)
    })

    it('should throw ForbiddenError when enrolling non-student user', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math class',
      })

      await expect(
        service.enrollStudent(createdClass.id, teacher2.id, teacher1.id)
      ).rejects.toThrow(ForbiddenError)
    })

    it('should throw ForbiddenError when transferring between classes with different teachers', async () => {
      const class1 = await service.createClass(teacher1.id, {
        name: 'Teacher 1 Class',
        description: 'Description',
      })

      const class2 = await service.createClass(teacher2.id, {
        name: 'Teacher 2 Class',
        description: 'Description',
      })

      await service.enrollStudent(class1.id, student1.id, teacher1.id)

      await expect(
        service.transferStudents(
          class1.id,
          class2.id,
          [student1.id],
          teacher1.id
        )
      ).rejects.toThrow(ForbiddenError)
    })

    it('should filter out non-students when enrolling multiple', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math class',
      })

      // Try to enroll mix of students and non-students
      const enrolledCount = await service.enrollMultipleStudents(
        createdClass.id,
        [student1.id, teacher2.id, student2.id],
        teacher1.id
      )

      // Should only enroll the 2 students
      expect(enrolledCount).toBe(2)
      expect(await service.isStudentEnrolled(createdClass.id, student1.id)).toBe(true)
      expect(await service.isStudentEnrolled(createdClass.id, student2.id)).toBe(true)
    })
  })

  // ===========================================
  // Query Real Data
  // ===========================================
  describe('Query Methods', () => {
    it('should get classes by teacher', async () => {
      // Create classes for teacher1
      await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math',
      })
      await service.createClass(teacher1.id, {
        name: 'Math 102',
        description: 'Advanced Math',
      })

      // Create class for teacher2
      await service.createClass(teacher2.id, {
        name: 'Science 101',
        description: 'Science',
      })

      const teacher1Classes = await service.getClassesByTeacher(teacher1.id)
      expect(teacher1Classes).toHaveLength(2)
      expect(teacher1Classes.every((c) => c.teacher_id === teacher1.id)).toBe(true)

      const teacher2Classes = await service.getClassesByTeacher(teacher2.id)
      expect(teacher2Classes).toHaveLength(1)
      expect(teacher2Classes[0].teacher_id).toBe(teacher2.id)
    })

    it('should get classes for student (enrolled classes only)', async () => {
      const class1 = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math',
      })

      const class2 = await service.createClass(teacher1.id, {
        name: 'Science 101',
        description: 'Science',
      })

      const class3 = await service.createClass(teacher2.id, {
        name: 'History 101',
        description: 'History',
      })

      // Enroll student1 in class1 and class2
      await service.enrollStudent(class1.id, student1.id, teacher1.id)
      await service.enrollStudent(class2.id, student1.id, teacher1.id)

      // Enroll student2 in class3
      await service.enrollStudent(class3.id, student2.id, teacher2.id)

      const student1Classes = await service.getClassesForStudent(student1.id)
      expect(student1Classes).toHaveLength(2)
      expect(student1Classes.map((c) => c.id).sort()).toEqual(
        [class1.id, class2.id].sort()
      )

      const student2Classes = await service.getClassesForStudent(student2.id)
      expect(student2Classes).toHaveLength(1)
      expect(student2Classes[0].id).toBe(class3.id)
    })

    it('should get all classes with pagination', async () => {
      // Create 15 classes
      for (let i = 0; i < 15; i++) {
        await service.createClass(teacher1.id, {
          name: `Class ${i + 1}`,
          description: `Description ${i + 1}`,
        })
      }

      // Get first page
      const page1 = await service.getAllClasses({ page: 1, limit: 10 })
      expect(page1).toHaveLength(10)

      // Get second page
      const page2 = await service.getAllClasses({ page: 2, limit: 10 })
      expect(page2).toHaveLength(5)

      // Verify no duplicates
      const page1Ids = page1.map((c) => c.id)
      const page2Ids = page2.map((c) => c.id)
      expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false)
    })

    it('should get enrolled students in class', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math class',
      })

      await service.enrollMultipleStudents(
        createdClass.id,
        [student1.id, student2.id, student3.id],
        teacher1.id
      )

      const enrolledStudentIds = await service.getEnrolledStudents(
        createdClass.id
      )

      expect(enrolledStudentIds).toHaveLength(3)
      expect(enrolledStudentIds.sort()).toEqual(
        [student1.id, student2.id, student3.id].sort()
      )
    })

    it('should return empty array for class with no students', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Empty Class',
        description: 'No students',
      })

      const enrolledStudentIds = await service.getEnrolledStudents(
        createdClass.id
      )

      expect(enrolledStudentIds).toEqual([])
    })

    it('should support pagination for getClassesByTeacher', async () => {
      // Create 12 classes for teacher1
      for (let i = 0; i < 12; i++) {
        await service.createClass(teacher1.id, {
          name: `Class ${i + 1}`,
          description: `Description ${i + 1}`,
        })
      }

      const page1 = await service.getClassesByTeacher(teacher1.id, {
        page: 1,
        limit: 5,
      })
      expect(page1).toHaveLength(5)

      const page2 = await service.getClassesByTeacher(teacher1.id, {
        page: 2,
        limit: 5,
      })
      expect(page2).toHaveLength(5)

      const page3 = await service.getClassesByTeacher(teacher1.id, {
        page: 3,
        limit: 5,
      })
      expect(page3).toHaveLength(2)
    })
  })

  // ===========================================
  // Count Real Data
  // ===========================================
  describe('Count Methods', () => {
    it('should count total classes', async () => {
      expect(await service.getClassCount()).toBe(0)

      await service.createClass(teacher1.id, {
        name: 'Class 1',
        description: 'Description 1',
      })
      expect(await service.getClassCount()).toBe(1)

      await service.createClass(teacher1.id, {
        name: 'Class 2',
        description: 'Description 2',
      })
      expect(await service.getClassCount()).toBe(2)

      await service.createClass(teacher2.id, {
        name: 'Class 3',
        description: 'Description 3',
      })
      expect(await service.getClassCount()).toBe(3)
    })

    it('should count classes by teacher', async () => {
      // Create classes for teacher1
      await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math',
      })
      await service.createClass(teacher1.id, {
        name: 'Math 102',
        description: 'Advanced Math',
      })

      // Create class for teacher2
      await service.createClass(teacher2.id, {
        name: 'Science 101',
        description: 'Science',
      })

      expect(await service.getClassCountByTeacher(teacher1.id)).toBe(2)
      expect(await service.getClassCountByTeacher(teacher2.id)).toBe(1)
    })

    it('should count students in class', async () => {
      const createdClass = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math class',
      })

      expect(await service.getStudentCountInClass(createdClass.id)).toBe(0)

      await service.enrollStudent(createdClass.id, student1.id, teacher1.id)
      expect(await service.getStudentCountInClass(createdClass.id)).toBe(1)

      await service.enrollStudent(createdClass.id, student2.id, teacher1.id)
      expect(await service.getStudentCountInClass(createdClass.id)).toBe(2)

      await service.enrollStudent(createdClass.id, student3.id, teacher1.id)
      expect(await service.getStudentCountInClass(createdClass.id)).toBe(3)

      // Remove one student
      await service.removeStudent(createdClass.id, student1.id, teacher1.id)
      expect(await service.getStudentCountInClass(createdClass.id)).toBe(2)
    })

    it('should count classes for student', async () => {
      const class1 = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math',
      })

      const class2 = await service.createClass(teacher1.id, {
        name: 'Science 101',
        description: 'Science',
      })

      const class3 = await service.createClass(teacher2.id, {
        name: 'History 101',
        description: 'History',
      })

      expect(await service.getClassCountForStudent(student1.id)).toBe(0)

      await service.enrollStudent(class1.id, student1.id, teacher1.id)
      expect(await service.getClassCountForStudent(student1.id)).toBe(1)

      await service.enrollStudent(class2.id, student1.id, teacher1.id)
      expect(await service.getClassCountForStudent(student1.id)).toBe(2)

      await service.enrollStudent(class3.id, student1.id, teacher2.id)
      expect(await service.getClassCountForStudent(student1.id)).toBe(3)

      // Remove from one class
      await service.removeStudent(class1.id, student1.id, teacher1.id)
      expect(await service.getClassCountForStudent(student1.id)).toBe(2)
    })

    it('should maintain accurate counts across multiple operations', async () => {
      const class1 = await service.createClass(teacher1.id, {
        name: 'Math 101',
        description: 'Math',
      })

      // Enroll 3 students
      await service.enrollMultipleStudents(
        class1.id,
        [student1.id, student2.id, student3.id],
        teacher1.id
      )

      expect(await service.getStudentCountInClass(class1.id)).toBe(3)
      expect(await service.getClassCountForStudent(student1.id)).toBe(1)
      expect(await service.getClassCountForStudent(student2.id)).toBe(1)
      expect(await service.getClassCountForStudent(student3.id)).toBe(1)

      // Remove student2
      await service.removeStudent(class1.id, student2.id, teacher1.id)

      expect(await service.getStudentCountInClass(class1.id)).toBe(2)
      expect(await service.getClassCountForStudent(student2.id)).toBe(0)

      // Create second class and transfer student1
      const class2 = await service.createClass(teacher1.id, {
        name: 'Math 102',
        description: 'Advanced Math',
      })

      await service.transferStudents(
        class1.id,
        class2.id,
        [student1.id],
        teacher1.id
      )

      expect(await service.getStudentCountInClass(class1.id)).toBe(1)
      expect(await service.getStudentCountInClass(class2.id)).toBe(1)
      expect(await service.getClassCountForStudent(student1.id)).toBe(1)
    })
  })
})
