// Export database client
export { db, destroyDatabase } from './client/database'

// Export Redis client
export {
  redis,
  redisTest,
  connectRedis,
  connectRedisTest,
  disconnectRedis,
  disconnectRedisTest,
  flushRedis,
  setupShutdownHandlers,
} from './client/redis'

// Export all schema types
export * from './schema'

// Export test helpers
export * from './test-helpers'

// Export repository classes
export * from './repositories'

// Export migration utilities (to be implemented)
// export * from './migrations'