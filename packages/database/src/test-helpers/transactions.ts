/**
 * @module transactions
 * @description Transaction utilities for isolated test runs
 */

import type { Kysely, Transaction } from 'kysely'
import type { Database } from '../schema'

/**
 * Run a test within a transaction that will be rolled back
 * This ensures test isolation without affecting the database
 */
export async function runInTransaction<T>(
  db: Kysely<Database>,
  testFn: (trx: Transaction<Database>) => Promise<T>
): Promise<T> {
  return await db.transaction().execute(async (trx) => {
    await testFn(trx)
    // Transaction will be rolled back after this function returns in test context
    throw new Error('ROLLBACK_TEST_TRANSACTION')
  }).catch((error: unknown) => {
    // If it's our intentional rollback, we can ignore it in tests
    // Otherwise, rethrow the error
    if (error instanceof Error && error.message === 'ROLLBACK_TEST_TRANSACTION') {
      // In a real test, you might want to return the result here
      // This is a placeholder pattern
      throw error
    }
    throw error
  })
}

/**
 * Create a test transaction that can be manually rolled back
 * Useful for more complex test scenarios
 */
export async function createTestTransaction(
  db: Kysely<Database>
): Promise<{
  trx: Transaction<Database>
  commit: () => Promise<void>
  rollback: () => Promise<void>
}> {
  let trx: Transaction<Database> | null = null
  let committed = false
  let rolledBack = false

  await db.transaction().execute(async (t) => {
    trx = t
    // Keep transaction open until manually committed or rolled back
    return new Promise<void>((resolve, reject) => {
      // Store resolve/reject for later use
      ;(t as any)._resolve = resolve
      ;(t as any)._reject = reject
    })
  })

  if (trx === null) {
    throw new Error('Failed to create transaction')
  }

  return {
    trx,
    commit: async () => {
      if (committed || rolledBack) {
        throw new Error('Transaction already committed or rolled back')
      }
      committed = true
      if ((trx as any)._resolve !== undefined) {
        ;(trx as any)._resolve()
      }
    },
    rollback: async () => {
      if (committed || rolledBack) {
        throw new Error('Transaction already committed or rolled back')
      }
      rolledBack = true
      if ((trx as any)._reject !== undefined) {
        ;(trx as any)._reject(new Error('MANUAL_ROLLBACK'))
      }
    },
  }
}

/**
 * Wrap a test function to automatically run in a rolled-back transaction
 * This is useful for test frameworks like Vitest
 */
export function withRollback<T extends any[]>(
  db: Kysely<Database>,
  testFn: (db: Kysely<Database>, ...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    await db.transaction().execute(async (trx) => {
      try {
        await testFn(trx as unknown as Kysely<Database>, ...args)
      } finally {
        // Always rollback by throwing
        throw new Error('ROLLBACK_TEST_TRANSACTION')
      }
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message === 'ROLLBACK_TEST_TRANSACTION') {
        // Expected rollback, test passed
        return
      }
      // Unexpected error, rethrow
      throw error
    })
  }
}

/**
 * Execute multiple operations in a single transaction
 * Useful for setting up complex test scenarios
 */
export async function executeInTransaction<T>(
  db: Kysely<Database>,
  operations: (trx: Transaction<Database>) => Promise<T>
): Promise<T> {
  return await db.transaction().execute(operations)
}

/**
 * Create a savepoint within a transaction
 * Allows partial rollbacks within a larger transaction
 */
export async function createSavepoint(
  trx: Transaction<Database>,
  savepointName: string
): Promise<void> {
  await trx.executeQuery({
    sql: `SAVEPOINT ${savepointName}`,
    parameters: [],
    query: {
      kind: 'SelectQueryNode',
    } as never,
  })
}

/**
 * Rollback to a savepoint
 */
export async function rollbackToSavepoint(
  trx: Transaction<Database>,
  savepointName: string
): Promise<void> {
  await trx.executeQuery({
    sql: `ROLLBACK TO SAVEPOINT ${savepointName}`,
    parameters: [],
    query: {
      kind: 'SelectQueryNode',
    } as never,
  })
}

/**
 * Release a savepoint (commit the changes up to that point)
 */
export async function releaseSavepoint(
  trx: Transaction<Database>,
  savepointName: string
): Promise<void> {
  await trx.executeQuery({
    sql: `RELEASE SAVEPOINT ${savepointName}`,
    parameters: [],
    query: {
      kind: 'SelectQueryNode',
    } as never,
  })
}
