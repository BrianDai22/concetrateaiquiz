/**
 * @module cleanup
 * @description Cleanup utilities for test database
 */

import type { Kysely } from 'kysely'
import type { Database } from '../schema'

/**
 * Clear all data from a specific table
 */
export async function clearTable(
  db: Kysely<Database>,
  tableName: keyof Database
): Promise<void> {
  await db.deleteFrom(tableName).execute()
}

/**
 * Clear all data from all tables
 * Note: Tables are cleared in order to respect foreign key constraints
 */
export async function clearAllTables(db: Kysely<Database>): Promise<void> {
  // Clear in reverse dependency order
  await clearTable(db, 'grades')
  await clearTable(db, 'submissions')
  await clearTable(db, 'assignments')
  await clearTable(db, 'class_students')
  await clearTable(db, 'classes')
  await clearTable(db, 'teacher_group_members')
  await clearTable(db, 'teacher_groups')
  await clearTable(db, 'sessions')
  await clearTable(db, 'oauth_accounts')
  await clearTable(db, 'users')
}

/**
 * Reset database to clean state
 * Clears all tables and resets sequences if needed
 */
export async function resetDatabase(db: Kysely<Database>): Promise<void> {
  await clearAllTables(db)
}

/**
 * Delete a specific user and all related data
 * This will cascade delete most related records due to FK constraints
 */
export async function deleteUserAndRelatedData(
  db: Kysely<Database>,
  userId: string
): Promise<void> {
  await db.deleteFrom('users').where('id', '=', userId).execute()
}

/**
 * Delete a specific class and all related data
 */
export async function deleteClassAndRelatedData(
  db: Kysely<Database>,
  classId: string
): Promise<void> {
  await db.deleteFrom('classes').where('id', '=', classId).execute()
}

/**
 * Delete a specific assignment and all related data
 */
export async function deleteAssignmentAndRelatedData(
  db: Kysely<Database>,
  assignmentId: string
): Promise<void> {
  await db.deleteFrom('assignments').where('id', '=', assignmentId).execute()
}

/**
 * Get count of records in a table
 */
export async function getTableCount(
  db: Kysely<Database>,
  tableName: keyof Database
): Promise<number> {
  const result = await db
    .selectFrom(tableName)
    .select(db.fn.count<string>('id').as('count'))
    .executeTakeFirst()

  return result !== undefined ? parseInt(result.count, 10) : 0
}

/**
 * Check if database is empty
 */
export async function isDatabaseEmpty(db: Kysely<Database>): Promise<boolean> {
  const userCount = await getTableCount(db, 'users')
  return userCount === 0
}

/**
 * Truncate all tables with cascade
 * This is faster than DELETE but requires TRUNCATE permissions
 */
export async function truncateAllTables(db: Kysely<Database>): Promise<void> {
  await db.executeQuery({
    sql: `
      TRUNCATE TABLE
        grades,
        submissions,
        assignments,
        class_students,
        classes,
        teacher_group_members,
        teacher_groups,
        sessions,
        oauth_accounts,
        users
      RESTART IDENTITY CASCADE
    `,
    parameters: [],
    query: {
      kind: 'SelectQueryNode',
    } as never,
  })
}
