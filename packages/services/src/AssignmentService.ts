import type { Kysely, Transaction } from 'kysely'
import type {
  Database,
  Assignment,
  NewAssignment,
  AssignmentUpdate,
  Submission,
  SubmissionUpdate,
  Grade,
  GradeUpdate,
  GradeWithAssignment,
} from '@concentrate/database'
import {
  AssignmentRepository,
  ClassRepository,
} from '@concentrate/database'
import {
  NotFoundError,
  ForbiddenError,
  InvalidStateError,
  ValidationError,
} from '@concentrate/shared'

/**
 * AssignmentService - Business logic for assignment, submission, and grading management
 *
 * Responsibilities:
 * - Assignment CRUD with teacher ownership validation
 * - Submission management with due date enforcement
 * - Grading operations with permission checks
 * - Assignment queries (upcoming, overdue, by class/teacher/student)
 *
 * Business Rules:
 * - Only class teacher can create/manage assignments
 * - Student must be enrolled to submit assignments
 * - Cannot submit after due date (configurable)
 * - Cannot update submission after grading
 * - Only assignment owner can update submission
 * - Only class teacher can grade submissions
 * - Grade must be 0-100
 * - Cannot delete assignment with graded submissions
 */
export class AssignmentService {
  private assignmentRepository: AssignmentRepository
  private classRepository: ClassRepository

  constructor(db: Kysely<Database> | Transaction<Database>) {
    this.assignmentRepository = new AssignmentRepository(db)
    this.classRepository = new ClassRepository(db)
  }

  /**
   * Create assignment
   * - Validates class exists and teacher ownership
   * @param classId - Class ID
   * @param teacherId - Teacher ID
   * @param data - Assignment data
   * @returns Created assignment
   * @throws NotFoundError if class not found
   * @throws ForbiddenError if not the class teacher
   */
  async createAssignment(
    classId: string,
    teacherId: string,
    data: Omit<NewAssignment, 'class_id'>
  ): Promise<Assignment> {
    // Verify class exists and teacher ownership
    const classRecord = await this.classRepository.findById(classId)
    if (!classRecord) {
      throw new NotFoundError('Class not found')
    }

    if (classRecord.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only create assignments for your own classes')
    }

    const assignmentData: NewAssignment = {
      ...data,
      class_id: classId,
    }

    const assignment = await this.assignmentRepository.create(assignmentData)
    return assignment
  }

