/**
 * Repositories - Database access layer
 *
 * Following Repository Pattern:
 * - Encapsulate all database operations
 * - Accept Kysely or Transaction instances
 * - No business logic - only data access
 * - Services use repositories, never direct database access
 */

export * from './UserRepository'
export * from './ClassRepository'
export * from './AssignmentRepository'
export * from './SessionRepository'
export * from './OAuthAccountRepository'
