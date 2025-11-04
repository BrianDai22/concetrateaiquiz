import { promises as fs } from 'fs'
import * as path from 'path'
import { db } from '../client/database'
import { sql } from 'kysely'

/**
 * Migration runner for Kysely
 * Tracks executed migrations and runs pending ones
 */

interface Migration {
  up: (db: typeof import('../client/database').db) => Promise<void>
  down?: (db: typeof import('../client/database').db) => Promise<void>
}

async function createMigrationsTable(): Promise<void> {
  // Create migrations tracking table if it doesn't exist
  await db.schema
    .createTable('migrations')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('executed_at', 'timestamptz', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
    .execute()
}

async function getExecutedMigrations(): Promise<Set<string>> {
  const result = await db
    .selectFrom('migrations' as never)
    .select('name')
    .execute() as Array<{ name: string }>

  return new Set(result.map((row) => row.name))
}

async function getPendingMigrations(executedMigrations: Set<string>): Promise<string[]> {
  const migrationsDir = __dirname
  const files = await fs.readdir(migrationsDir)

  const migrationFiles = files
    .filter((file) => file.endsWith('.js'))
    .filter((file) => !file.endsWith('.d.ts'))
    .filter((file) => file !== 'migrate.js')
    .filter((file) => !executedMigrations.has(file))
    .sort()

  return migrationFiles
}

async function executeMigration(filename: string): Promise<void> {
  console.log(`Running migration: ${filename}`)

  const migrationPath = path.join(__dirname, filename)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const migration = require(migrationPath) as Migration

  if (!migration.up) {
    throw new Error(`Migration ${filename} does not export an 'up' function`)
  }

  await migration.up(db)

  await db
    .insertInto('migrations' as never)
    .values({ name: filename } as never)
    .execute()

  console.log(`Completed: ${filename}`)
}

async function runMigrations(): Promise<void> {
  try {
    console.log('Starting migrations...')

    // Create migrations tracking table
    await createMigrationsTable()

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations()
    console.log(`Already executed: ${executedMigrations.size} migration(s)`)

    // Get pending migrations
    const pendingMigrations = await getPendingMigrations(executedMigrations)

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations')
      return
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s)`)

    // Execute pending migrations in order
    for (const filename of pendingMigrations) {
      await executeMigration(filename)
    }

    console.log('All migrations completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await db.destroy()
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { runMigrations }
