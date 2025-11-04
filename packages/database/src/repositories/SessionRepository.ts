import type Redis from 'ioredis'

/**
 * Redis session data structure
 * Note: Named RedisSession to avoid conflict with database Session type
 */
export interface RedisSession {
  userId: string
  refreshToken: string
  expiresAt: Date
  createdAt: Date
}

/**
 * SessionRepository - Manages JWT refresh token sessions using Redis
 *
 * Design decisions:
 * - Uses Redis instead of PostgreSQL for better performance and automatic TTL
 * - Key format: `session:{refreshToken}` -> `{userId}`
 * - Supports automatic expiration via Redis TTL
 * - All operations are atomic and fast (O(1))
 */
export class SessionRepository {
  private readonly keyPrefix = 'session:'
  private readonly defaultTTL = 7 * 24 * 60 * 60 // 7 days in seconds

  constructor(private redis: Redis) {}

  /**
   * Create a new session
   * @param userId - User ID for the session
   * @param refreshToken - JWT refresh token
   * @param expiresIn - Expiration time in seconds (default: 7 days)
   * @returns Created session data
   */
  async create(
    userId: string,
    refreshToken: string,
    expiresIn: number = this.defaultTTL
  ): Promise<RedisSession> {
    const key = this.getKey(refreshToken)
    const createdAt = new Date()
    const expiresAt = new Date(createdAt.getTime() + expiresIn * 1000)

    // Store userId in Redis with TTL
    await this.redis.setex(key, expiresIn, userId)

    return {
      userId,
      refreshToken,
      expiresAt,
      createdAt,
    }
  }

  /**
   * Get session by refresh token
   * @param refreshToken - Refresh token to look up
   * @returns Session if found and not expired, null otherwise
   */
  async get(refreshToken: string): Promise<RedisSession | null> {
    const key = this.getKey(refreshToken)
    const userId = await this.redis.get(key)

    if (!userId) {
      return null
    }

    // Get TTL to calculate expiresAt
    const ttl = await this.redis.ttl(key)
    if (ttl <= 0) {
      // Session expired or doesn't exist
      return null
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttl * 1000)

    // Note: We don't have createdAt stored, so we approximate it
    const createdAt = new Date(expiresAt.getTime() - this.defaultTTL * 1000)

    return {
      userId,
      refreshToken,
      expiresAt,
      createdAt,
    }
  }

  /**
   * Delete a session
   * @param refreshToken - Refresh token to delete
   * @returns True if session was deleted, false if it didn't exist
   */
  async delete(refreshToken: string): Promise<boolean> {
    const key = this.getKey(refreshToken)
    const result = await this.redis.del(key)
    return result > 0
  }

  /**
   * Refresh a session (extend expiration)
   * @param refreshToken - Refresh token to extend
   * @param expiresIn - New expiration time in seconds (default: 7 days)
   * @returns Updated session if found, null otherwise
   */
  async refresh(
    refreshToken: string,
    expiresIn: number = this.defaultTTL
  ): Promise<RedisSession | null> {
    const key = this.getKey(refreshToken)
    const userId = await this.redis.get(key)

    if (!userId) {
      return null
    }

    // Update TTL
    await this.redis.expire(key, expiresIn)

    const now = new Date()
    const expiresAt = new Date(now.getTime() + expiresIn * 1000)
    const createdAt = new Date(expiresAt.getTime() - this.defaultTTL * 1000)

    return {
      userId,
      refreshToken,
      expiresAt,
      createdAt,
    }
  }

  /**
   * Check if a session exists
   * @param refreshToken - Refresh token to check
   * @returns True if session exists and not expired, false otherwise
   */
  async exists(refreshToken: string): Promise<boolean> {
    const key = this.getKey(refreshToken)
    const result = await this.redis.exists(key)
    return result === 1
  }

  /**
   * Get all sessions for a user
   * @param userId - User ID
   * @returns Array of refresh tokens for the user
   */
  async getAllForUser(userId: string): Promise<string[]> {
    const pattern = `${this.keyPrefix}*`
    const keys = await this.redis.keys(pattern)

    const sessions: string[] = []

    for (const key of keys) {
      const storedUserId = await this.redis.get(key)
      if (storedUserId === userId) {
        const refreshToken = key.slice(this.keyPrefix.length)
        sessions.push(refreshToken)
      }
    }

    return sessions
  }

  /**
   * Delete all sessions for a user
   * @param userId - User ID
   * @returns Number of sessions deleted
   */
  async deleteAllForUser(userId: string): Promise<number> {
    const sessions = await this.getAllForUser(userId)

    if (sessions.length === 0) {
      return 0
    }

    const keys = sessions.map((token) => this.getKey(token))
    const result = await this.redis.del(...keys)

    return result
  }

  /**
   * Count total number of active sessions
   * @returns Number of active sessions
   */
  async count(): Promise<number> {
    const pattern = `${this.keyPrefix}*`
    const keys = await this.redis.keys(pattern)
    return keys.length
  }

  /**
   * Count sessions for a specific user
   * @param userId - User ID
   * @returns Number of active sessions for the user
   */
  async countForUser(userId: string): Promise<number> {
    const sessions = await this.getAllForUser(userId)
    return sessions.length
  }

  /**
   * Delete all sessions (DANGEROUS - use only for testing)
   * @returns Number of sessions deleted
   */
  async deleteAll(): Promise<number> {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('Cannot delete all sessions in production')
    }

    const pattern = `${this.keyPrefix}*`
    const keys = await this.redis.keys(pattern)

    if (keys.length === 0) {
      return 0
    }

    const result = await this.redis.del(...keys)
    return result
  }

  /**
   * Get Redis key for a refresh token
   * @param refreshToken - Refresh token
   * @returns Redis key
   */
  private getKey(refreshToken: string): string {
    return `${this.keyPrefix}${refreshToken}`
  }
}