  /**
   * Get assignment by ID
   * @param id - Assignment ID
   * @returns Assignment if found
   * @throws NotFoundError if assignment not found
   */
  async getAssignmentById(id: string): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findById(id)
    if (!assignment) {
      throw new NotFoundError(`Assignment with ID ${id} not found`)
    }
    return assignment
  }

  /**
   * Update assignment
   * - Validates teacher ownership
   * @param id - Assignment ID
   * @param teacherId - Teacher ID
   * @param updates - Assignment updates
   * @returns Updated assignment
   * @throws NotFoundError if assignment or class not found
   * @throws ForbiddenError if not the class teacher
   */
  async updateAssignment(
    id: string,
    teacherId: string,
    updates: AssignmentUpdate
  ): Promise<Assignment> {
    const assignment = await this.getAssignmentById(id)

    // Verify teacher ownership
    const classRecord = await this.classRepository.findById(assignment.class_id)
    if (!classRecord) {
      throw new NotFoundError('Class not found')
    }

    if (classRecord.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only update assignments for your own classes')
    }

    const updatedAssignment = await this.assignmentRepository.update(id, updates)
    return updatedAssignment
  }

  /**
   * Delete assignment
   * - Validates teacher ownership
   * - Prevents deletion if graded submissions exist
   * @param id - Assignment ID
   * @param teacherId - Teacher ID
   * @throws NotFoundError if assignment or class not found
   * @throws ForbiddenError if not the class teacher
   * @throws InvalidStateError if graded submissions exist
   */
  async deleteAssignment(id: string, teacherId: string): Promise<void> {
    const assignment = await this.getAssignmentById(id)

    // Verify teacher ownership
    const classRecord = await this.classRepository.findById(assignment.class_id)
    if (!classRecord) {
      throw new NotFoundError('Class not found')
    }

    if (classRecord.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only delete assignments for your own classes')
    }

    // Check for graded submissions
    const submissions = await this.assignmentRepository.getSubmissionsByAssignment(id)
    const hasGradedSubmissions = await Promise.all(
      submissions.map(async (submission) => {
        const grade = await this.assignmentRepository.getGrade(submission.id)
        return grade !== null
      })
    )

    if (hasGradedSubmissions.some((isGraded) => isGraded)) {
      throw new InvalidStateError(
        'Cannot delete assignment with graded submissions'
      )
    }

    await this.assignmentRepository.delete(id)
  }

  /**
   * Get assignments by class
   * @param classId - Class ID
   * @param options - Pagination options
   * @returns List of assignments
   */
  async getAssignmentsByClass(
    classId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Assignment[]> {
    return this.assignmentRepository.findByClass(classId, options)
  }

  /**
   * Get assignments by teacher
   * @param teacherId - Teacher ID
   * @param options - Pagination options
   * @returns List of assignments across all teacher's classes
   */
  async getAssignmentsByTeacher(
    teacherId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Assignment[]> {
    return this.assignmentRepository.findByTeacher(teacherId, options)
  }

  /**
   * Get assignments for student
   * - Returns assignments from all enrolled classes
   * @param studentId - Student ID
   * @param options - Pagination options
   * @returns List of assignments
   */
  async getAssignmentsForStudent(
    studentId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Assignment[]> {
    return this.assignmentRepository.findByStudent(studentId, options)
  }

  /**
   * Get upcoming assignments for class
   * @param classId - Class ID
   * @returns List of upcoming assignments
   */
  async getUpcomingAssignments(classId: string): Promise<Assignment[]> {
    return this.assignmentRepository.findUpcoming(classId)
  }

  /**
   * Get overdue assignments for student
   * - Returns assignments past due date without submission
   * @param studentId - Student ID
   * @returns List of overdue assignments
   */
  async getOverdueAssignments(studentId: string): Promise<Assignment[]> {
    return this.assignmentRepository.findOverdue(studentId)
  }

  /**
   * Submit assignment
   * - Validates student enrollment
   * - Checks due date
   * - Prevents duplicate submissions
   * @param assignmentId - Assignment ID
   * @param studentId - Student ID
   * @param content - Submission content
   * @param fileUrl - Optional file URL
   * @returns Created submission
   * @throws NotFoundError if assignment not found
   * @throws ForbiddenError if student not enrolled
   * @throws InvalidStateError if past due date or already submitted
   */
  async submitAssignment(
    assignmentId: string,
    studentId: string,
    content: string,
    fileUrl?: string
  ): Promise<Submission> {
    const assignment = await this.getAssignmentById(assignmentId)

    // Verify student is enrolled in class
    const isEnrolled = await this.classRepository.isStudentEnrolled(
      assignment.class_id,
      studentId
    )
    if (!isEnrolled) {
      throw new ForbiddenError('You must be enrolled in the class to submit assignments')
    }

    // Check if already submitted
    const existingSubmission = await this.assignmentRepository.getSubmission(
      assignmentId,
      studentId
    )
    if (existingSubmission) {
      throw new InvalidStateError('Assignment already submitted')
    }

    // Check due date
    const now = new Date()
    if (assignment.due_date && now > assignment.due_date) {
      throw new InvalidStateError('Cannot submit assignment after due date')
    }

    const submission = await this.assignmentRepository.submitAssignment(
      assignmentId,
      studentId,
      content,
      fileUrl
    )

    return submission
  }

  /**
   * Update submission
   * - Validates ownership
   * - Prevents update after grading
   * @param assignmentId - Assignment ID
   * @param studentId - Student ID
   * @param updates - Submission updates
   * @returns Updated submission
   * @throws NotFoundError if submission not found
   * @throws ForbiddenError if not the submission owner
   * @throws InvalidStateError if submission already graded
   */
  async updateSubmission(
    assignmentId: string,
    studentId: string,
    updates: SubmissionUpdate
  ): Promise<Submission> {
    const submission = await this.assignmentRepository.getSubmission(
      assignmentId,
      studentId
    )
    if (!submission) {
      throw new NotFoundError('Submission not found')
    }

    // Verify ownership
    if (submission.student_id !== studentId) {
      throw new ForbiddenError('You can only update your own submissions')
    }

    // Check if already graded
    const grade = await this.assignmentRepository.getGrade(submission.id)
    if (grade) {
      throw new InvalidStateError('Cannot update submission after grading')
    }

    const updatedSubmission = await this.assignmentRepository.updateSubmission(
      submission.id,
      updates
    )

    return updatedSubmission
  }

  /**
   * Get submission
   * @param assignmentId - Assignment ID
   * @param studentId - Student ID
   * @returns Submission if found, null otherwise
   */
  async getSubmission(
    assignmentId: string,
    studentId: string
  ): Promise<Submission | null> {
    return this.assignmentRepository.getSubmission(assignmentId, studentId)
  }

  /**
   * Get submissions by assignment
   * - Only accessible by class teacher
   * @param assignmentId - Assignment ID
   * @param teacherId - Teacher ID
   * @returns List of submissions
   * @throws NotFoundError if assignment or class not found
   * @throws ForbiddenError if not the class teacher
   */
  async getSubmissionsByAssignment(
    assignmentId: string,
    teacherId: string
  ): Promise<Submission[]> {
    const assignment = await this.getAssignmentById(assignmentId)

    // Verify teacher ownership
    const classRecord = await this.classRepository.findById(assignment.class_id)
    if (!classRecord) {
      throw new NotFoundError('Class not found')
    }

    if (classRecord.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only view submissions for your own classes')
    }

    return this.assignmentRepository.getSubmissionsByAssignment(assignmentId)
  }

  /**
   * Get submissions by student
   * @param studentId - Student ID
   * @returns List of submissions
   */
  async getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
    return this.assignmentRepository.getSubmissionsByStudent(studentId)
  }

  /**
   * Grade submission
   * - Validates teacher ownership
   * - Validates grade range (0-100)
   * @param assignmentId - Assignment ID
   * @param studentId - Student ID
   * @param teacherId - Teacher ID
   * @param grade - Grade value (0-100)
   * @param feedback - Optional feedback
   * @returns Created grade
   * @throws NotFoundError if submission or assignment not found
   * @throws ForbiddenError if not the class teacher
   * @throws ValidationError if grade out of range
   */
  async gradeSubmission(
    assignmentId: string,
    studentId: string,
    teacherId: string,
    grade: number,
    feedback?: string
  ): Promise<Grade> {
    // Validate grade range
    if (grade < 0 || grade > 100) {
      throw new ValidationError('Grade must be between 0 and 100')
    }

    const submission = await this.assignmentRepository.getSubmission(
      assignmentId,
      studentId
    )
    if (!submission) {
      throw new NotFoundError('Submission not found')
    }

    const assignment = await this.getAssignmentById(assignmentId)

    // Verify teacher ownership
    const classRecord = await this.classRepository.findById(assignment.class_id)
    if (!classRecord) {
      throw new NotFoundError('Class not found')
    }

    if (classRecord.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only grade submissions for your own classes')
    }

    const gradeRecord = await this.assignmentRepository.gradeSubmission(
      submission.id,
      teacherId,
      grade,
      feedback
    )

    return gradeRecord
  }

  /**
   * Update grade
   * - Validates teacher ownership
   * - Validates grade range if grade is updated
   * @param assignmentId - Assignment ID
   * @param studentId - Student ID
   * @param teacherId - Teacher ID
   * @param updates - Grade updates
   * @returns Updated grade
   * @throws NotFoundError if grade, submission, or assignment not found
   * @throws ForbiddenError if not the class teacher
   * @throws ValidationError if grade out of range
   */
  async updateGrade(
    assignmentId: string,
    studentId: string,
    teacherId: string,
    updates: GradeUpdate
  ): Promise<Grade> {
    // Validate grade range if being updated
    if (updates.grade !== undefined) {
      const gradeValue =
        typeof updates.grade === 'string' ? parseFloat(updates.grade) : updates.grade
      if (gradeValue < 0 || gradeValue > 100) {
        throw new ValidationError('Grade must be between 0 and 100')
      }
    }

    const submission = await this.assignmentRepository.getSubmission(
      assignmentId,
      studentId
    )
    if (!submission) {
      throw new NotFoundError('Submission not found')
    }

    const grade = await this.assignmentRepository.getGrade(submission.id)
    if (!grade) {
      throw new NotFoundError('Grade not found')
    }

    const assignment = await this.getAssignmentById(assignmentId)

    // Verify teacher ownership
    const classRecord = await this.classRepository.findById(assignment.class_id)
    if (!classRecord) {
      throw new NotFoundError('Class not found')
    }

    if (classRecord.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only update grades for your own classes')
    }

    const updatedGrade = await this.assignmentRepository.updateGrade(grade.id, updates)
    return updatedGrade
  }

  /**
   * Bulk grade submissions
   * - Validates all submissions belong to teacher's classes
   * - Validates all grade ranges
   * @param grades - Array of grade data
   * @param teacherId - Teacher ID
   * @returns Number of submissions graded
   * @throws ValidationError if any grade out of range
   * @throws ForbiddenError if not the class teacher for any submission
   */
  async bulkGradeSubmissions(
    grades: Array<{
      assignmentId: string
      studentId: string
      grade: number
      feedback?: string
    }>,
    teacherId: string
  ): Promise<number> {
    if (grades.length === 0) {
      return 0
    }

    // Validate all grade ranges
    for (const gradeData of grades) {
      if (gradeData.grade < 0 || gradeData.grade > 100) {
        throw new ValidationError('All grades must be between 0 and 100')
      }
    }

    // Verify teacher ownership for all submissions and get submission IDs
    const submissionRecords: Array<{
      submissionId: string
      teacherId: string
      grade: number
      feedback?: string
    }> = []

    for (const gradeData of grades) {
      const submission = await this.assignmentRepository.getSubmission(
        gradeData.assignmentId,
        gradeData.studentId
      )
      if (!submission) {
        throw new NotFoundError(
          `Submission for assignment ${gradeData.assignmentId} and student ${gradeData.studentId} not found`
        )
      }

      const assignment = await this.getAssignmentById(gradeData.assignmentId)
      const classRecord = await this.classRepository.findById(assignment.class_id)
      if (!classRecord) {
        throw new NotFoundError('Class not found')
      }

      if (classRecord.teacher_id !== teacherId) {
        throw new ForbiddenError(
          'You can only grade submissions for your own classes'
        )
      }

      submissionRecords.push({
        submissionId: submission.id,
        teacherId,
        grade: gradeData.grade,
        ...(gradeData.feedback && { feedback: gradeData.feedback }),
      })
    }

    // Bulk grade
    const count = await this.assignmentRepository.bulkGradeSubmissions(submissionRecords)
    return count
  }

  /**
   * Get grade for submission
   * @param assignmentId - Assignment ID
   * @param studentId - Student ID
   * @returns Grade if found, null otherwise
   */
  async getGrade(assignmentId: string, studentId: string): Promise<Grade | null> {
    const submission = await this.assignmentRepository.getSubmission(
      assignmentId,
      studentId
    )
    if (!submission) {
      return null
    }
    return this.assignmentRepository.getGrade(submission.id)
  }

  /**
   * Get all grades for a student with assignment details
   * @param studentId - Student ID
   * @returns Array of grades with assignment information
   */
  async getGradesWithAssignmentByStudent(
    studentId: string
  ): Promise<GradeWithAssignment[]> {
    return this.assignmentRepository.getGradesWithAssignmentByStudent(studentId)
  }

  /**
   * Get assignment count by class
   * @param classId - Class ID
   * @returns Number of assignments
   */
  async getAssignmentCountByClass(classId: string): Promise<number> {
    return this.assignmentRepository.countByClass(classId)
  }

  /**
   * Get submission statistics for an assignment
   * @param assignmentId - Assignment ID
   * @param teacherId - Teacher ID (for authorization)
   * @returns Submission stats {total, graded, ungraded}
   * @throws NotFoundError if assignment not found
   * @throws ForbiddenError if not the class teacher
   */
  async getSubmissionStats(
    assignmentId: string,
    teacherId: string
  ): Promise<{
    total: number
    graded: number
    ungraded: number
  }> {
    const assignment = await this.getAssignmentById(assignmentId)

    // Verify teacher ownership
    const classRecord = await this.classRepository.findById(assignment.class_id)
    if (!classRecord) {
      throw new NotFoundError('Class not found')
    }

    if (classRecord.teacher_id !== teacherId) {
      throw new ForbiddenError('You can only view stats for your own assignments')
    }

    const total = await this.assignmentRepository.countSubmissionsByAssignment(
      assignmentId
    )
    const graded = await this.assignmentRepository.countGradedSubmissions(
      assignmentId
    )

    return {
      total,
      graded,
      ungraded: total - graded,
    }
  }
}
