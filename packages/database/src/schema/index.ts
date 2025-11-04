import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely'

// User roles enum
export type UserRole = 'admin' | 'teacher' | 'student'

// Users table
export interface UsersTable {
  id: Generated<string>
  email: string
  password_hash: string | null
  role: UserRole
  name: string
  suspended: ColumnType<boolean, boolean | undefined, boolean>
  created_at: ColumnType<Date, Date | undefined, never>
  updated_at: ColumnType<Date, Date | undefined, Date>
}

// Teacher groups table
export interface TeacherGroupsTable {
  id: Generated<string>
  name: string
  admin_id: string
  created_at: ColumnType<Date, Date | undefined, never>
  updated_at: ColumnType<Date, Date | undefined, Date>
}

// Teacher group members junction table
export interface TeacherGroupMembersTable {
  group_id: string
  teacher_id: string
  joined_at: ColumnType<Date, Date | undefined, never>
}

// Classes table
export interface ClassesTable {
  id: Generated<string>
  name: string
  teacher_id: string
  description: string | null
  created_at: ColumnType<Date, Date | undefined, never>
  updated_at: ColumnType<Date, Date | undefined, Date>
}

// Class students junction table
export interface ClassStudentsTable {
  class_id: string
  student_id: string
  enrolled_at: ColumnType<Date, Date | undefined, never>
}

// Assignments table
export interface AssignmentsTable {
  id: Generated<string>
  class_id: string
  title: string
  description: string
  due_date: Date
  created_at: ColumnType<Date, Date | undefined, never>
  updated_at: ColumnType<Date, Date | undefined, Date>
}

// Submissions table
export interface SubmissionsTable {
  id: Generated<string>
  assignment_id: string
  student_id: string
  content: string
  file_url: string | null
  submitted_at: ColumnType<Date, Date | undefined, never>
  updated_at: ColumnType<Date, Date | undefined, Date>
}

// Grades table
export interface GradesTable {
  id: Generated<string>
  submission_id: string
  teacher_id: string
  grade: ColumnType<string, number | string, number | string> // PostgreSQL NUMERIC returns string
  feedback: string | null
  graded_at: ColumnType<Date, Date | undefined, never>
  updated_at: ColumnType<Date, Date | undefined, Date>
}

// OAuth accounts table
export interface OAuthAccountsTable {
  id: Generated<string>
  user_id: string
  provider: string
  provider_account_id: string
  access_token: string | null
  refresh_token: string | null
  expires_at: Date | null
  token_type: string | null
  scope: string | null
  id_token: string | null
  session_state: string | null
  created_at: ColumnType<Date, Date | undefined, never>
  updated_at: ColumnType<Date, Date | undefined, Date>
}

// Sessions table for JWT refresh tokens
export interface SessionsTable {
  id: Generated<string>
  user_id: string
  refresh_token: string
  expires_at: Date
  created_at: ColumnType<Date, Date | undefined, never>
  updated_at: ColumnType<Date, Date | undefined, Date>
}

// Database interface combining all tables
export interface Database {
  users: UsersTable
  teacher_groups: TeacherGroupsTable
  teacher_group_members: TeacherGroupMembersTable
  classes: ClassesTable
  class_students: ClassStudentsTable
  assignments: AssignmentsTable
  submissions: SubmissionsTable
  grades: GradesTable
  oauth_accounts: OAuthAccountsTable
  sessions: SessionsTable
}

// Helper types for each table
export type User = Selectable<UsersTable>
export type NewUser = Insertable<UsersTable>
export type UserUpdate = Updateable<UsersTable>

export type TeacherGroup = Selectable<TeacherGroupsTable>
export type NewTeacherGroup = Insertable<TeacherGroupsTable>
export type TeacherGroupUpdate = Updateable<TeacherGroupsTable>

export type Class = Selectable<ClassesTable>
export type NewClass = Insertable<ClassesTable>
export type ClassUpdate = Updateable<ClassesTable>

export type Assignment = Selectable<AssignmentsTable>
export type NewAssignment = Insertable<AssignmentsTable>
export type AssignmentUpdate = Updateable<AssignmentsTable>

export type Submission = Selectable<SubmissionsTable>
export type NewSubmission = Insertable<SubmissionsTable>
export type SubmissionUpdate = Updateable<SubmissionsTable>

export type Grade = Selectable<GradesTable>
export type NewGrade = Insertable<GradesTable>
export type GradeUpdate = Updateable<GradesTable>

export type OAuthAccount = Selectable<OAuthAccountsTable>
export type NewOAuthAccount = Insertable<OAuthAccountsTable>
export type OAuthAccountUpdate = Updateable<OAuthAccountsTable>

export type Session = Selectable<SessionsTable>
export type NewSession = Insertable<SessionsTable>
export type SessionUpdate = Updateable<SessionsTable>