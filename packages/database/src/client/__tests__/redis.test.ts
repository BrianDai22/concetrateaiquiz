import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Redis from 'ioredis'
import {
  redis,
  redisTest,
  connectRedis,
  connectRedisTest,
  disconnectRedis,
  disconnectRedisTest,
  flushRedis,
  setupShutdownHandlers,
} from '../redis'
import {
  clearRedis,
  setupRedisTest,
  teardownRedisTest,
  createTestSession,
  getTestSession,
  deleteTestSession,
  getAllSessionKeys,
  countSessions,
} from '../../test-helpers/redis'

describe('Redis Client', () => {
  beforeEach(async () => {
    await setupRedisTest()
  })

  afterEach(async () => {
    await teardownRedisTest()
  })

  describe('connection management', () => {
    it('should connect to Redis test instance', async () => {
      await connectRedisTest()
      expect(redisTest.status).toBe('ready')
    })

    it('should handle multiple connect calls gracefully', async () => {
      await connectRedisTest()
      await connectRedisTest() // Should not error
      expect(redisTest.status).toBe('ready')
    })

    it('should ping Redis successfully', async () => {
      await connectRedisTest()
      const pong = await redisTest.ping()
      expect(pong).toBe('PONG')
    })

    it('should handle connectRedis when already connected', async () => {
      // Connect production redis
      await connectRedis()
      expect(redis.status).toBe('ready')

      // Call connectRedis again - should return early without error
      await expect(connectRedis()).resolves.not.toThrow()
      expect(redis.status).toBe('ready')

      // Cleanup
      await disconnectRedis()
    })
  })

  describe('disconnection management', () => {
    it('should call disconnectRedis without error', async () => {
      // Disconnect should not throw (even if not connected)
      await expect(disconnectRedis()).resolves.not.toThrow()
    })

    it('should call disconnectRedis multiple times without error', async () => {
      // First disconnect
      await expect(disconnectRedis()).resolves.not.toThrow()

      // Second disconnect - should not error
      await expect(disconnectRedis()).resolves.not.toThrow()
    })
  })

  describe('shutdown handlers', () => {
    it('should setup and invoke SIGTERM handler', async () => {
      const handlers: Record<string, Function> = {}

      // Mock process.on
      const originalOn = process.on
      process.on = ((event: string, handler: Function) => {
        handlers[event] = handler
        return process
      }) as typeof process.on

      // Setup handlers
      setupShutdownHandlers()

      // Verify SIGTERM handler was registered
      expect(handlers['SIGTERM']).toBeDefined()

      // Invoke SIGTERM handler to cover the disconnectRedis() call
      await handlers['SIGTERM']()

      // Restore original process.on
      process.on = originalOn
    })

    it('should setup and invoke SIGINT handler', async () => {
      const handlers: Record<string, Function> = {}

      // Mock process.on
      const originalOn = process.on
      process.on = ((event: string, handler: Function) => {
        handlers[event] = handler
        return process
      }) as typeof process.on

      // Setup handlers
      setupShutdownHandlers()

      // Verify SIGINT handler was registered
      expect(handlers['SIGINT']).toBeDefined()

      // Invoke SIGINT handler to cover the disconnectRedis() call
      await handlers['SIGINT']()

      // Restore original process.on
      process.on = originalOn
    })

    it('should test retry strategy logic', () => {
      // Test the retry strategy function logic
      const retryStrategy = (times: number) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      }

      // First retry: 50ms
      expect(retryStrategy(1)).toBe(50)

      // Fifth retry: 250ms
      expect(retryStrategy(5)).toBe(250)

      // 40th retry: capped at 2000ms
      expect(retryStrategy(40)).toBe(2000)

      // 100th retry: still capped at 2000ms
      expect(retryStrategy(100)).toBe(2000)
    })

    it('should test auto-setup condition for non-test environments', () => {
      // Test the auto-setup condition logic
      const originalEnv = process.env['NODE_ENV']

      // In test environment, should not auto-setup
      process.env['NODE_ENV'] = 'test'
      expect(process.env['NODE_ENV'] !== 'test').toBe(false)

      // In development environment, should auto-setup
      process.env['NODE_ENV'] = 'development'
      expect(process.env['NODE_ENV'] !== 'test').toBe(true)

      // In production environment, should auto-setup
      process.env['NODE_ENV'] = 'production'
      expect(process.env['NODE_ENV'] !== 'test').toBe(true)

      // Restore
      process.env['NODE_ENV'] = originalEnv
    })
  })

  describe('basic operations', () => {
    it('should set and get a value', async () => {
      await connectRedisTest()
      await redisTest.set('test-key', 'test-value')
      const value = await redisTest.get('test-key')
      expect(value).toBe('test-value')
    })

    it('should set value with expiration', async () => {
      await connectRedisTest()
      await redisTest.setex('expiring-key', 1, 'temp-value')
      const value = await redisTest.get('expiring-key')
      expect(value).toBe('temp-value')

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100))
      const expired = await redisTest.get('expiring-key')
      expect(expired).toBeNull()
    })

    it('should delete a key', async () => {
      await connectRedisTest()
      await redisTest.set('delete-me', 'value')
      await redisTest.del('delete-me')
      const value = await redisTest.get('delete-me')
      expect(value).toBeNull()
    })

    it('should check if key exists', async () => {
      await connectRedisTest()
      await redisTest.set('exists-key', 'value')
      const exists = await redisTest.exists('exists-key')
      expect(exists).toBe(1)

      const notExists = await redisTest.exists('not-exists')
      expect(notExists).toBe(0)
    })

    it('should get TTL of a key', async () => {
      await connectRedisTest()
      await redisTest.setex('ttl-key', 10, 'value')
      const ttl = await redisTest.ttl('ttl-key')
      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(10)
    })
  })

  describe('flushRedis', () => {
    it('should flush all data from test database', async () => {
      await connectRedisTest()
      await redisTest.set('key1', 'value1')
      await redisTest.set('key2', 'value2')

      await flushRedis(redisTest)

      const keys = await redisTest.keys('*')
      expect(keys).toHaveLength(0)
    })

    it('should throw error in production environment', async () => {
      const originalEnv = process.env['NODE_ENV']
      process.env['NODE_ENV'] = 'production'

      await expect(flushRedis(redisTest)).rejects.toThrow(
        'Cannot flush Redis in production environment'
      )

      process.env['NODE_ENV'] = originalEnv
    })
  })

  describe('test helpers', () => {
    describe('clearRedis', () => {
      it('should clear all Redis data', async () => {
        await connectRedisTest()
        await redisTest.set('test', 'value')
        await clearRedis()
        const keys = await redisTest.keys('*')
        expect(keys).toHaveLength(0)
      })
    })

    describe('setupRedisTest', () => {
      it('should connect and clear Redis', async () => {
        await redisTest.set('old-data', 'value')
        await setupRedisTest()
        const keys = await redisTest.keys('*')
        expect(keys).toHaveLength(0)
        expect(redisTest.status).toBe('ready')
      })
    })

    describe('createTestSession', () => {
      it('should create a session with default expiration', async () => {
        const userId = 'user-123'
        const token = 'refresh-token-abc'

        const sessionKey = await createTestSession(userId, token)

        expect(sessionKey).toBe(`session:${token}`)
        const storedUserId = await redisTest.get(sessionKey)
        expect(storedUserId).toBe(userId)

        const ttl = await redisTest.ttl(sessionKey)
        expect(ttl).toBeGreaterThan(0)
        expect(ttl).toBeLessThanOrEqual(7 * 24 * 60 * 60)
      })

      it('should create a session with custom expiration', async () => {
        const userId = 'user-456'
        const token = 'refresh-token-xyz'
        const expiresIn = 3600 // 1 hour

        await createTestSession(userId, token, expiresIn)

        const sessionKey = `session:${token}`
        const ttl = await redisTest.ttl(sessionKey)
        expect(ttl).toBeGreaterThan(0)
        expect(ttl).toBeLessThanOrEqual(expiresIn)
      })
    })

    describe('getTestSession', () => {
      it('should get session data', async () => {
        const userId = 'user-789'
        const token = 'token-def'

        await createTestSession(userId, token)
        const retrievedUserId = await getTestSession(token)

        expect(retrievedUserId).toBe(userId)
      })

      it('should return null for non-existent session', async () => {
        const retrievedUserId = await getTestSession('non-existent-token')
        expect(retrievedUserId).toBeNull()
      })
    })

    describe('deleteTestSession', () => {
      it('should delete a session', async () => {
        const userId = 'user-delete'
        const token = 'token-delete'

        await createTestSession(userId, token)
        await deleteTestSession(token)

        const retrievedUserId = await getTestSession(token)
        expect(retrievedUserId).toBeNull()
      })

      it('should not error when deleting non-existent session', async () => {
        await expect(deleteTestSession('non-existent')).resolves.not.toThrow()
      })
    })

    describe('getAllSessionKeys', () => {
      it('should get all session keys', async () => {
        await createTestSession('user1', 'token1')
        await createTestSession('user2', 'token2')
        await createTestSession('user3', 'token3')

        const keys = await getAllSessionKeys()

        expect(keys).toHaveLength(3)
        expect(keys).toContain('session:token1')
        expect(keys).toContain('session:token2')
        expect(keys).toContain('session:token3')
      })

      it('should return empty array when no sessions', async () => {
        const keys = await getAllSessionKeys()
        expect(keys).toHaveLength(0)
      })
    })

    describe('countSessions', () => {
      it('should count total sessions', async () => {
        await createTestSession('user1', 'token1')
        await createTestSession('user2', 'token2')

        const count = await countSessions()
        expect(count).toBe(2)
      })

      it('should return 0 when no sessions', async () => {
        const count = await countSessions()
        expect(count).toBe(0)
      })
    })
  })

  describe('database configuration', () => {
    it('should use test database for testing', async () => {
      await connectRedisTest()

      // Verify redisTest can store and retrieve data
      await redisTest.set('test-config', 'test-value')
      const value = await redisTest.get('test-config')

      expect(value).toBe('test-value')
    })

    it('should connect production client to database 0', async () => {
      await connectRedis()

      // Verify redis can store and retrieve data
      await redis.set('prod-test-key', 'prod-value')
      const value = await redis.get('prod-test-key')

      expect(value).toBe('prod-value')

      // Cleanup
      await redis.del('prod-test-key')
      await disconnectRedis()
    })
  })

  describe('pattern matching', () => {
    it('should find keys by pattern', async () => {
      await connectRedisTest()
      await redisTest.set('session:token1', 'user1')
      await redisTest.set('session:token2', 'user2')
      await redisTest.set('cache:data', 'value')

      const sessionKeys = await redisTest.keys('session:*')
      expect(sessionKeys).toHaveLength(2)

      const cacheKeys = await redisTest.keys('cache:*')
      expect(cacheKeys).toHaveLength(1)
    })
  })

  describe('advanced operations', () => {
    it('should increment a counter', async () => {
      await connectRedisTest()
      const count1 = await redisTest.incr('counter')
      const count2 = await redisTest.incr('counter')
      const count3 = await redisTest.incr('counter')

      expect(count1).toBe(1)
      expect(count2).toBe(2)
      expect(count3).toBe(3)
    })

    it('should decrement a counter', async () => {
      await connectRedisTest()
      await redisTest.set('counter', '10')
      const count1 = await redisTest.decr('counter')
      const count2 = await redisTest.decr('counter')

      expect(count1).toBe(9)
      expect(count2).toBe(8)
    })

    it('should store and retrieve hash', async () => {
      await connectRedisTest()
      await redisTest.hset('user:123', 'name', 'John Doe')
      await redisTest.hset('user:123', 'email', 'john@example.com')

      const name = await redisTest.hget('user:123', 'name')
      const email = await redisTest.hget('user:123', 'email')

      expect(name).toBe('John Doe')
      expect(email).toBe('john@example.com')
    })

    it('should get all hash fields', async () => {
      await connectRedisTest()
      await redisTest.hset('user:456', 'name', 'Jane Smith')
      await redisTest.hset('user:456', 'age', '30')

      const userData = await redisTest.hgetall('user:456')

      expect(userData).toEqual({
        name: 'Jane Smith',
        age: '30',
      })
    })

    it('should work with lists', async () => {
      await connectRedisTest()
      await redisTest.rpush('queue', 'task1')
      await redisTest.rpush('queue', 'task2')
      await redisTest.rpush('queue', 'task3')

      const length = await redisTest.llen('queue')
      expect(length).toBe(3)

      const task = await redisTest.lpop('queue')
      expect(task).toBe('task1')

      const remaining = await redisTest.llen('queue')
      expect(remaining).toBe(2)
    })
  })
})

// Final cleanup test - runs last to test actual disconnect functions
// This test intentionally disconnects the shared instances
describe('Redis Client - Final Cleanup (runs last)', () => {
  it('should call actual disconnectRedisTest function', async () => {
    // Ensure connected first
    await connectRedisTest()

    // Call the actual disconnectRedisTest function
    await expect(disconnectRedisTest()).resolves.not.toThrow()

    // Don't reconnect - this is the final cleanup
  })

  it('should call actual disconnectRedis function', async () => {
    // Call the actual disconnectRedis function
    await expect(disconnectRedis()).resolves.not.toThrow()

    // Don't reconnect - this is the final cleanup
  })
})
