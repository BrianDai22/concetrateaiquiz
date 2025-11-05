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
  SubmissionWithStudent,
  GradeWithAssignment,
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
   * Get all submissions for an assignment with student information
   * @param assignmentId - Assignment ID
   * @returns Array of submissions with student data ordered by submitted_at desc
   */
  async getSubmissionsByAssignment(
    assignmentId: string
  ): Promise<SubmissionWithStudent[]> {
    const results = await this.db
      .selectFrom('submissions')
      .leftJoin('users', 'submissions.student_id', 'users.id')
      .select([
        'submissions.id',
        'submissions.assignment_id',
        'submissions.student_id',
        'submissions.content',
        'submissions.file_url',
        'submissions.submitted_at',
        'submissions.updated_at',
        'users.id as student_user_id',
        'users.name as student_name',
        'users.email as student_email',
      ])
      .where('submissions.assignment_id', '=', assignmentId)
      .orderBy('submissions.submitted_at', 'desc')
      .execute()

    return results.map((row) => ({
      id: row.id,
      assignment_id: row.assignment_id,
      student_id: row.student_id,
      content: row.content,
      file_url: row.file_url,
      submitted_at: row.submitted_at,
      updated_at: row.updated_at,
      student: {
        id: row.student_user_id ?? row.student_id,
        name: row.student_name ?? 'Unknown Student',
        email: row.student_email ?? 'unknown@example.com',
      },
    }))
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
   * Count submissions for an assignment
   * @param assignmentId - Assignment ID
   * @returns Number of submissions
   */
  async countSubmissionsByAssignment(assignmentId: string): Promise<number> {
    const result = await this.db
      .selectFrom('submissions')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('assignment_id', '=', assignmentId)
      .executeTakeFirstOrThrow()

    return parseInt(result.count, 10)
  }

  /**
   * Count graded submissions for an assignment
   * @param assignmentId - Assignment ID
   * @returns Number of graded submissions
   */
  async countGradedSubmissions(assignmentId: string): Promise<number> {
    const result = await this.db
      .selectFrom('submissions')
      .innerJoin('grades', 'submissions.id', 'grades.submission_id')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('submissions.assignment_id', '=', assignmentId)
      .executeTakeFirstOrThrow()

    return parseInt(result.count, 10)
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

  /**
   * Get all grades for a student with assignment details
   * @param studentId - Student ID
   * @returns Array of grades with assignment information
   */
  async getGradesWithAssignmentByStudent(
    studentId: string
  ): Promise<GradeWithAssignment[]> {
    const results = await this.db
      .selectFrom('submissions')
      .leftJoin('grades', 'submissions.id', 'grades.submission_id')
      .innerJoin('assignments', 'submissions.assignment_id', 'assignments.id')
      .select([
        // Submission fields
        'submissions.id as submission_id',
        'submissions.assignment_id as submission_assignment_id',
        'submissions.student_id as submission_student_id',
        'submissions.content as submission_content',
        'submissions.file_url as submission_file_url',
        'submissions.submitted_at as submission_submitted_at',
        'submissions.updated_at as submission_updated_at',
        // Grade fields
        'grades.id as grade_id',
        'grades.submission_id as grade_submission_id',
        'grades.teacher_id as grade_teacher_id',
        'grades.grade as grade_grade',
        'grades.feedback as grade_feedback',
        'grades.graded_at as grade_graded_at',
        'grades.updated_at as grade_updated_at',
        // Assignment fields
        'assignments.id as assignment_id',
        'assignments.title as assignment_title',
        'assignments.description as assignment_description',
        'assignments.due_date as assignment_due_date',
      ])
      .where('submissions.student_id', '=', studentId)
      .orderBy('submissions.submitted_at', 'desc')
      .execute()

    return results.map((row) => ({
      submission: {
        id: row.submission_id,
        assignment_id: row.submission_assignment_id,
        student_id: row.submission_student_id,
        content: row.submission_content,
        file_url: row.submission_file_url,
        submitted_at: row.submission_submitted_at,
        updated_at: row.submission_updated_at,
      },
      grade: row.grade_id
        ? {
            id: row.grade_id,
            submission_id: row.grade_submission_id!,
            teacher_id: row.grade_teacher_id!,
            grade: row.grade_grade!,
            feedback: row.grade_feedback,
            graded_at: row.grade_graded_at!,
            updated_at: row.grade_updated_at!,
          }
        : null,
      assignment: {
        id: row.assignment_id,
        title: row.assignment_title,
        description: row.assignment_description,
        dueDate: row.assignment_due_date,
      },
    }))
  }
}
