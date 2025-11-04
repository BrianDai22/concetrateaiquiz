/**
 * @module factories
 * @description Factory functions for creating test data
 */

import { hashPassword } from '@concentrate/shared'
import type { Kysely } from 'kysely'
import type { Database } from '../schema'

/**
 * User factory options
 */
export interface UserFactoryOptions {
  email?: string
  password?: string
  role?: 'admin' | 'teacher' | 'student'
  name?: string
  suspended?: boolean
}

/**
 * Class factory options
 */
export interface ClassFactoryOptions {
  name?: string
  teacherId: string
  description?: string
}

/**
 * Assignment factory options
 */
export interface AssignmentFactoryOptions {
  classId: string
  title?: string
  description?: string
  dueDate?: Date
}

/**
 * Submission factory options
 */
export interface SubmissionFactoryOptions {
  assignmentId: string
  studentId: string
  content?: string
  fileUrl?: string
}

/**
 * Grade factory options
 */
export interface GradeFactoryOptions {
  submissionId: string
  teacherId: string
  grade?: number
  feedback?: string
}

/**
 * OAuth account factory options
 */
export interface OAuthAccountFactoryOptions {
  userId: string
  provider?: string
  providerAccountId?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
}

/**
 * Create a test user
 */
export async function createTestUser(
  db: Kysely<Database>,
  options: UserFactoryOptions = {}
): Promise<{ id: string; email: string; name: string; role: 'admin' | 'teacher' | 'student' }> {
  const email = options.email ?? `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`
  const password = options.password ?? 'TestPassword123!'
  const role = options.role ?? 'student'
  const name = options.name ?? `Test User ${Math.random().toString(36).substring(7)}`
  const suspended = options.suspended ?? false

  const passwordHash = await hashPassword(password)

  const user = await db
    .insertInto('users')
    .values({
      email,
      password_hash: passwordHash,
      role,
      name,
      suspended,
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
}

/**
 * Create multiple test users
 */
export async function createTestUsers(
  db: Kysely<Database>,
  count: number,
  options: Omit<UserFactoryOptions, 'email'> = {}
): Promise<Array<{ id: string; email: string; name: string; role: 'admin' | 'teacher' | 'student' }>> {
  const users: Array<{ id: string; email: string; name: string; role: 'admin' | 'teacher' | 'student' }> = []

  for (let i = 0; i < count; i++) {
    const user = await createTestUser(db, options)
    users.push(user)
  }

  return users
}

/**
 * Create a test class
 */
export async function createTestClass(
  db: Kysely<Database>,
  options: ClassFactoryOptions
): Promise<{ id: string; name: string; teacherId: string }> {
  const name = options.name ?? `Test Class ${Math.random().toString(36).substring(7)}`
  const description = options.description ?? null

  const classRecord = await db
    .insertInto('classes')
    .values({
      name,
      teacher_id: options.teacherId,
      description,
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return {
    id: classRecord.id,
    name: classRecord.name,
    teacherId: classRecord.teacher_id,
  }
}

/**
 * Create multiple test classes
 */
export async function createTestClasses(
  db: Kysely<Database>,
  count: number,
  options: ClassFactoryOptions
): Promise<Array<{ id: string; name: string; teacherId: string }>> {
  const classes: Array<{ id: string; name: string; teacherId: string }> = []

  for (let i = 0; i < count; i++) {
    const classRecord = await createTestClass(db, {
      ...options,
      name: `Test Class ${i + 1}`,
    })
    classes.push(classRecord)
  }

  return classes
}

/**
 * Enroll a student in a class
 */
export async function enrollStudentInClass(
  db: Kysely<Database>,
  classId: string,
  studentId: string
): Promise<void> {
  await db
    .insertInto('class_students')
    .values({
      class_id: classId,
      student_id: studentId,
    })
    .execute()
}

/**
 * Enroll multiple students in a class
 */
export async function enrollStudentsInClass(
  db: Kysely<Database>,
  classId: string,
  studentIds: string[]
): Promise<void> {
  if (studentIds.length === 0) return

  await db
    .insertInto('class_students')
    .values(
      studentIds.map((studentId) => ({
        class_id: classId,
        student_id: studentId,
      }))
    )
    .execute()
}

/**
 * Create a test assignment
 */
export async function createTestAssignment(
  db: Kysely<Database>,
  options: AssignmentFactoryOptions
): Promise<{ id: string; classId: string; title: string; dueDate: Date }> {
  const title = options.title ?? `Test Assignment ${Math.random().toString(36).substring(7)}`
  const description = options.description ?? 'Test assignment description'
  const dueDate = options.dueDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

  const assignment = await db
    .insertInto('assignments')
    .values({
      class_id: options.classId,
      title,
      description,
      due_date: dueDate,
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return {
    id: assignment.id,
    classId: assignment.class_id,
    title: assignment.title,
    dueDate: assignment.due_date,
  }
}

/**
 * Create multiple test assignments
 */
export async function createTestAssignments(
  db: Kysely<Database>,
  count: number,
  options: AssignmentFactoryOptions
): Promise<Array<{ id: string; classId: string; title: string; dueDate: Date }>> {
  const assignments: Array<{ id: string; classId: string; title: string; dueDate: Date }> = []

  for (let i = 0; i < count; i++) {
    const assignment = await createTestAssignment(db, {
      ...options,
      title: `Test Assignment ${i + 1}`,
    })
    assignments.push(assignment)
  }

  return assignments
}

/**
 * Create a test submission
 */
export async function createTestSubmission(
  db: Kysely<Database>,
  options: SubmissionFactoryOptions
): Promise<{ id: string; assignmentId: string; studentId: string; content: string }> {
  const content = options.content ?? 'Test submission content'
  const fileUrl = options.fileUrl ?? null

  const submission = await db
    .insertInto('submissions')
    .values({
      assignment_id: options.assignmentId,
      student_id: options.studentId,
      content,
      file_url: fileUrl,
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return {
    id: submission.id,
    assignmentId: submission.assignment_id,
    studentId: submission.student_id,
    content: submission.content,
  }
}

/**
 * Create multiple test submissions
 */
export async function createTestSubmissions(
  db: Kysely<Database>,
  assignmentId: string,
  studentIds: string[]
): Promise<Array<{ id: string; assignmentId: string; studentId: string; content: string }>> {
  if (studentIds.length === 0) return []

  const submissions: Array<{ id: string; assignmentId: string; studentId: string; content: string }> = []

  for (const studentId of studentIds) {
    const submission = await createTestSubmission(db, {
      assignmentId,
      studentId,
    })
    submissions.push(submission)
  }

  return submissions
}

/**
 * Create a test grade
 */
export async function createTestGrade(
  db: Kysely<Database>,
  options: GradeFactoryOptions
): Promise<{ id: string; submissionId: string; teacherId: string; grade: number }> {
  const grade = options.grade ?? 85.5
  const feedback = options.feedback ?? null

  const gradeRecord = await db
    .insertInto('grades')
    .values({
      submission_id: options.submissionId,
      teacher_id: options.teacherId,
      grade,
      feedback,
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return {
    id: gradeRecord.id,
    submissionId: gradeRecord.submission_id,
    teacherId: gradeRecord.teacher_id,
    grade: Number(gradeRecord.grade),
  }
}

/**
 * Create a complete test scenario with teacher, class, students, assignment, submissions, and grades
 */
export interface CompleteScenarioResult {
  teacher: { id: string; email: string; name: string; role: 'admin' | 'teacher' | 'student' }
  students: Array<{ id: string; email: string; name: string; role: 'admin' | 'teacher' | 'student' }>
  class: { id: string; name: string; teacherId: string }
  assignment: { id: string; classId: string; title: string; dueDate: Date }
  submissions: Array<{ id: string; assignmentId: string; studentId: string; content: string }>
  grades: Array<{ id: string; submissionId: string; teacherId: string; grade: number }>
}

export async function createCompleteTestScenario(
  db: Kysely<Database>,
  options: {
    studentCount?: number
    withSubmissions?: boolean
    withGrades?: boolean
  } = {}
): Promise<CompleteScenarioResult> {
  const studentCount = options.studentCount ?? 3
  const withSubmissions = options.withSubmissions ?? true
  const withGrades = options.withGrades ?? false

  // Create teacher
  const teacher = await createTestUser(db, { role: 'teacher' })

  // Create students
  const students = await createTestUsers(db, studentCount, { role: 'student' })

  // Create class
  const classRecord = await createTestClass(db, {
    teacherId: teacher.id,
  })

  // Enroll students
  await enrollStudentsInClass(
    db,
    classRecord.id,
    students.map((s) => s.id)
  )

  // Create assignment
  const assignment = await createTestAssignment(db, {
    classId: classRecord.id,
  })

  // Create submissions if requested
  let submissions: Array<{ id: string; assignmentId: string; studentId: string; content: string }> = []
  if (withSubmissions) {
    submissions = await createTestSubmissions(
      db,
      assignment.id,
      students.map((s) => s.id)
    )
  }

  // Create grades if requested
  let grades: Array<{ id: string; submissionId: string; teacherId: string; grade: number }> = []
  if (withGrades && submissions.length > 0) {
    for (const submission of submissions) {
      const grade = await createTestGrade(db, {
        submissionId: submission.id,
        teacherId: teacher.id,
      })
      grades.push(grade)
    }
  }

  return {
    teacher,
    students,
    class: classRecord,
    assignment,
    submissions,
    grades,
  }
}

/**
 * Create a test OAuth account
 */
export async function createTestOAuthAccount(
  db: Kysely<Database>,
  options: OAuthAccountFactoryOptions
): Promise<{ id: string; userId: string; provider: string; providerAccountId: string }> {
  const provider = options.provider ?? 'google'
  const providerAccountId = options.providerAccountId ?? `oauth-${Date.now()}-${Math.random().toString(36).substring(7)}`
  const accessToken = options.accessToken ?? null
  const refreshToken = options.refreshToken ?? null
  const expiresAt = options.expiresAt ?? null

  const account = await db
    .insertInto('oauth_accounts')
    .values({
      user_id: options.userId,
      provider,
      provider_account_id: providerAccountId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      token_type: 'Bearer',
      scope: 'openid profile email',
      id_token: null,
      session_state: null,
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return {
    id: account.id,
    userId: account.user_id,
    provider: account.provider,
    providerAccountId: account.provider_account_id,
  }
}
