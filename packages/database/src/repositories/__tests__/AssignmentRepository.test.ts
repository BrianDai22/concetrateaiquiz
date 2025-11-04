import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AssignmentRepository } from '../AssignmentRepository'
import {
  db,
  clearAllTables,
  createTestUser,
  createTestClass,
} from '../../index'
import type { User, Class } from '../../schema'

describe('AssignmentRepository', () => {
  let repository: AssignmentRepository
  let teacher: User
  let student: User
  let classRecord: Class

  beforeEach(async () => {
    await clearAllTables(db)
    repository = new AssignmentRepository(db)

    // Create test data
    teacher = await createTestUser(db, { role: 'teacher' })
    student = await createTestUser(db, { role: 'student' })
    classRecord = await createTestClass(db, { teacherId: teacher.id })

    // Enroll student in class
    await db
      .insertInto('class_students')
      .values({
        class_id: classRecord.id,
        student_id: student.id,
      })
      .execute()
  })

  afterEach(async () => {
    await clearAllTables(db)
  })

  // ==================== Assignment CRUD ====================

  describe('create', () => {
    it('should create assignment with all fields', async () => {
      const dueDate = new Date('2025-12-31')
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Homework 1',
        description: 'Complete exercises 1-10',
        due_date: dueDate,
      })

      expect(assignment.id).toBeDefined()
      expect(assignment.class_id).toBe(classRecord.id)
      expect(assignment.title).toBe('Homework 1')
      expect(assignment.description).toBe('Complete exercises 1-10')
      expect(assignment.due_date).toBeInstanceOf(Date)
      expect(assignment.created_at).toBeInstanceOf(Date)
      expect(assignment.updated_at).toBeInstanceOf(Date)
    })

    it('should throw error when creating assignment with invalid class_id', async () => {
      await expect(
        repository.create({
          class_id: '00000000-0000-0000-0000-000000000000',
          title: 'Test',
          description: 'Test',
          due_date: new Date(),
        })
      ).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should find assignment by id', async () => {
      const created = await repository.create({
        class_id: classRecord.id,
        title: 'Quiz 1',
        description: 'Chapter 1 quiz',
        due_date: new Date('2025-12-31'),
      })

      const found = await repository.findById(created.id)

      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
      expect(found?.title).toBe('Quiz 1')
    })

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000')
      expect(found).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should find all assignments with default pagination', async () => {
      await repository.create({
        class_id: classRecord.id,
        title: 'Assignment 1',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })
      await repository.create({
        class_id: classRecord.id,
        title: 'Assignment 2',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const assignments = await repository.findAll()

      expect(assignments).toHaveLength(2)
      expect(assignments[0]?.title).toBe('Assignment 2') // Most recent first
    })

    it('should support pagination', async () => {
      // Create 15 assignments
      for (let i = 1; i <= 15; i++) {
        await repository.create({
          class_id: classRecord.id,
          title: `Assignment ${i}`,
          description: 'Test',
          due_date: new Date('2025-12-31'),
        })
      }

      const page1 = await repository.findAll({ page: 1, limit: 10 })
      const page2 = await repository.findAll({ page: 2, limit: 10 })

      expect(page1).toHaveLength(10)
      expect(page2).toHaveLength(5)
    })
  })

  describe('update', () => {
    it('should update assignment fields', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Original',
        description: 'Original desc',
        due_date: new Date('2025-12-31'),
      })

      const updated = await repository.update(assignment.id, {
        title: 'Updated',
        description: 'Updated desc',
      })

      expect(updated.title).toBe('Updated')
      expect(updated.description).toBe('Updated desc')
      expect(updated.updated_at.getTime()).toBeGreaterThan(
        assignment.updated_at.getTime()
      )
    })

    it('should throw error when updating non-existent assignment', async () => {
      await expect(
        repository.update('00000000-0000-0000-0000-000000000000', {
          title: 'Updated',
        })
      ).rejects.toThrow('Assignment with id 00000000-0000-0000-0000-000000000000 not found')
    })
  })

  describe('delete', () => {
    it('should delete assignment', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'To Delete',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      await repository.delete(assignment.id)

      const found = await repository.findById(assignment.id)
      expect(found).toBeNull()
    })

    it('should throw error when deleting non-existent assignment', async () => {
      await expect(
        repository.delete('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Assignment with id 00000000-0000-0000-0000-000000000000 not found')
    })
  })

  // ==================== Assignment Queries ====================

  describe('findByClass', () => {
    it('should find assignments for a class', async () => {
      await repository.create({
        class_id: classRecord.id,
        title: 'Class Assignment 1',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })
      await repository.create({
        class_id: classRecord.id,
        title: 'Class Assignment 2',
        description: 'Test',
        due_date: new Date('2025-12-30'),
      })

      const assignments = await repository.findByClass(classRecord.id)

      expect(assignments).toHaveLength(2)
      // Ordered by due_date desc
      expect(assignments[0]?.title).toBe('Class Assignment 1')
    })

    it('should support pagination', async () => {
      for (let i = 1; i <= 15; i++) {
        await repository.create({
          class_id: classRecord.id,
          title: `Assignment ${i}`,
          description: 'Test',
          due_date: new Date('2025-12-31'),
        })
      }

      const page1 = await repository.findByClass(classRecord.id, {
        page: 1,
        limit: 10,
      })
      const page2 = await repository.findByClass(classRecord.id, {
        page: 2,
        limit: 10,
      })

      expect(page1).toHaveLength(10)
      expect(page2).toHaveLength(5)
    })

    it('should return empty array for class with no assignments', async () => {
      const emptyClass = await createTestClass(db, { teacherId: teacher.id })
      const assignments = await repository.findByClass(emptyClass.id)
      expect(assignments).toHaveLength(0)
    })
  })

  describe('findByTeacher', () => {
    it('should find all assignments for a teacher across multiple classes', async () => {
      const class2 = await createTestClass(db, { teacherId: teacher.id })

      await repository.create({
        class_id: classRecord.id,
        title: 'Class 1 Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })
      await repository.create({
        class_id: class2.id,
        title: 'Class 2 Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const assignments = await repository.findByTeacher(teacher.id)

      expect(assignments).toHaveLength(2)
    })

    it('should not return assignments from other teachers', async () => {
      const otherTeacher = await createTestUser(db, { role: 'teacher' })
      const otherClass = await createTestClass(db, { teacherId: otherTeacher.id })

      await repository.create({
        class_id: otherClass.id,
        title: 'Other Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const assignments = await repository.findByTeacher(teacher.id)
      expect(assignments).toHaveLength(0)
    })

    it('should support pagination', async () => {
      for (let i = 1; i <= 15; i++) {
        await repository.create({
          class_id: classRecord.id,
          title: `Assignment ${i}`,
          description: 'Test',
          due_date: new Date('2025-12-31'),
        })
      }

      const page1 = await repository.findByTeacher(teacher.id, {
        page: 1,
        limit: 10,
      })
      const page2 = await repository.findByTeacher(teacher.id, {
        page: 2,
        limit: 10,
      })

      expect(page1).toHaveLength(10)
      expect(page2).toHaveLength(5)
    })
  })

  describe('findByStudent', () => {
    it('should find assignments for enrolled classes', async () => {
      await repository.create({
        class_id: classRecord.id,
        title: 'Student Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const assignments = await repository.findByStudent(student.id)

      expect(assignments).toHaveLength(1)
      expect(assignments[0]?.title).toBe('Student Assignment')
    })

    it('should not return assignments from non-enrolled classes', async () => {
      const otherClass = await createTestClass(db, { teacherId: teacher.id })
      await repository.create({
        class_id: otherClass.id,
        title: 'Other Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const assignments = await repository.findByStudent(student.id)
      expect(assignments).toHaveLength(0)
    })

    it('should support pagination', async () => {
      for (let i = 1; i <= 15; i++) {
        await repository.create({
          class_id: classRecord.id,
          title: `Assignment ${i}`,
          description: 'Test',
          due_date: new Date('2025-12-31'),
        })
      }

      const page1 = await repository.findByStudent(student.id, {
        page: 1,
        limit: 10,
      })
      const page2 = await repository.findByStudent(student.id, {
        page: 2,
        limit: 10,
      })

      expect(page1).toHaveLength(10)
      expect(page2).toHaveLength(5)
    })
  })

  describe('findUpcoming', () => {
    it('should find assignments with future due dates', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)

      await repository.create({
        class_id: classRecord.id,
        title: 'Future Assignment',
        description: 'Test',
        due_date: futureDate,
      })
      await repository.create({
        class_id: classRecord.id,
        title: 'Past Assignment',
        description: 'Test',
        due_date: pastDate,
      })

      const upcoming = await repository.findUpcoming(classRecord.id)

      expect(upcoming).toHaveLength(1)
      expect(upcoming[0]?.title).toBe('Future Assignment')
    })

    it('should return empty array when no upcoming assignments', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)

      await repository.create({
        class_id: classRecord.id,
        title: 'Past Assignment',
        description: 'Test',
        due_date: pastDate,
      })

      const upcoming = await repository.findUpcoming(classRecord.id)
      expect(upcoming).toHaveLength(0)
    })
  })

  describe('findOverdue', () => {
    it('should find overdue assignments with no submission', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)

      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Overdue Assignment',
        description: 'Test',
        due_date: pastDate,
      })

      const overdue = await repository.findOverdue(student.id)

      expect(overdue).toHaveLength(1)
      expect(overdue[0]?.id).toBe(assignment.id)
    })

    it('should not include assignments with submissions', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)

      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Submitted Assignment',
        description: 'Test',
        due_date: pastDate,
      })

      // Submit the assignment
      await repository.submitAssignment(assignment.id, student.id, 'My submission')

      const overdue = await repository.findOverdue(student.id)
      expect(overdue).toHaveLength(0)
    })

    it('should not include future assignments', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      await repository.create({
        class_id: classRecord.id,
        title: 'Future Assignment',
        description: 'Test',
        due_date: futureDate,
      })

      const overdue = await repository.findOverdue(student.id)
      expect(overdue).toHaveLength(0)
    })
  })

  describe('count', () => {
    it('should count total assignments', async () => {
      await repository.create({
        class_id: classRecord.id,
        title: 'Assignment 1',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })
      await repository.create({
        class_id: classRecord.id,
        title: 'Assignment 2',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const count = await repository.count()
      expect(count).toBe(2)
    })

    it('should return 0 when no assignments', async () => {
      const count = await repository.count()
      expect(count).toBe(0)
    })
  })

  describe('countByClass', () => {
    it('should count assignments for a class', async () => {
      await repository.create({
        class_id: classRecord.id,
        title: 'Assignment 1',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })
      await repository.create({
        class_id: classRecord.id,
        title: 'Assignment 2',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const count = await repository.countByClass(classRecord.id)
      expect(count).toBe(2)
    })

    it('should return 0 for class with no assignments', async () => {
      const emptyClass = await createTestClass(db, { teacherId: teacher.id })
      const count = await repository.countByClass(emptyClass.id)
      expect(count).toBe(0)
    })
  })

  // ==================== Submission Methods ====================

  describe('submitAssignment', () => {
    it('should create submission with content', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const submission = await repository.submitAssignment(
        assignment.id,
        student.id,
        'My answer to the assignment'
      )

      expect(submission.id).toBeDefined()
      expect(submission.assignment_id).toBe(assignment.id)
      expect(submission.student_id).toBe(student.id)
      expect(submission.content).toBe('My answer to the assignment')
      expect(submission.file_url).toBeNull()
      expect(submission.submitted_at).toBeInstanceOf(Date)
    })

    it('should create submission with file URL', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const submission = await repository.submitAssignment(
        assignment.id,
        student.id,
        'See attached file',
        'https://example.com/file.pdf'
      )

      expect(submission.file_url).toBe('https://example.com/file.pdf')
    })

    it('should throw error for invalid assignment_id', async () => {
      await expect(
        repository.submitAssignment(
          '00000000-0000-0000-0000-000000000000',
          student.id,
          'Content'
        )
      ).rejects.toThrow()
    })
  })

  describe('getSubmission', () => {
    it('should get submission for assignment and student', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      await repository.submitAssignment(assignment.id, student.id, 'My submission')

      const submission = await repository.getSubmission(assignment.id, student.id)

      expect(submission).not.toBeNull()
      expect(submission?.content).toBe('My submission')
    })

    it('should return null when no submission exists', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const submission = await repository.getSubmission(assignment.id, student.id)
      expect(submission).toBeNull()
    })
  })

  describe('getSubmissionsByAssignment', () => {
    it('should get all submissions for an assignment', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const student2 = await createTestUser(db, { role: 'student' })

      await repository.submitAssignment(assignment.id, student.id, 'Submission 1')
      await repository.submitAssignment(assignment.id, student2.id, 'Submission 2')

      const submissions = await repository.getSubmissionsByAssignment(assignment.id)

      expect(submissions).toHaveLength(2)
    })

    it('should return empty array when no submissions', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const submissions = await repository.getSubmissionsByAssignment(assignment.id)
      expect(submissions).toHaveLength(0)
    })
  })

  describe('getSubmissionsByStudent', () => {
    it('should get all submissions by a student', async () => {
      const assignment1 = await repository.create({
        class_id: classRecord.id,
        title: 'Assignment 1',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })
      const assignment2 = await repository.create({
        class_id: classRecord.id,
        title: 'Assignment 2',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      await repository.submitAssignment(assignment1.id, student.id, 'Submission 1')
      await repository.submitAssignment(assignment2.id, student.id, 'Submission 2')

      const submissions = await repository.getSubmissionsByStudent(student.id)

      expect(submissions).toHaveLength(2)
    })

    it('should return empty array when no submissions', async () => {
      const submissions = await repository.getSubmissionsByStudent(student.id)
      expect(submissions).toHaveLength(0)
    })
  })

  describe('updateSubmission', () => {
    it('should update submission content', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const submission = await repository.submitAssignment(
        assignment.id,
        student.id,
        'Original content'
      )

      const updated = await repository.updateSubmission(submission.id, {
        content: 'Updated content',
      })

      expect(updated.content).toBe('Updated content')
      expect(updated.updated_at.getTime()).toBeGreaterThan(
        submission.updated_at.getTime()
      )
    })

    it('should throw error when updating non-existent submission', async () => {
      await expect(
        repository.updateSubmission('00000000-0000-0000-0000-000000000000', {
          content: 'Updated',
        })
      ).rejects.toThrow(
        'Submission with id 00000000-0000-0000-0000-000000000000 not found'
      )
    })
  })

  // ==================== Grading Methods ====================

  describe('gradeSubmission', () => {
    it('should grade a submission', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const submission = await repository.submitAssignment(
        assignment.id,
        student.id,
        'My submission'
      )

      const grade = await repository.gradeSubmission(
        submission.id,
        teacher.id,
        95,
        'Excellent work!'
      )

      expect(grade.id).toBeDefined()
      expect(grade.submission_id).toBe(submission.id)
      expect(grade.teacher_id).toBe(teacher.id)
      expect(grade.grade).toBe('95.00') // PostgreSQL NUMERIC returns string
      expect(grade.feedback).toBe('Excellent work!')
      expect(grade.graded_at).toBeInstanceOf(Date)
    })

    it('should grade submission without feedback', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const submission = await repository.submitAssignment(
        assignment.id,
        student.id,
        'My submission'
      )

      const grade = await repository.gradeSubmission(submission.id, teacher.id, 85)

      expect(grade.grade).toBe('85.00') // PostgreSQL NUMERIC returns string
      expect(grade.feedback).toBeNull()
    })

    it('should throw error for invalid submission_id', async () => {
      await expect(
        repository.gradeSubmission(
          '00000000-0000-0000-0000-000000000000',
          teacher.id,
          95
        )
      ).rejects.toThrow()
    })
  })

  describe('updateGrade', () => {
    it('should update grade and feedback', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const submission = await repository.submitAssignment(
        assignment.id,
        student.id,
        'My submission'
      )

      const grade = await repository.gradeSubmission(
        submission.id,
        teacher.id,
        85,
        'Good'
      )

      const updated = await repository.updateGrade(grade.id, {
        grade: 90,
        feedback: 'Great work!',
      })

      expect(updated.grade).toBe('90.00') // PostgreSQL NUMERIC returns string
      expect(updated.feedback).toBe('Great work!')
      expect(updated.updated_at.getTime()).toBeGreaterThan(
        grade.updated_at.getTime()
      )
    })

    it('should throw error when updating non-existent grade', async () => {
      await expect(
        repository.updateGrade('00000000-0000-0000-0000-000000000000', {
          grade: 95,
        })
      ).rejects.toThrow('Grade with id 00000000-0000-0000-0000-000000000000 not found')
    })
  })

  describe('bulkGradeSubmissions', () => {
    it('should grade multiple submissions at once', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const student2 = await createTestUser(db, { role: 'student' })
      const student3 = await createTestUser(db, { role: 'student' })

      const submission1 = await repository.submitAssignment(
        assignment.id,
        student.id,
        'Submission 1'
      )
      const submission2 = await repository.submitAssignment(
        assignment.id,
        student2.id,
        'Submission 2'
      )
      const submission3 = await repository.submitAssignment(
        assignment.id,
        student3.id,
        'Submission 3'
      )

      const count = await repository.bulkGradeSubmissions([
        { submissionId: submission1.id, teacherId: teacher.id, grade: 90 },
        {
          submissionId: submission2.id,
          teacherId: teacher.id,
          grade: 85,
          feedback: 'Good',
        },
        { submissionId: submission3.id, teacherId: teacher.id, grade: 95 },
      ])

      expect(count).toBe(3)

      // Verify all grades were created
      const grade1 = await repository.getGrade(submission1.id)
      const grade2 = await repository.getGrade(submission2.id)
      const grade3 = await repository.getGrade(submission3.id)

      expect(grade1?.grade).toBe('90.00') // PostgreSQL NUMERIC returns string
      expect(grade2?.grade).toBe('85.00')
      expect(grade2?.feedback).toBe('Good')
      expect(grade3?.grade).toBe('95.00')
    })

    it('should return 0 for empty array', async () => {
      const count = await repository.bulkGradeSubmissions([])
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

      const mockRepository = new AssignmentRepository(mockDb as never)
      const count = await mockRepository.bulkGradeSubmissions([
        {
          submissionId: 'test-id',
          teacherId: 'test-teacher',
          grade: 90,
        },
      ])

      expect(count).toBe(0)
    })
  })

  describe('getGrade', () => {
    it('should get grade for a submission', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const submission = await repository.submitAssignment(
        assignment.id,
        student.id,
        'My submission'
      )

      await repository.gradeSubmission(submission.id, teacher.id, 92, 'Well done!')

      const grade = await repository.getGrade(submission.id)

      expect(grade).not.toBeNull()
      expect(grade?.grade).toBe('92.00') // PostgreSQL NUMERIC returns string
      expect(grade?.feedback).toBe('Well done!')
    })

    it('should return null when no grade exists', async () => {
      const assignment = await repository.create({
        class_id: classRecord.id,
        title: 'Test Assignment',
        description: 'Test',
        due_date: new Date('2025-12-31'),
      })

      const submission = await repository.submitAssignment(
        assignment.id,
        student.id,
        'My submission'
      )

      const grade = await repository.getGrade(submission.id)
      expect(grade).toBeNull()
    })
  })

  // ==================== Transaction Support ====================

  describe('transaction support', () => {
    it('should work within a transaction', async () => {
      await db.transaction().execute(async (trx) => {
        const txRepository = new AssignmentRepository(trx)

        const assignment = await txRepository.create({
          class_id: classRecord.id,
          title: 'Transaction Test',
          description: 'Test',
          due_date: new Date('2025-12-31'),
        })

        expect(assignment.id).toBeDefined()
        expect(assignment.title).toBe('Transaction Test')
      })
    })

    it('should rollback on transaction error', async () => {
      try {
        await db.transaction().execute(async (trx) => {
          const txRepository = new AssignmentRepository(trx)

          await txRepository.create({
            class_id: classRecord.id,
            title: 'Will Rollback',
            description: 'Test',
            due_date: new Date('2025-12-31'),
          })

          // Force error
          throw new Error('Transaction error')
        })
      } catch (error) {
        // Expected error
      }

      // Verify assignment was not created
      const count = await repository.count()
      expect(count).toBe(0)
    })
  })
})
