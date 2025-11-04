import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ClassRepository } from '../ClassRepository'
import {
  db,
  clearAllTables,
  createTestUser,
  createTestUsers,
  createTestClass,
} from '../../index'
import type { NewClass } from '../../schema'

describe('ClassRepository', () => {
  let repository: ClassRepository

  beforeEach(async () => {
    await clearAllTables(db)
    repository = new ClassRepository(db)
  })

  afterEach(async () => {
    await clearAllTables(db)
  })

  describe('create', () => {
    it('should create a new class with all fields', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })

      const newClass: NewClass = {
        name: 'Mathematics 101',
        teacher_id: teacher.id,
        description: 'Introduction to Mathematics',
      }

      const classRecord = await repository.create(newClass)

      expect(classRecord.id).toBeDefined()
      expect(classRecord.name).toBe('Mathematics 101')
      expect(classRecord.teacher_id).toBe(teacher.id)
      expect(classRecord.description).toBe('Introduction to Mathematics')
      expect(classRecord.created_at).toBeInstanceOf(Date)
      expect(classRecord.updated_at).toBeInstanceOf(Date)
    })

    it('should create a class with minimal fields', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })

      const newClass: NewClass = {
        name: 'History 101',
        teacher_id: teacher.id,
        description: null,
      }

      const classRecord = await repository.create(newClass)

      expect(classRecord.id).toBeDefined()
      expect(classRecord.name).toBe('History 101')
      expect(classRecord.description).toBeNull()
    })

    it('should throw error for non-existent teacher', async () => {
      const newClass: NewClass = {
        name: 'Test Class',
        teacher_id: '00000000-0000-0000-0000-000000000000',
        description: null,
      }

      await expect(repository.create(newClass)).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should find class by ID', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const created = await createTestClass(db, { teacherId: teacher.id })

      const found = await repository.findById(created.id)

      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
      expect(found?.name).toBe(created.name)
    })

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById(
        '00000000-0000-0000-0000-000000000000'
      )

      expect(found).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should return empty array when no classes exist', async () => {
      const classes = await repository.findAll()

      expect(classes).toEqual([])
    })

    it('should return all classes with default pagination', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })

      for (let i = 0; i < 5; i++) {
        await createTestClass(db, { teacherId: teacher.id })
      }

      const classes = await repository.findAll()

      expect(classes).toHaveLength(5)
    })

    it('should paginate classes correctly', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })

      for (let i = 0; i < 15; i++) {
        await createTestClass(db, { teacherId: teacher.id })
      }

      const page1 = await repository.findAll({ page: 1, limit: 5 })
      const page2 = await repository.findAll({ page: 2, limit: 5 })
      const page3 = await repository.findAll({ page: 3, limit: 5 })

      expect(page1).toHaveLength(5)
      expect(page2).toHaveLength(5)
      expect(page3).toHaveLength(5)

      const page1Ids = page1.map((c) => c.id)
      const page2Ids = page2.map((c) => c.id)
      expect(page1Ids).not.toEqual(page2Ids)
    })

    it('should return classes ordered by created_at desc', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })

      const class1 = await createTestClass(db, { teacherId: teacher.id })
      const class2 = await createTestClass(db, { teacherId: teacher.id })
      const class3 = await createTestClass(db, { teacherId: teacher.id })

      const classes = await repository.findAll()

      expect(classes[0]?.id).toBe(class3.id)
      expect(classes[1]?.id).toBe(class2.id)
      expect(classes[2]?.id).toBe(class1.id)
    })
  })

  describe('update', () => {
    it('should update class name', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const updated = await repository.update(classRecord.id, {
        name: 'Updated Name',
      })

      expect(updated.id).toBe(classRecord.id)
      expect(updated.name).toBe('Updated Name')
      expect(updated.teacher_id).toBe(teacher.id)
    })

    it('should update class description', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const updated = await repository.update(classRecord.id, {
        description: 'New description',
      })

      expect(updated.description).toBe('New description')
    })

    it('should update multiple fields at once', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const updated = await repository.update(classRecord.id, {
        name: 'New Name',
        description: 'New Description',
      })

      expect(updated.name).toBe('New Name')
      expect(updated.description).toBe('New Description')
    })

    it('should throw error for non-existent class', async () => {
      await expect(
        repository.update('00000000-0000-0000-0000-000000000000', {
          name: 'New Name',
        })
      ).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('should delete existing class', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      await repository.delete(classRecord.id)

      const found = await repository.findById(classRecord.id)
      expect(found).toBeNull()
    })

    it('should throw error when deleting non-existent class', async () => {
      await expect(
        repository.delete('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow()
    })
  })

  describe('findByTeacher', () => {
    it('should find all classes for a teacher', async () => {
      const teacher1 = await createTestUser(db, { role: 'teacher' })
      const teacher2 = await createTestUser(db, { role: 'teacher' })

      await createTestClass(db, { teacherId: teacher1.id })
      await createTestClass(db, { teacherId: teacher1.id })
      await createTestClass(db, { teacherId: teacher2.id })

      const classes = await repository.findByTeacher(teacher1.id)

      expect(classes).toHaveLength(2)
      expect(classes.every((c) => c.teacher_id === teacher1.id)).toBe(true)
    })

    it('should return empty array for teacher with no classes', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })

      const classes = await repository.findByTeacher(teacher.id)

      expect(classes).toEqual([])
    })

    it('should paginate teacher classes', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })

      for (let i = 0; i < 12; i++) {
        await createTestClass(db, { teacherId: teacher.id })
      }

      const page1 = await repository.findByTeacher(teacher.id, {
        page: 1,
        limit: 5,
      })
      const page2 = await repository.findByTeacher(teacher.id, {
        page: 2,
        limit: 5,
      })

      expect(page1).toHaveLength(5)
      expect(page2).toHaveLength(5)
    })
  })

  describe('count', () => {
    it('should return 0 when no classes exist', async () => {
      const count = await repository.count()

      expect(count).toBe(0)
    })

    it('should count all classes', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })

      for (let i = 0; i < 10; i++) {
        await createTestClass(db, { teacherId: teacher.id })
      }

      const count = await repository.count()

      expect(count).toBe(10)
    })
  })

  describe('countByTeacher', () => {
    it('should count classes by teacher', async () => {
      const teacher1 = await createTestUser(db, { role: 'teacher' })
      const teacher2 = await createTestUser(db, { role: 'teacher' })

      for (let i = 0; i < 3; i++) {
        await createTestClass(db, { teacherId: teacher1.id })
      }
      for (let i = 0; i < 5; i++) {
        await createTestClass(db, { teacherId: teacher2.id })
      }

      const count1 = await repository.countByTeacher(teacher1.id)
      const count2 = await repository.countByTeacher(teacher2.id)

      expect(count1).toBe(3)
      expect(count2).toBe(5)
    })

    it('should return 0 for teacher with no classes', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })

      const count = await repository.countByTeacher(teacher.id)

      expect(count).toBe(0)
    })
  })

  describe('addStudent', () => {
    it('should add a student to a class', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const student = await createTestUser(db, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const enrollment = await repository.addStudent(
        classRecord.id,
        student.id
      )

      expect(enrollment.class_id).toBe(classRecord.id)
      expect(enrollment.student_id).toBe(student.id)
      expect(enrollment.enrolled_at).toBeInstanceOf(Date)
    })

    it('should throw error for duplicate enrollment', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const student = await createTestUser(db, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      await repository.addStudent(classRecord.id, student.id)

      await expect(
        repository.addStudent(classRecord.id, student.id)
      ).rejects.toThrow()
    })

    it('should throw error for non-existent class', async () => {
      const student = await createTestUser(db, { role: 'student' })

      await expect(
        repository.addStudent('00000000-0000-0000-0000-000000000000', student.id)
      ).rejects.toThrow()
    })
  })

  describe('removeStudent', () => {
    it('should remove a student from a class', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const student = await createTestUser(db, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      await repository.addStudent(classRecord.id, student.id)
      await repository.removeStudent(classRecord.id, student.id)

      const isEnrolled = await repository.isStudentEnrolled(
        classRecord.id,
        student.id
      )
      expect(isEnrolled).toBe(false)
    })

    it('should throw error when removing non-enrolled student', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const student = await createTestUser(db, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      await expect(
        repository.removeStudent(classRecord.id, student.id)
      ).rejects.toThrow()
    })
  })

  describe('addMultipleStudents', () => {
    it('should add multiple students to a class', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const students = await createTestUsers(db, 5, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const studentIds = students.map((s) => s.id)
      const count = await repository.addMultipleStudents(
        classRecord.id,
        studentIds
      )

      expect(count).toBe(5)

      const enrolled = await repository.getEnrolledStudents(classRecord.id)
      expect(enrolled).toHaveLength(5)
    })

    it('should return 0 for empty array', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const count = await repository.addMultipleStudents(classRecord.id, [])

      expect(count).toBe(0)
    })

    it('should handle undefined numInsertedOrUpdatedRows', async () => {
      const mockDb = {
        insertInto: () => ({
          values: () => ({
            executeTakeFirst: async () => ({
              numInsertedOrUpdatedRows: undefined,
            }),
          }),
        }),
      }

      const mockRepository = new ClassRepository(mockDb as never)
      const count = await mockRepository.addMultipleStudents('class-id', [
        'student-1',
      ])

      expect(count).toBe(0)
    })
  })

  describe('removeMultipleStudents', () => {
    it('should remove multiple students from a class', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const students = await createTestUsers(db, 5, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const studentIds = students.map((s) => s.id)
      await repository.addMultipleStudents(classRecord.id, studentIds)

      const count = await repository.removeMultipleStudents(classRecord.id, [
        students[0]!.id,
        students[2]!.id,
      ])

      expect(count).toBe(2)

      const enrolled = await repository.getEnrolledStudents(classRecord.id)
      expect(enrolled).toHaveLength(3)
    })

    it('should return 0 for empty array', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const count = await repository.removeMultipleStudents(classRecord.id, [])

      expect(count).toBe(0)
    })

    it('should handle undefined numDeletedRows', async () => {
      const mockDb = {
        deleteFrom: () => ({
          where: () => ({
            where: () => ({
              executeTakeFirst: async () => ({ numDeletedRows: undefined }),
            }),
          }),
        }),
      }

      const mockRepository = new ClassRepository(mockDb as never)
      const count = await mockRepository.removeMultipleStudents('class-id', [
        'student-1',
      ])

      expect(count).toBe(0)
    })
  })

  describe('getEnrolledStudents', () => {
    it('should get all enrolled students in order', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const students = await createTestUsers(db, 3, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      await repository.addStudent(classRecord.id, students[0]!.id)
      await repository.addStudent(classRecord.id, students[1]!.id)
      await repository.addStudent(classRecord.id, students[2]!.id)

      const enrolled = await repository.getEnrolledStudents(classRecord.id)

      expect(enrolled).toHaveLength(3)
      expect(enrolled[0]).toBe(students[0]?.id)
      expect(enrolled[1]).toBe(students[1]?.id)
      expect(enrolled[2]).toBe(students[2]?.id)
    })

    it('should return empty array for class with no students', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const enrolled = await repository.getEnrolledStudents(classRecord.id)

      expect(enrolled).toEqual([])
    })
  })

  describe('countStudentsInClass', () => {
    it('should count students in a class', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const students = await createTestUsers(db, 7, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      await repository.addMultipleStudents(
        classRecord.id,
        students.map((s) => s.id)
      )

      const count = await repository.countStudentsInClass(classRecord.id)

      expect(count).toBe(7)
    })

    it('should return 0 for class with no students', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const count = await repository.countStudentsInClass(classRecord.id)

      expect(count).toBe(0)
    })
  })

  describe('isStudentEnrolled', () => {
    it('should return true for enrolled student', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const student = await createTestUser(db, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      await repository.addStudent(classRecord.id, student.id)

      const isEnrolled = await repository.isStudentEnrolled(
        classRecord.id,
        student.id
      )

      expect(isEnrolled).toBe(true)
    })

    it('should return false for non-enrolled student', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const student = await createTestUser(db, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const isEnrolled = await repository.isStudentEnrolled(
        classRecord.id,
        student.id
      )

      expect(isEnrolled).toBe(false)
    })
  })

  describe('findClassesForStudent', () => {
    it('should find all classes a student is enrolled in', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const student = await createTestUser(db, { role: 'student' })

      const class1 = await createTestClass(db, { teacherId: teacher.id })
      const class2 = await createTestClass(db, { teacherId: teacher.id })
      const class3 = await createTestClass(db, { teacherId: teacher.id })

      await repository.addStudent(class1.id, student.id)
      await repository.addStudent(class3.id, student.id)

      const classes = await repository.findClassesForStudent(student.id)

      expect(classes).toHaveLength(2)
      expect(classes.some((c) => c.id === class1.id)).toBe(true)
      expect(classes.some((c) => c.id === class3.id)).toBe(true)
    })

    it('should return empty array for student with no enrollments', async () => {
      const student = await createTestUser(db, { role: 'student' })

      const classes = await repository.findClassesForStudent(student.id)

      expect(classes).toEqual([])
    })
  })

  describe('countClassesForStudent', () => {
    it('should count classes for a student', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const student = await createTestUser(db, { role: 'student' })

      for (let i = 0; i < 4; i++) {
        const classRecord = await createTestClass(db, {
          teacherId: teacher.id,
        })
        await repository.addStudent(classRecord.id, student.id)
      }

      const count = await repository.countClassesForStudent(student.id)

      expect(count).toBe(4)
    })

    it('should return 0 for student with no enrollments', async () => {
      const student = await createTestUser(db, { role: 'student' })

      const count = await repository.countClassesForStudent(student.id)

      expect(count).toBe(0)
    })
  })

  describe('getEnrollmentDate', () => {
    it('should get enrollment date for a student', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const student = await createTestUser(db, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      await repository.addStudent(classRecord.id, student.id)

      const enrollmentDate = await repository.getEnrollmentDate(
        classRecord.id,
        student.id
      )

      expect(enrollmentDate).not.toBeNull()
      expect(enrollmentDate).toBeInstanceOf(Date)
      // Enrollment should be recent (within last minute)
      const now = new Date()
      const timeDiff = now.getTime() - enrollmentDate!.getTime()
      expect(timeDiff).toBeLessThan(60000) // Less than 1 minute
    })

    it('should return null for non-enrolled student', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const student = await createTestUser(db, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const enrollmentDate = await repository.getEnrollmentDate(
        classRecord.id,
        student.id
      )

      expect(enrollmentDate).toBeNull()
    })
  })

  describe('transferStudents', () => {
    it('should transfer students between classes', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const students = await createTestUsers(db, 3, { role: 'student' })
      const class1 = await createTestClass(db, { teacherId: teacher.id })
      const class2 = await createTestClass(db, { teacherId: teacher.id })

      await repository.addMultipleStudents(
        class1.id,
        students.map((s) => s.id)
      )

      const count = await repository.transferStudents(
        class1.id,
        class2.id,
        [students[0]!.id, students[2]!.id]
      )

      expect(count).toBe(2)

      const class1Students = await repository.getEnrolledStudents(class1.id)
      const class2Students = await repository.getEnrolledStudents(class2.id)

      expect(class1Students).toHaveLength(1)
      expect(class2Students).toHaveLength(2)
    })

    it('should return 0 for empty student array', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const class1 = await createTestClass(db, { teacherId: teacher.id })
      const class2 = await createTestClass(db, { teacherId: teacher.id })

      const count = await repository.transferStudents(class1.id, class2.id, [])

      expect(count).toBe(0)
    })
  })

  describe('removeAllStudents', () => {
    it('should remove all students from a class', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const students = await createTestUsers(db, 5, { role: 'student' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      await repository.addMultipleStudents(
        classRecord.id,
        students.map((s) => s.id)
      )

      const count = await repository.removeAllStudents(classRecord.id)

      expect(count).toBe(5)

      const enrolled = await repository.getEnrolledStudents(classRecord.id)
      expect(enrolled).toEqual([])
    })

    it('should return 0 for class with no students', async () => {
      const teacher = await createTestUser(db, { role: 'teacher' })
      const classRecord = await createTestClass(db, { teacherId: teacher.id })

      const count = await repository.removeAllStudents(classRecord.id)

      expect(count).toBe(0)
    })

    it('should handle undefined numDeletedRows', async () => {
      const mockDb = {
        deleteFrom: () => ({
          where: () => ({
            executeTakeFirst: async () => ({ numDeletedRows: undefined }),
          }),
        }),
      }

      const mockRepository = new ClassRepository(mockDb as never)
      const count = await mockRepository.removeAllStudents('class-id')

      expect(count).toBe(0)
    })
  })

  describe('transaction support', () => {
    it('should work within a transaction', async () => {
      await db.transaction().execute(async (trx) => {
        const txRepository = new ClassRepository(trx)
        const teacher = await createTestUser(db, { role: 'teacher' })

        const classRecord = await txRepository.create({
          name: 'Transaction Test Class',
          teacher_id: teacher.id,
          description: null,
        })

        expect(classRecord.id).toBeDefined()

        const found = await txRepository.findById(classRecord.id)
        expect(found).not.toBeNull()
      })
    })

    it('should rollback on transaction failure', async () => {
      let classId: string | undefined

      try {
        await db.transaction().execute(async (trx) => {
          const txRepository = new ClassRepository(trx)
          const teacher = await createTestUser(db, { role: 'teacher' })

          const classRecord = await txRepository.create({
            name: 'Rollback Test Class',
            teacher_id: teacher.id,
            description: null,
          })

          classId = classRecord.id

          throw new Error('Force rollback')
        })
      } catch {
        // Expected error
      }

      if (classId) {
        const found = await repository.findById(classId)
        expect(found).toBeNull()
      }
    })
  })
})
