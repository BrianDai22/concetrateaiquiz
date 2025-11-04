import Redis from 'ioredis'

/**
 * Redis client configuration
 *
 * Default connection: localhost:6379
 * Can be overridden via REDIS_URL environment variable
 */
/* c8 ignore next */
const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379'

/**
 * Create Redis client with optimized settings
 *
 * Configuration:
 * - Connection pooling via ioredis internal pool
 * - Auto-reconnect on connection loss
 * - Lazy connect (only connect when first command is sent)
 * - Command timeout: 5 seconds
 * - Retry strategy with exponential backoff (max 3 attempts)
 */
export const redis = new Redis(redisUrl, {
  db: 0, // Use database index 0 for production

  // Connection options
  maxRetriesPerRequest: 3,
  /* c8 ignore start */
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  /* c8 ignore stop */

  // Connection pool settings
  lazyConnect: true,
  enableReadyCheck: true,

  // Timeout settings
  connectTimeout: 5000,
  commandTimeout: 5000,

  // Logging
  showFriendlyErrorStack: process.env['NODE_ENV'] === 'development',
})

/**
 * Test Redis client for testing environment
 * Uses database index 1 to avoid conflicts with production data
 */
export const redisTest = new Redis(redisUrl, {
  db: 1, // Use database index 1 for tests
  maxRetriesPerRequest: 3,
  /* c8 ignore start */
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  /* c8 ignore stop */
  lazyConnect: true,
  enableReadyCheck: true,
  connectTimeout: 5000,
  commandTimeout: 5000,
  showFriendlyErrorStack: true,
})

/**
 * Connect to Redis
 * Handles lazy connection initialization
 */
export async function connectRedis(): Promise<void> {
  if (redis.status === 'ready') {
    return
  }
  await redis.connect()
}

/**
 * Connect to test Redis instance
 */
export async function connectRedisTest(): Promise<void> {
  if (redisTest.status === 'ready') {
    return
  }
  await redisTest.connect()
}

/**
 * Disconnect from Redis and cleanup resources
 */
export async function disconnectRedis(): Promise<void> {
  if (redis.status !== 'end') {
    await redis.quit()
  }
}

/**
 * Disconnect from test Redis instance
 */
export async function disconnectRedisTest(): Promise<void> {
  if (redisTest.status !== 'end') {
    await redisTest.quit()
  }
}

/**
 * Flush all data from Redis (DANGEROUS - use only in tests)
 * @param client - Redis client to flush (defaults to redisTest)
 */
export async function flushRedis(client: Redis = redisTest): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('Cannot flush Redis in production environment')
  }
  await client.flushdb()
}

/**
 * Setup graceful shutdown handlers for Redis
 * Exported for testing purposes
 */
export function setupShutdownHandlers(): void {
  process.on('SIGTERM', async () => {
    await disconnectRedis()
  })

  process.on('SIGINT', async () => {
    await disconnectRedis()
  })
}

// Auto-setup shutdown handlers in non-test environments
/* c8 ignore start */
if (process.env['NODE_ENV'] !== 'test') {
  setupShutdownHandlers()
}
/* c8 ignore stop */
