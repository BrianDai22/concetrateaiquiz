import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AssignmentService } from '../../src/AssignmentService'
import { ClassService } from '../../src/ClassService'
import {
  db,
  clearAllTables,
  createTestUser,
} from '@concentrate/database'
import type { User, Class } from '@concentrate/database'
import {
  NotFoundError,
  ForbiddenError,
  InvalidStateError,
  ValidationError,
} from '@concentrate/shared'

describe('AssignmentService - Integration Tests', () => {
  let assignmentService: AssignmentService
  let classService: ClassService
  let teacher: User
  let teacher2: User
  let student1: User
  let student2: User
  let student3: User
  let classRecord: Class

  beforeEach(async () => {
    await clearAllTables(db)
    assignmentService = new AssignmentService(db)
    classService = new ClassService(db)

    // Create test users
    teacher = await createTestUser(db, {
      email: 'teacher@example.com',
      name: 'Teacher',
      role: 'teacher',
    })

    teacher2 = await createTestUser(db, {
      email: 'teacher2@example.com',
      name: 'Teacher 2',
      role: 'teacher',
    })

    student1 = await createTestUser(db, {
      email: 'student1@example.com',
      name: 'Student 1',
      role: 'student',
    })

    student2 = await createTestUser(db, {
      email: 'student2@example.com',
      name: 'Student 2',
      role: 'student',
    })

    student3 = await createTestUser(db, {
      email: 'student3@example.com',
      name: 'Student 3',
      role: 'student',
    })

    // Create class and enroll students
    classRecord = await classService.createClass(teacher.id, {
      name: 'Math 101',
      description: 'Mathematics class',
    })

    await classService.enrollMultipleStudents(
      classRecord.id,
      [student1.id, student2.id],
      teacher.id
    )
  })

  afterEach(async () => {
    await clearAllTables(db)
  })

  // ===========================================
  // Assignment CRUD with Real Database
  // ===========================================
  describe('Assignment CRUD Operations', () => {
    it('should create assignment with real database', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          description: 'Complete exercises 1-10',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      expect(assignment.id).toBeDefined()
      expect(assignment.title).toBe('Homework 1')
      expect(assignment.class_id).toBe(classRecord.id)
      expect(assignment.created_at).toBeInstanceOf(Date)
    })

    it('should retrieve created assignment by ID', async () => {
      const created = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          description: 'Complete exercises',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      const retrieved = await assignmentService.getAssignmentById(created.id)

      expect(retrieved).toEqual(created)
    })

    it('should update assignment in database', async () => {
      const created = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Original Title',
          description: 'Original description',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      const updated = await assignmentService.updateAssignment(
        created.id,
        teacher.id,
        {
          title: 'Updated Title',
          description: 'Updated description',
        }
      )

      expect(updated.title).toBe('Updated Title')
      expect(updated.description).toBe('Updated description')
    })

    it('should delete assignment when no graded submissions', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'To Delete',
          description: 'This will be deleted',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      await assignmentService.deleteAssignment(assignment.id, teacher.id)

      await expect(
        assignmentService.getAssignmentById(assignment.id)
      ).rejects.toThrow(NotFoundError)
    })

    it('should prevent deletion when graded submissions exist', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Assignment with grades',
          description: 'This has a graded submission',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      // Submit and grade
      await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'My submission'
      )

      await assignmentService.gradeSubmission(
        assignment.id,
        student1.id,
        teacher.id,
        85,
        'Good work'
      )

      // Should not be able to delete
      await expect(
        assignmentService.deleteAssignment(assignment.id, teacher.id)
      ).rejects.toThrow(InvalidStateError)
    })

    it('should allow deletion if submissions exist but not graded', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Assignment with ungraded submission',
          description: 'Has submission but no grade',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      // Submit but don't grade
      await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'My submission'
      )

      // Should be able to delete
      await assignmentService.deleteAssignment(assignment.id, teacher.id)

      await expect(
        assignmentService.getAssignmentById(assignment.id)
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ForbiddenError when non-owner tries to update', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Assignment',
          description: 'Description',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      await expect(
        assignmentService.updateAssignment(assignment.id, teacher2.id, {
          title: 'Updated',
        })
      ).rejects.toThrow(ForbiddenError)
    })

    it('should throw ForbiddenError when non-owner tries to delete', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Assignment',
          description: 'Description',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      await expect(
        assignmentService.deleteAssignment(assignment.id, teacher2.id)
      ).rejects.toThrow(ForbiddenError)
    })
  })

  // ===========================================
  // Full Assignment Lifecycle
  // ===========================================
  describe('Complete Assignment Lifecycle', () => {
    it('should handle create → submit → grade → update grade flow', async () => {
      // Create assignment
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          description: 'Complete exercises',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      // Submit assignment
      const submission = await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'Here is my submission'
      )

      expect(submission.assignment_id).toBe(assignment.id)
      expect(submission.student_id).toBe(student1.id)
      expect(submission.content).toBe('Here is my submission')

      // Grade submission
      const grade = await assignmentService.gradeSubmission(
        assignment.id,
        student1.id,
        teacher.id,
        85,
        'Good work'
      )

      expect(Number(grade.grade)).toBe(85)
      expect(grade.feedback).toBe('Good work')

      // Update grade
      const updatedGrade = await assignmentService.updateGrade(
        assignment.id,
        student1.id,
        teacher.id,
        { grade: 90, feedback: 'Excellent work!' }
      )

      expect(Number(updatedGrade.grade)).toBe(90)
      expect(updatedGrade.feedback).toBe('Excellent work!')
    })

    it('should handle multiple submissions for same assignment', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          description: 'Complete exercises',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      // Both students submit
      await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'Student 1 submission'
      )

      await assignmentService.submitAssignment(
        assignment.id,
        student2.id,
        'Student 2 submission'
      )

      // Get all submissions
      const submissions = await assignmentService.getSubmissionsByAssignment(
        assignment.id,
        teacher.id
      )

      expect(submissions).toHaveLength(2)
      expect(submissions.map((s) => s.student_id).sort()).toEqual(
        [student1.id, student2.id].sort()
      )
    })

    it('should prevent updating submission after grading', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          description: 'Complete exercises',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'Original submission'
      )

      await assignmentService.gradeSubmission(
        assignment.id,
        student1.id,
        teacher.id,
        85
      )

      // Should not be able to update after grading
      await expect(
        assignmentService.updateSubmission(assignment.id, student1.id, {
          content: 'Updated submission',
        })
      ).rejects.toThrow(InvalidStateError)
    })

    it('should allow updating submission before grading', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          description: 'Complete exercises',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'Original submission'
      )

      const updated = await assignmentService.updateSubmission(
        assignment.id,
        student1.id,
        {
          content: 'Updated submission',
        }
      )

      expect(updated.content).toBe('Updated submission')
    })
  })

  // ===========================================
  // Submission Authorization and Validation
  // ===========================================
  describe('Submission Authorization', () => {
    it('should prevent submission from unenrolled student', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          description: 'Complete exercises',
        }
      )

      // student3 is not enrolled
      await expect(
        assignmentService.submitAssignment(
          assignment.id,
          student3.id,
          'My submission'
        )
      ).rejects.toThrow(ForbiddenError)
    })

    it('should prevent duplicate submissions', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          description: 'Complete exercises',
        }
      )

      await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'First submission'
      )

      await expect(
        assignmentService.submitAssignment(
          assignment.id,
          student1.id,
          'Second submission'
        )
      ).rejects.toThrow(InvalidStateError)
    })

    it('should prevent late submissions after due date', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          description: 'Complete exercises',
          due_date: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        }
      )

      await expect(
        assignmentService.submitAssignment(
          assignment.id,
          student1.id,
          'Late submission'
        )
      ).rejects.toThrow(InvalidStateError)
    })

    it('should allow submission with file URL', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          description: 'Complete exercises',
        }
      )

      const submission = await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'See attached file',
        'https://example.com/submission.pdf'
      )

      expect(submission.file_url).toBe('https://example.com/submission.pdf')
    })

    it('should prevent student from updating another student submission', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          description: 'Complete exercises',
        }
      )

      await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'Student 1 submission'
      )

      // Student2 tries to update but has no submission - should get NotFoundError
      await expect(
        assignmentService.updateSubmission(assignment.id, student2.id, {
          content: 'Trying to update but no submission',
        })
      ).rejects.toThrow(NotFoundError)
    })
  })

  // ===========================================
  // Grading Operations
  // ===========================================
  describe('Grading Operations', () => {
    it('should enforce grade range 0-100', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          description: 'Complete exercises',
        }
      )

      await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'My submission'
      )

      // Grade < 0
      await expect(
        assignmentService.gradeSubmission(
          assignment.id,
          student1.id,
          teacher.id,
          -5
        )
      ).rejects.toThrow(ValidationError)

      // Grade > 100
      await expect(
        assignmentService.gradeSubmission(
          assignment.id,
          student1.id,
          teacher.id,
          105
        )
      ).rejects.toThrow(ValidationError)
    })

    it('should accept boundary grades (0 and 100)', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          description: 'Complete exercises',
        }
      )

      await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'Submission 1'
      )

      await assignmentService.submitAssignment(
        assignment.id,
        student2.id,
        'Submission 2'
      )

      // Grade of 0 should work
      const grade1 = await assignmentService.gradeSubmission(
        assignment.id,
        student1.id,
        teacher.id,
        0
      )
      expect(Number(grade1.grade)).toBe(0)

      // Grade of 100 should work
      const grade2 = await assignmentService.gradeSubmission(
        assignment.id,
        student2.id,
        teacher.id,
        100
      )
      expect(Number(grade2.grade)).toBe(100)
    })

    it('should prevent non-teacher from grading', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          description: 'Complete exercises',
        }
      )

      await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'My submission'
      )

      await expect(
        assignmentService.gradeSubmission(
          assignment.id,
          student1.id,
          teacher2.id,
          85
        )
      ).rejects.toThrow(ForbiddenError)
    })

    it('should handle bulk grading', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          description: 'Complete exercises',
        }
      )

      // Multiple students submit
      await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'Submission 1'
      )

      await assignmentService.submitAssignment(
        assignment.id,
        student2.id,
        'Submission 2'
      )

      // Bulk grade
      const count = await assignmentService.bulkGradeSubmissions(
        [
          {
            assignmentId: assignment.id,
            studentId: student1.id,
            grade: 85,
            feedback: 'Good work',
          },
          {
            assignmentId: assignment.id,
            studentId: student2.id,
            grade: 90,
            feedback: 'Excellent work',
          },
        ],
        teacher.id
      )

      expect(count).toBe(2)

      // Verify grades
      const grade1 = await assignmentService.getGrade(assignment.id, student1.id)
      const grade2 = await assignmentService.getGrade(assignment.id, student2.id)

      expect(Number(grade1?.grade)).toBe(85)
      expect(Number(grade2?.grade)).toBe(90)
    })

    it('should allow teacher to update grades', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          description: 'Complete exercises',
        }
      )

      await assignmentService.submitAssignment(
        assignment.id,
        student1.id,
        'My submission'
      )

      await assignmentService.gradeSubmission(
        assignment.id,
        student1.id,
        teacher.id,
        85,
        'Good work'
      )

      const updated = await assignmentService.updateGrade(
        assignment.id,
        student1.id,
        teacher.id,
        {
          grade: 90,
          feedback: 'Excellent work after review',
        }
      )

      expect(Number(updated.grade)).toBe(90)
      expect(updated.feedback).toBe('Excellent work after review')
    })
  })

  // ===========================================
  // Query Operations
  // ===========================================
  describe('Query Operations', () => {
    it('should get assignments by class', async () => {
      await assignmentService.createAssignment(classRecord.id, teacher.id, {
        title: 'Homework 1',
        description: 'Exercises 1-10',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      await assignmentService.createAssignment(classRecord.id, teacher.id, {
        title: 'Homework 2',
        description: 'Exercises 11-20',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      const assignments = await assignmentService.getAssignmentsByClass(
        classRecord.id
      )

      expect(assignments).toHaveLength(2)
      expect(assignments.every((a) => a.class_id === classRecord.id)).toBe(true)
    })

    it('should get assignments by teacher', async () => {
      await assignmentService.createAssignment(classRecord.id, teacher.id, {
        title: 'Homework 1',
        description: 'Exercises',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      // Create another class and assignment
      const class2 = await classService.createClass(teacher.id, {
        name: 'Science 101',
        description: 'Science',
      })

      await assignmentService.createAssignment(class2.id, teacher.id, {
        title: 'Science Homework',
        description: 'Exercises',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      const assignments = await assignmentService.getAssignmentsByTeacher(
        teacher.id
      )

      expect(assignments).toHaveLength(2)
    })

    it('should get assignments for student (enrolled classes only)', async () => {
      const assignment = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          description: 'Exercises',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      const assignments = await assignmentService.getAssignmentsForStudent(
        student1.id
      )

      expect(assignments).toHaveLength(1)
      expect(assignments[0].id).toBe(assignment.id)
    })

    it('should get submissions by student', async () => {
      const assignment1 = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 1',
          description: 'Exercises',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      const assignment2 = await assignmentService.createAssignment(
        classRecord.id,
        teacher.id,
        {
          title: 'Homework 2',
          description: 'Exercises',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      )

      await assignmentService.submitAssignment(
        assignment1.id,
        student1.id,
        'Submission 1'
      )

      await assignmentService.submitAssignment(
        assignment2.id,
        student1.id,
        'Submission 2'
      )

      const submissions = await assignmentService.getSubmissionsByStudent(
        student1.id
      )

      expect(submissions).toHaveLength(2)
      expect(submissions.every((s) => s.student_id === student1.id)).toBe(true)
    })

    it('should get assignment count by class', async () => {
      expect(
        await assignmentService.getAssignmentCountByClass(classRecord.id)
      ).toBe(0)

      await assignmentService.createAssignment(classRecord.id, teacher.id, {
        title: 'Homework 1',
        description: 'Exercises',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      expect(
        await assignmentService.getAssignmentCountByClass(classRecord.id)
      ).toBe(1)

      await assignmentService.createAssignment(classRecord.id, teacher.id, {
        title: 'Homework 2',
        description: 'Exercises',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      expect(
        await assignmentService.getAssignmentCountByClass(classRecord.id)
      ).toBe(2)
    })
  })

  // ===========================================
  // Pagination Tests
  // ===========================================
  describe('Pagination', () => {
    it('should support pagination for assignments by class', async () => {
      // Create 15 assignments
      for (let i = 0; i < 15; i++) {
        await assignmentService.createAssignment(classRecord.id, teacher.id, {
          title: `Homework ${i + 1}`,
          description: `Exercises ${i + 1}`,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
      }

      const page1 = await assignmentService.getAssignmentsByClass(
        classRecord.id,
        { page: 1, limit: 10 }
      )

      const page2 = await assignmentService.getAssignmentsByClass(
        classRecord.id,
        { page: 2, limit: 10 }
      )

      expect(page1).toHaveLength(10)
      expect(page2).toHaveLength(5)
    })

    it('should support pagination for assignments by teacher', async () => {
      // Create multiple classes with assignments
      const class1 = await classService.createClass(teacher.id, {
        name: 'Math 101',
        description: 'Math',
      })

      const class2 = await classService.createClass(teacher.id, {
        name: 'Math 102',
        description: 'Advanced Math',
      })

      // 6 assignments in class1
      for (let i = 0; i < 6; i++) {
        await assignmentService.createAssignment(class1.id, teacher.id, {
          title: `Math Assignment ${i + 1}`,
          description: 'Exercises',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
      }

      // 6 assignments in class2
      for (let i = 0; i < 6; i++) {
        await assignmentService.createAssignment(class2.id, teacher.id, {
          title: `Advanced Math Assignment ${i + 1}`,
          description: 'Exercises',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
      }

      const page1 = await assignmentService.getAssignmentsByTeacher(teacher.id, {
        page: 1,
        limit: 5,
      })

      const page2 = await assignmentService.getAssignmentsByTeacher(teacher.id, {
        page: 2,
        limit: 5,
      })

      expect(page1).toHaveLength(5)
      expect(page2).toHaveLength(5)
    })
  })
})
