import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import type { Database } from '../schema'

// Create database connection pool
const pool = new Pool({
  connectionString: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/concentrate-quiz',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Create Kysely instance
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: pool as never,
  }),
  log(event) {
    if (process.env['NODE_ENV'] === 'development') {
      if (event.level === 'query') {
        console.info('Query:', event.query.sql)
        console.info('Parameters:', event.query.parameters)
      }
    }
  },
})

// Helper function to destroy the database connection
export async function destroyDatabase(): Promise<void> {
  await db.destroy()
}