import type { Kysely, Transaction } from 'kysely'
import type { Database, User, NewUser, UserUpdate, UserRole } from '../schema'

/**
 * UserRepository - Encapsulates all database operations for users table
 *
 * Following Repository Pattern:
 * - Accept Kysely instance or Transaction for flexibility
 * - No business logic - only data access operations
 * - Return null for not found, throw for database errors
 * - Support pagination and filtering
 */
export class UserRepository {
  constructor(private db: Kysely<Database> | Transaction<Database>) {}

  /**
   * Create a new user
   * @param user - User data to insert
   * @returns The created user
   * @throws Database error if creation fails
   */
  async create(user: NewUser): Promise<User> {
    return await this.db
      .insertInto('users')
      .values(user)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Find user by ID
   * @param id - User ID
   * @returns User if found, null otherwise
   */
  async findById(id: string): Promise<User | null> {
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return user ?? null
  }

  /**
   * Find user by email
   * @param email - User email (case-sensitive, should be normalized before calling)
   * @returns User if found, null otherwise
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst()

    return user ?? null
  }

  /**
   * Find all users with optional pagination
   * @param options - Pagination options (page, limit)
   * @returns Array of users
   */
  async findAll(options?: {
    page?: number
    limit?: number
  }): Promise<User[]> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = (page - 1) * limit

    return await this.db
      .selectFrom('users')
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()
  }

  /**
   * Update user by ID
   * @param id - User ID
   * @param updates - Partial user data to update
   * @returns Updated user
   * @throws Error if user not found
   */
  async update(id: string, updates: UserUpdate): Promise<User> {
    return await this.db
      .updateTable('users')
      .set(updates)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Delete user by ID
   * @param id - User ID
   * @throws Error if user not found
   */
  async delete(id: string): Promise<void> {
    const result = await this.db
      .deleteFrom('users')
      .where('id', '=', id)
      .executeTakeFirst()

    if (result.numDeletedRows === 0n) {
      throw new Error(`User with id ${id} not found`)
    }
  }

  /**
   * Suspend a user
   * @param id - User ID
   * @returns Updated user with suspended=true
   * @throws Error if user not found
   */
  async suspend(id: string): Promise<User> {
    return await this.db
      .updateTable('users')
      .set({ suspended: true })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Unsuspend a user
   * @param id - User ID
   * @returns Updated user with suspended=false
   * @throws Error if user not found
   */
  async unsuspend(id: string): Promise<User> {
    return await this.db
      .updateTable('users')
      .set({ suspended: false })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Find users by role
   * @param role - User role (admin, teacher, student)
   * @returns Array of users with specified role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    return await this.db
      .selectFrom('users')
      .selectAll()
      .where('role', '=', role)
      .orderBy('created_at', 'desc')
      .execute()
  }

  /**
   * Find all suspended users
   * @returns Array of suspended users
   */
  async findSuspended(): Promise<User[]> {
    return await this.db
      .selectFrom('users')
      .selectAll()
      .where('suspended', '=', true)
      .orderBy('created_at', 'desc')
      .execute()
  }

  /**
   * Search users by name or email
   * @param query - Search query (matches name or email)
   * @param options - Pagination options
   * @returns Array of matching users
   */
  async search(
    query: string,
    options?: { page?: number; limit?: number }
  ): Promise<User[]> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = (page - 1) * limit

    // Case-insensitive search in name and email
    const searchPattern = `%${query}%`

    return await this.db
      .selectFrom('users')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb('name', 'ilike', searchPattern),
          eb('email', 'ilike', searchPattern),
        ])
      )
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()
  }

  /**
   * Count total number of users
   * @returns Total user count
   */
  async count(): Promise<number> {
    const result = await this.db
      .selectFrom('users')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow()

    return parseInt(result.count, 10)
  }

  /**
   * Count users by role
   * @param role - User role
   * @returns Number of users with specified role
   */
  async countByRole(role: UserRole): Promise<number> {
    const result = await this.db
      .selectFrom('users')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('role', '=', role)
      .executeTakeFirstOrThrow()

    return parseInt(result.count, 10)
  }

  /**
   * Count suspended users
   * @returns Number of suspended users
   */
  async countSuspended(): Promise<number> {
    const result = await this.db
      .selectFrom('users')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('suspended', '=', true)
      .executeTakeFirstOrThrow()

    return parseInt(result.count, 10)
  }

  /**
   * Find users with filters (role, suspended status) and pagination
   * @param filters - Optional filters (role, suspended)
   * @param options - Pagination options
   * @returns Array of users matching filters
   */
  async findWithFilters(
    filters?: {
      role?: UserRole
      suspended?: boolean
    },
    options?: { page?: number; limit?: number }
  ): Promise<User[]> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = (page - 1) * limit

    let query = this.db.selectFrom('users').selectAll()

    // Apply filters
    if (filters?.role !== undefined) {
      query = query.where('role', '=', filters.role)
    }

    if (filters?.suspended !== undefined) {
      query = query.where('suspended', '=', filters.suspended)
    }

    return await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()
  }

  /**
   * Batch suspend users
   * @param ids - Array of user IDs to suspend
   * @returns Number of users suspended
   */
  async batchSuspend(ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0
    }

    const result = await this.db
      .updateTable('users')
      .set({ suspended: true })
      .where('id', 'in', ids)
      .executeTakeFirst()

    // PostgreSQL always returns numUpdatedRows, but handle undefined for type safety
    if (result.numUpdatedRows === undefined) {
      return 0
    }
    return Number(result.numUpdatedRows)
  }

  /**
   * Batch unsuspend users
   * @param ids - Array of user IDs to unsuspend
   * @returns Number of users unsuspended
   */
  async batchUnsuspend(ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0
    }

    const result = await this.db
      .updateTable('users')
      .set({ suspended: false })
      .where('id', 'in', ids)
      .executeTakeFirst()

    // PostgreSQL always returns numUpdatedRows, but handle undefined for type safety
    if (result.numUpdatedRows === undefined) {
      return 0
    }
    return Number(result.numUpdatedRows)
  }

  /**
   * Check if email exists
   * @param email - Email to check
   * @returns true if email exists, false otherwise
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await this.db
      .selectFrom('users')
      .select('id')
      .where('email', '=', email)
      .executeTakeFirst()

    return result !== undefined
  }

  /**
   * Find multiple users by IDs
   * @param ids - Array of user IDs
   * @returns Array of users (may be fewer than requested if some IDs don't exist)
   */
  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return []
    }

    return await this.db
      .selectFrom('users')
      .selectAll()
      .where('id', 'in', ids)
      .execute()
  }
}
