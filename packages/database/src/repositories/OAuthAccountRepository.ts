import type { Kysely, Transaction } from 'kysely'
import type { Database, OAuthAccount, NewOAuthAccount, OAuthAccountUpdate } from '../schema'

/**
 * OAuthAccountRepository - Encapsulates all database operations for oauth_accounts table
 *
 * Following Repository Pattern:
 * - Accept Kysely instance or Transaction for flexibility
 * - No business logic - only data access operations
 * - Return null for not found, throw for database errors
 * - Support provider-based lookups
 */
export class OAuthAccountRepository {
  constructor(private db: Kysely<Database> | Transaction<Database>) {}

  /**
   * Create a new OAuth account
   * @param account - OAuth account data to insert
   * @returns The created OAuth account
   * @throws Database error if creation fails
   */
  async create(account: NewOAuthAccount): Promise<OAuthAccount> {
    return await this.db
      .insertInto('oauth_accounts')
      .values(account)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Find OAuth account by ID
   * @param id - OAuth account ID
   * @returns OAuth account if found, null otherwise
   */
  async findById(id: string): Promise<OAuthAccount | null> {
    const account = await this.db
      .selectFrom('oauth_accounts')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return account ?? null
  }

  /**
   * Find OAuth account by provider and provider account ID
   * @param provider - OAuth provider (e.g., 'google', 'github')
   * @param providerAccountId - Account ID from the OAuth provider
   * @returns OAuth account if found, null otherwise
   */
  async findByProvider(
    provider: string,
    providerAccountId: string
  ): Promise<OAuthAccount | null> {
    const account = await this.db
      .selectFrom('oauth_accounts')
      .selectAll()
      .where('provider', '=', provider)
      .where('provider_account_id', '=', providerAccountId)
      .executeTakeFirst()

    return account ?? null
  }

  /**
   * Find all OAuth accounts for a user
   * @param userId - User ID
   * @returns Array of OAuth accounts for the user
   */
  async findByUserId(userId: string): Promise<OAuthAccount[]> {
    return await this.db
      .selectFrom('oauth_accounts')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute()
  }

  /**
   * Find OAuth account for a specific user and provider
   * @param userId - User ID
   * @param provider - OAuth provider
   * @returns OAuth account if found, null otherwise
   */
  async findByUserIdAndProvider(
    userId: string,
    provider: string
  ): Promise<OAuthAccount | null> {
    const account = await this.db
      .selectFrom('oauth_accounts')
      .selectAll()
      .where('user_id', '=', userId)
      .where('provider', '=', provider)
      .executeTakeFirst()

    return account ?? null
  }

  /**
   * Update OAuth account by ID
   * @param id - OAuth account ID
   * @param updates - Partial OAuth account data to update
   * @returns Updated OAuth account
   * @throws Error if OAuth account not found
   */
  async update(id: string, updates: OAuthAccountUpdate): Promise<OAuthAccount> {
    return await this.db
      .updateTable('oauth_accounts')
      .set(updates)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Update OAuth account tokens
   * @param id - OAuth account ID
   * @param tokenData - Token data to update
   * @returns Updated OAuth account
   * @throws Error if OAuth account not found
   */
  async updateTokens(
    id: string,
    tokenData: {
      access_token?: string | null
      refresh_token?: string | null
      expires_at?: Date | null
      id_token?: string | null
    }
  ): Promise<OAuthAccount> {
    return await this.db
      .updateTable('oauth_accounts')
      .set(tokenData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  /**
   * Delete OAuth account by ID
   * @param id - OAuth account ID
   * @throws Error if OAuth account not found
   */
  async delete(id: string): Promise<void> {
    const result = await this.db
      .deleteFrom('oauth_accounts')
      .where('id', '=', id)
      .executeTakeFirst()

    if (result.numDeletedRows === 0n) {
      throw new Error(`OAuth account with id ${id} not found`)
    }
  }

  /**
   * Delete all OAuth accounts for a user
   * @param userId - User ID
   * @returns Number of OAuth accounts deleted
   */
  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.db
      .deleteFrom('oauth_accounts')
      .where('user_id', '=', userId)
      .executeTakeFirst()

    // PostgreSQL always returns numDeletedRows, but handle undefined for type safety
    if (result.numDeletedRows === undefined) {
      return 0
    }
    return Number(result.numDeletedRows)
  }

  /**
   * Delete OAuth account for a specific user and provider
   * @param userId - User ID
   * @param provider - OAuth provider
   * @throws Error if OAuth account not found
   */
  async deleteByUserIdAndProvider(userId: string, provider: string): Promise<void> {
    const result = await this.db
      .deleteFrom('oauth_accounts')
      .where('user_id', '=', userId)
      .where('provider', '=', provider)
      .executeTakeFirst()

    if (result.numDeletedRows === 0n) {
      throw new Error(`OAuth account for user ${userId} and provider ${provider} not found`)
    }
  }

  /**
   * Check if user has OAuth account for provider
   * @param userId - User ID
   * @param provider - OAuth provider
   * @returns true if OAuth account exists, false otherwise
   */
  async hasProvider(userId: string, provider: string): Promise<boolean> {
    const result = await this.db
      .selectFrom('oauth_accounts')
      .select('id')
      .where('user_id', '=', userId)
      .where('provider', '=', provider)
      .executeTakeFirst()

    return result !== undefined
  }

  /**
   * Count OAuth accounts for a user
   * @param userId - User ID
   * @returns Number of OAuth accounts for the user
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await this.db
      .selectFrom('oauth_accounts')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirstOrThrow()

    return parseInt(result.count, 10)
  }

  /**
   * Find all OAuth accounts for a provider
   * @param provider - OAuth provider
   * @returns Array of OAuth accounts for the provider
   */
  async findByProviderName(provider: string): Promise<OAuthAccount[]> {
    return await this.db
      .selectFrom('oauth_accounts')
      .selectAll()
      .where('provider', '=', provider)
      .orderBy('created_at', 'desc')
      .execute()
  }
}
