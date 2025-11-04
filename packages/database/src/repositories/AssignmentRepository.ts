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
} from '../schema'

/**
 * AssignmentRepository - Encapsulates all database operations for assignments, submissions, and grades
 *
 * Following Repository Pattern:
 * - Accept Kysely instance or Transaction for flexibility
 * - No business logic - only data access operations
 * - Return null for not found, throw for database errors
 * - Support pagination and filtering
 */
export class AssignmentRepository {
  constructor(private db: Kysely<Database> | Transaction<Database>) {}

  // ==================== Assignment CRUD ====================

  /**
   * Create a new assignment
   * @param assignment - Assignment data to insert
   * @returns The created assignment
   * @throws Database error if creation fails
   */
  async create(assignment: NewAssignment): Promise<Assignment> {
    return await this.db
      .insertInto('assignments')
      .values(assignment)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Find assignment by ID
   * @param id - Assignment ID
   * @returns Assignment if found, null otherwise
   */
  async findById(id: string): Promise<Assignment | null> {
    const assignment = await this.db
      .selectFrom('assignments')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return assignment ?? null
  }

  /**
   * Find all assignments with pagination
   * @param options - Pagination options (default: page=1, limit=10)
   * @returns Array of assignments ordered by created_at desc
   */
  async findAll(options?: {
    page?: number
    limit?: number
  }): Promise<Assignment[]> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = (page - 1) * limit

    return await this.db
      .selectFrom('assignments')
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()
  }

  /**
   * Update an assignment
   * @param id - Assignment ID
   * @param updates - Fields to update
   * @returns Updated assignment
   * @throws Error if assignment not found
   */
  async update(id: string, updates: AssignmentUpdate): Promise<Assignment> {
    const assignment = await this.db
      .updateTable('assignments')
      .set(updates)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst()

    if (!assignment) {
      throw new Error(`Assignment with id ${id} not found`)
    }

    return assignment
  }

  /**
   * Delete an assignment
   * @param id - Assignment ID
   * @throws Error if assignment not found
   */
  async delete(id: string): Promise<void> {
    const result = await this.db
      .deleteFrom('assignments')
      .where('id', '=', id)
      .executeTakeFirst()

    if (result.numDeletedRows === 0n) {
      throw new Error(`Assignment with id ${id} not found`)
    }
  }

  // ==================== Assignment Queries ====================

