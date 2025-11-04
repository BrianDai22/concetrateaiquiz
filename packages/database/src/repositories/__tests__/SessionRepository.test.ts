import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SessionRepository } from '../SessionRepository'
import { redisTest, setupRedisTest, teardownRedisTest } from '../../index'

describe('SessionRepository', () => {
  let repository: SessionRepository

  beforeEach(async () => {
    await setupRedisTest()
    repository = new SessionRepository(redisTest)
  })

  afterEach(async () => {
    await teardownRedisTest()
  })

  describe('create', () => {
    it('should create a session with default expiration', async () => {
      const userId = 'user-123'
      const refreshToken = 'token-abc-def'

      const session = await repository.create(userId, refreshToken)

      expect(session.userId).toBe(userId)
      expect(session.refreshToken).toBe(refreshToken)
      expect(session.createdAt).toBeInstanceOf(Date)
      expect(session.expiresAt).toBeInstanceOf(Date)
      expect(session.expiresAt.getTime()).toBeGreaterThan(session.createdAt.getTime())
    })

    it('should create a session with custom expiration', async () => {
      const userId = 'user-456'
      const refreshToken = 'token-xyz'
      const expiresIn = 3600 // 1 hour

      const session = await repository.create(userId, refreshToken, expiresIn)

      expect(session.userId).toBe(userId)

      // Verify TTL is close to expected
      const ttl = await redisTest.ttl(`session:${refreshToken}`)
      expect(ttl).toBeGreaterThan(3590)
      expect(ttl).toBeLessThanOrEqual(3600)
    })

    it('should store userId in Redis', async () => {
      const userId = 'user-789'
      const refreshToken = 'token-stored'

      await repository.create(userId, refreshToken)

      const storedUserId = await redisTest.get(`session:${refreshToken}`)
      expect(storedUserId).toBe(userId)
    })
  })

  describe('get', () => {
    it('should get an existing session', async () => {
      const userId = 'user-get'
      const refreshToken = 'token-get'

      await repository.create(userId, refreshToken)

      const session = await repository.get(refreshToken)

      expect(session).not.toBeNull()
      expect(session?.userId).toBe(userId)
      expect(session?.refreshToken).toBe(refreshToken)
      expect(session?.expiresAt).toBeInstanceOf(Date)
    })

    it('should return null for non-existent session', async () => {
      const session = await repository.get('non-existent-token')
      expect(session).toBeNull()
    })

    it('should return null for expired session', async () => {
      const userId = 'user-expired'
      const refreshToken = 'token-expired'

      // Create session with 1 second TTL
      await repository.create(userId, refreshToken, 1)

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100))

      const session = await repository.get(refreshToken)
      expect(session).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete an existing session', async () => {
      const userId = 'user-delete'
      const refreshToken = 'token-delete'

      await repository.create(userId, refreshToken)

      const deleted = await repository.delete(refreshToken)

      expect(deleted).toBe(true)

      const session = await repository.get(refreshToken)
      expect(session).toBeNull()
    })

    it('should return false when deleting non-existent session', async () => {
      const deleted = await repository.delete('non-existent-token')
      expect(deleted).toBe(false)
    })

    it('should remove key from Redis', async () => {
      const userId = 'user-remove'
      const refreshToken = 'token-remove'

      await repository.create(userId, refreshToken)
      await repository.delete(refreshToken)

      const exists = await redisTest.exists(`session:${refreshToken}`)
      expect(exists).toBe(0)
    })
  })

  describe('refresh', () => {
    it('should refresh an existing session', async () => {
      const userId = 'user-refresh'
      const refreshToken = 'token-refresh'

      await repository.create(userId, refreshToken, 3600)

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100))

      const refreshed = await repository.refresh(refreshToken, 7200)

      expect(refreshed).not.toBeNull()
      expect(refreshed?.userId).toBe(userId)

      // Verify new TTL
      const ttl = await redisTest.ttl(`session:${refreshToken}`)
      expect(ttl).toBeGreaterThan(7190)
      expect(ttl).toBeLessThanOrEqual(7200)
    })

    it('should return null when refreshing non-existent session', async () => {
      const refreshed = await repository.refresh('non-existent-token')
      expect(refreshed).toBeNull()
    })

    it('should use default TTL when not specified', async () => {
      const userId = 'user-refresh-default'
      const refreshToken = 'token-refresh-default'

      await repository.create(userId, refreshToken, 3600)

      const refreshed = await repository.refresh(refreshToken)

      expect(refreshed).not.toBeNull()

      // Default is 7 days = 604800 seconds
      const ttl = await redisTest.ttl(`session:${refreshToken}`)
      expect(ttl).toBeGreaterThan(604790)
      expect(ttl).toBeLessThanOrEqual(604800)
    })
  })

  describe('exists', () => {
    it('should return true for existing session', async () => {
      const userId = 'user-exists'
      const refreshToken = 'token-exists'

      await repository.create(userId, refreshToken)

      const exists = await repository.exists(refreshToken)
      expect(exists).toBe(true)
    })

    it('should return false for non-existent session', async () => {
      const exists = await repository.exists('non-existent-token')
      expect(exists).toBe(false)
    })

    it('should return false for expired session', async () => {
      const userId = 'user-expired-exists'
      const refreshToken = 'token-expired-exists'

      await repository.create(userId, refreshToken, 1)

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100))

      const exists = await repository.exists(refreshToken)
      expect(exists).toBe(false)
    })
  })

  describe('getAllForUser', () => {
    it('should get all sessions for a user', async () => {
      const userId = 'user-multi'

      await repository.create(userId, 'token1')
      await repository.create(userId, 'token2')
      await repository.create(userId, 'token3')

      const sessions = await repository.getAllForUser(userId)

      expect(sessions).toHaveLength(3)
      expect(sessions).toContain('token1')
      expect(sessions).toContain('token2')
      expect(sessions).toContain('token3')
    })

    it('should not return sessions for other users', async () => {
      await repository.create('user-1', 'token-user-1')
      await repository.create('user-2', 'token-user-2')

      const sessions = await repository.getAllForUser('user-1')

      expect(sessions).toHaveLength(1)
      expect(sessions).toContain('token-user-1')
    })

    it('should return empty array when user has no sessions', async () => {
      const sessions = await repository.getAllForUser('user-no-sessions')
      expect(sessions).toHaveLength(0)
    })
  })

  describe('deleteAllForUser', () => {
    it('should delete all sessions for a user', async () => {
      const userId = 'user-delete-all'

      await repository.create(userId, 'token1')
      await repository.create(userId, 'token2')
      await repository.create(userId, 'token3')

      const deleted = await repository.deleteAllForUser(userId)

      expect(deleted).toBe(3)

      const sessions = await repository.getAllForUser(userId)
      expect(sessions).toHaveLength(0)
    })

    it('should not delete sessions for other users', async () => {
      await repository.create('user-1', 'token-user-1')
      await repository.create('user-2', 'token-user-2-a')
      await repository.create('user-2', 'token-user-2-b')

      await repository.deleteAllForUser('user-2')

      const user1Sessions = await repository.getAllForUser('user-1')
      expect(user1Sessions).toHaveLength(1)
    })

    it('should return 0 when user has no sessions', async () => {
      const deleted = await repository.deleteAllForUser('user-no-sessions')
      expect(deleted).toBe(0)
    })
  })

  describe('count', () => {
    it('should count total sessions', async () => {
      await repository.create('user-1', 'token1')
      await repository.create('user-2', 'token2')
      await repository.create('user-3', 'token3')

      const count = await repository.count()
      expect(count).toBe(3)
    })

    it('should return 0 when no sessions', async () => {
      const count = await repository.count()
      expect(count).toBe(0)
    })
  })

  describe('countForUser', () => {
    it('should count sessions for a specific user', async () => {
      const userId = 'user-count'

      await repository.create(userId, 'token1')
      await repository.create(userId, 'token2')
      await repository.create('other-user', 'token3')

      const count = await repository.countForUser(userId)
      expect(count).toBe(2)
    })

    it('should return 0 when user has no sessions', async () => {
      const count = await repository.countForUser('user-no-sessions')
      expect(count).toBe(0)
    })
  })

  describe('deleteAll', () => {
    it('should delete all sessions', async () => {
      await repository.create('user-1', 'token1')
      await repository.create('user-2', 'token2')
      await repository.create('user-3', 'token3')

      const deleted = await repository.deleteAll()

      expect(deleted).toBe(3)

      const count = await repository.count()
      expect(count).toBe(0)
    })

    it('should return 0 when no sessions', async () => {
      const deleted = await repository.deleteAll()
      expect(deleted).toBe(0)
    })

    it('should throw error in production environment', async () => {
      const originalEnv = process.env['NODE_ENV']
      process.env['NODE_ENV'] = 'production'

      await expect(repository.deleteAll()).rejects.toThrow(
        'Cannot delete all sessions in production'
      )

      process.env['NODE_ENV'] = originalEnv
    })
  })

  describe('key prefix', () => {
    it('should use correct key prefix format', async () => {
      const userId = 'user-prefix'
      const refreshToken = 'token-prefix'

      await repository.create(userId, refreshToken)

      // Verify key exists with correct prefix
      const exists = await redisTest.exists('session:token-prefix')
      expect(exists).toBe(1)
    })

    it('should only operate on session keys', async () => {
      // Create a non-session key
      await redisTest.set('other:key', 'value')

      // Create session keys
      await repository.create('user-1', 'token1')
      await repository.create('user-2', 'token2')

      const count = await repository.count()

      // Should only count session keys, not the 'other:key'
      expect(count).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should handle TTL edge case when key exists but TTL is 0 or negative', async () => {
      // Create a mock Redis that returns userId but TTL = 0
      const mockRedis = {
        get: async () => 'user-ttl-edge',
        ttl: async () => 0,
      }

      const mockRepository = new SessionRepository(mockRedis as never)
      const session = await mockRepository.get('token-ttl-edge')

      expect(session).toBeNull()
    })

    it('should handle special characters in refresh token', async () => {
      const userId = 'user-special'
      const refreshToken = 'token-with-dash_and_underscore.and.dot'

      const session = await repository.create(userId, refreshToken)

      expect(session.refreshToken).toBe(refreshToken)

      const retrieved = await repository.get(refreshToken)
      expect(retrieved?.userId).toBe(userId)
    })

    it('should handle very long refresh tokens', async () => {
      const userId = 'user-long-token'
      const refreshToken = 'a'.repeat(500)

      const session = await repository.create(userId, refreshToken)

      expect(session.refreshToken).toBe(refreshToken)

      const retrieved = await repository.get(refreshToken)
      expect(retrieved?.userId).toBe(userId)
    })

    it('should handle concurrent creates for same user', async () => {
      const userId = 'user-concurrent'

      const [session1, session2, session3] = await Promise.all([
        repository.create(userId, 'token-concurrent-1'),
        repository.create(userId, 'token-concurrent-2'),
        repository.create(userId, 'token-concurrent-3'),
      ])

      expect(session1.userId).toBe(userId)
      expect(session2.userId).toBe(userId)
      expect(session3.userId).toBe(userId)

      const count = await repository.countForUser(userId)
      expect(count).toBe(3)
    })
  })
})
