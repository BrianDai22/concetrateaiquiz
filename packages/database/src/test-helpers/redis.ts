import type Redis from 'ioredis'
import { redisTest, connectRedisTest, flushRedis } from '../client/redis'

/**
 * Clear all Redis data (test database only)
 *
 * IMPORTANT: Only works with redisTest client (database index 1)
 * Will throw error in production environment
 */
export async function clearRedis(client: Redis = redisTest): Promise<void> {
  await flushRedis(client)
}

/**
 * Setup Redis for testing
 * - Connects to test database
 * - Flushes all existing data
 */
export async function setupRedisTest(): Promise<void> {
  await connectRedisTest()
  await clearRedis()
}

/**
 * Teardown Redis after testing
 * - Flushes all test data
 * - Disconnects from Redis
 */
export async function teardownRedisTest(): Promise<void> {
  await clearRedis()
  // Note: Don't disconnect as it may affect other parallel tests
  // The connection will be cleaned up at process exit
}

/**
 * Create a test session in Redis
 * Helper for creating session data during tests
 *
 * @param userId - User ID for the session
 * @param refreshToken - Refresh token value
 * @param expiresIn - Expiration time in seconds (default: 7 days)
 * @returns Session key
 */
export async function createTestSession(
  userId: string,
  refreshToken: string,
  expiresIn: number = 7 * 24 * 60 * 60 // 7 days
): Promise<string> {
  const sessionKey = `session:${refreshToken}`
  await redisTest.setex(sessionKey, expiresIn, userId)
  return sessionKey
}

/**
 * Get session data from Redis
 *
 * @param refreshToken - Refresh token to look up
 * @returns User ID if found, null otherwise
 */
export async function getTestSession(
  refreshToken: string
): Promise<string | null> {
  const sessionKey = `session:${refreshToken}`
  return await redisTest.get(sessionKey)
}

/**
 * Delete a test session from Redis
 *
 * @param refreshToken - Refresh token to delete
 */
export async function deleteTestSession(refreshToken: string): Promise<void> {
  const sessionKey = `session:${refreshToken}`
  await redisTest.del(sessionKey)
}

/**
 * Get all session keys from Redis
 * Useful for debugging and test assertions
 *
 * @returns Array of session keys
 */
export async function getAllSessionKeys(): Promise<string[]> {
  return await redisTest.keys('session:*')
}

/**
 * Count total number of sessions in Redis
 *
 * @returns Number of active sessions
 */
export async function countSessions(): Promise<number> {
  const keys = await getAllSessionKeys()
  return keys.length
}