  /**
   * Find assignments by class ID
   * @param classId - Class ID
   * @param options - Pagination options
   * @returns Array of assignments for the class
   */
  async findByClass(
    classId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Assignment[]> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = (page - 1) * limit

    return await this.db
      .selectFrom('assignments')
      .selectAll()
      .where('class_id', '=', classId)
      .orderBy('due_date', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()
  }

  /**
   * Find assignments by teacher ID (via classes table)
   * @param teacherId - Teacher ID
   * @param options - Pagination options
   * @returns Array of assignments for all classes taught by the teacher
   */
  async findByTeacher(
    teacherId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Assignment[]> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = (page - 1) * limit

    return await this.db
      .selectFrom('assignments')
      .innerJoin('classes', 'assignments.class_id', 'classes.id')
      .selectAll('assignments')
      .where('classes.teacher_id', '=', teacherId)
      .orderBy('assignments.created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()
  }

  /**
   * Find assignments for a student (via class_students junction table)
   * @param studentId - Student ID
   * @param options - Pagination options
   * @returns Array of assignments for all classes the student is enrolled in
   */
  async findByStudent(
    studentId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Assignment[]> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = (page - 1) * limit

    return await this.db
      .selectFrom('assignments')
      .innerJoin('class_students', 'assignments.class_id', 'class_students.class_id')
      .selectAll('assignments')
      .where('class_students.student_id', '=', studentId)
      .orderBy('assignments.due_date', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()
  }

  /**
   * Find upcoming assignments for a class (due_date in the future)
   * @param classId - Class ID
   * @returns Array of upcoming assignments ordered by due_date asc
   */
  async findUpcoming(classId: string): Promise<Assignment[]> {
    const now = new Date()

    return await this.db
      .selectFrom('assignments')
      .selectAll()
      .where('class_id', '=', classId)
      .where('due_date', '>', now)
      .orderBy('due_date', 'asc')
      .execute()
  }

  /**
   * Find overdue assignments for a student (past due and no submission)
   * @param studentId - Student ID
   * @returns Array of overdue assignments with no submission
   */
  async findOverdue(studentId: string): Promise<Assignment[]> {
    const now = new Date()

    return await this.db
      .selectFrom('assignments')
      .innerJoin('class_students', 'assignments.class_id', 'class_students.class_id')
      .leftJoin('submissions', (join) =>
        join
          .onRef('submissions.assignment_id', '=', 'assignments.id')
          .onRef('submissions.student_id', '=', 'class_students.student_id')
      )
      .selectAll('assignments')
      .where('class_students.student_id', '=', studentId)
      .where('assignments.due_date', '<', now)
      .where('submissions.id', 'is', null) // No submission
      .orderBy('assignments.due_date', 'desc')
      .execute()
  }

  /**
   * Count total number of assignments
   * @returns Total count
   */
  async count(): Promise<number> {
    const result = await this.db
      .selectFrom('assignments')
      .select((eb) => eb.fn.count<string>('id').as('count'))
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  /**
   * Count assignments for a specific class
   * @param classId - Class ID
   * @returns Count of assignments in the class
   */
  async countByClass(classId: string): Promise<number> {
    const result = await this.db
      .selectFrom('assignments')
      .select((eb) => eb.fn.count<string>('id').as('count'))
      .where('class_id', '=', classId)
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  // ==================== Submission Methods ====================

  /**
   * Submit an assignment
   * @param assignmentId - Assignment ID
   * @param studentId - Student ID
   * @param content - Submission content
   * @param fileUrl - Optional file URL
   * @returns The created submission
   * @throws Database error if creation fails
   */
  async submitAssignment(
    assignmentId: string,
    studentId: string,
    content: string,
    fileUrl?: string
  ): Promise<Submission> {
    return await this.db
      .insertInto('submissions')
      .values({
        assignment_id: assignmentId,
        student_id: studentId,
        content,
        file_url: fileUrl ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Get a specific submission
   * @param assignmentId - Assignment ID
   * @param studentId - Student ID
   * @returns Submission if found, null otherwise
   */
  async getSubmission(
    assignmentId: string,
    studentId: string
  ): Promise<Submission | null> {
    const submission = await this.db
      .selectFrom('submissions')
      .selectAll()
      .where('assignment_id', '=', assignmentId)
      .where('student_id', '=', studentId)
      .executeTakeFirst()

    return submission ?? null
  }

  /**
   * Get all submissions for an assignment
   * @param assignmentId - Assignment ID
   * @returns Array of submissions ordered by submitted_at desc
   */
  async getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
    return await this.db
      .selectFrom('submissions')
      .selectAll()
      .where('assignment_id', '=', assignmentId)
      .orderBy('submitted_at', 'desc')
      .execute()
  }

  /**
   * Get all submissions by a student
   * @param studentId - Student ID
   * @returns Array of submissions ordered by submitted_at desc
   */
  async getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
    return await this.db
      .selectFrom('submissions')
      .selectAll()
      .where('student_id', '=', studentId)
      .orderBy('submitted_at', 'desc')
      .execute()
  }

  /**
   * Update a submission
   * @param submissionId - Submission ID
   * @param updates - Fields to update
   * @returns Updated submission
   * @throws Error if submission not found
   */
  async updateSubmission(
    submissionId: string,
    updates: SubmissionUpdate
  ): Promise<Submission> {
    const submission = await this.db
      .updateTable('submissions')
      .set(updates)
      .where('id', '=', submissionId)
      .returningAll()
      .executeTakeFirst()

    if (!submission) {
      throw new Error(`Submission with id ${submissionId} not found`)
    }

    return submission
  }

  // ==================== Grading Methods ====================

  /**
   * Grade a submission
   * @param submissionId - Submission ID
   * @param teacherId - Teacher ID
   * @param grade - Numeric grade
   * @param feedback - Optional feedback text
   * @returns The created grade
   * @throws Database error if creation fails
   */
  async gradeSubmission(
    submissionId: string,
    teacherId: string,
    grade: number,
    feedback?: string
  ): Promise<Grade> {
    return await this.db
      .insertInto('grades')
      .values({
        submission_id: submissionId,
        teacher_id: teacherId,
        grade,
        feedback: feedback ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Update a grade
   * @param gradeId - Grade ID
   * @param updates - Fields to update
   * @returns Updated grade
   * @throws Error if grade not found
   */
  async updateGrade(gradeId: string, updates: GradeUpdate): Promise<Grade> {
    const grade = await this.db
      .updateTable('grades')
      .set(updates)
      .where('id', '=', gradeId)
      .returningAll()
      .executeTakeFirst()

    if (!grade) {
      throw new Error(`Grade with id ${gradeId} not found`)
    }

    return grade
  }

  /**
   * Bulk grade multiple submissions
   * @param grades - Array of grade data
   * @returns Number of grades created
   */
  async bulkGradeSubmissions(
    grades: Array<{
      submissionId: string
      teacherId: string
      grade: number
      feedback?: string
    }>
  ): Promise<number> {
    if (grades.length === 0) {
      return 0
    }

    const values = grades.map((g) => ({
      submission_id: g.submissionId,
      teacher_id: g.teacherId,
      grade: g.grade,
      feedback: g.feedback ?? null,
    }))

    const result = await this.db
      .insertInto('grades')
      .values(values)
      .executeTakeFirst()

    // PostgreSQL always returns numInsertedOrUpdatedRows, but handle undefined for type safety
    if (result.numInsertedOrUpdatedRows === undefined) {
      return 0
    }

    return Number(result.numInsertedOrUpdatedRows)
  }

  /**
   * Get grade for a submission
   * @param submissionId - Submission ID
   * @returns Grade if found, null otherwise
   */
  async getGrade(submissionId: string): Promise<Grade | null> {
    const grade = await this.db
      .selectFrom('grades')
      .selectAll()
      .where('submission_id', '=', submissionId)
      .executeTakeFirst()

    return grade ?? null
  }
}
