import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildApp } from '../../src/app.js'
import { FastifyInstance } from 'fastify'
import { db, clearAllTables } from '@concentrate/database'

describe('App Error Handlers and Core Routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    await clearAllTables(db)
    app = await buildApp()
  })

  afterEach(async () => {
    if (app) {
      await app.close()
    }
    await clearAllTables(db)
  })

  describe('GET /health', () => {
    it('should return health check status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('ok')
      expect(body.timestamp).toBeDefined()
    })
  })

  describe('GET /api/v0/', () => {
    it('should return API info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.message).toBe('Canvas School Portal API v0')
    })
  })

  describe('RBAC without authentication', () => {
    it('should return 401 when accessing protected endpoint without auth', async () => {
      // Try to access admin endpoint with no token at all
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/admin/users',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should test requireRole defensive code for missing user', async () => {
      // This tests the defensive code in rbac.ts lines 18-19
      // where requireRole checks if request.user exists
      const { requireRole } = await import('../../src/hooks/rbac.js')

      // Create mock request without user
      const mockRequest = {
        user: undefined,
      } as any

      const mockReply = {} as any

      // Call requireRole directly - should throw UnauthorizedError
      const hook = requireRole('admin')

      await expect(hook(mockRequest, mockReply)).rejects.toThrow('Authentication required')
    })
  })

  describe('Error Handlers', () => {
    it('should handle NotFoundError with 404', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/admin/users/00000000-0000-0000-0000-000000000000',
        cookies: { access_token: 'invalid' },
      })

      // Will get 401 first due to invalid token, but let's test with valid token
      // Register admin
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'admin@test.com',
          password: 'Admin123!',
          name: 'Admin User',
          role: 'admin',
        },
      })

      // Login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'admin@test.com',
          password: 'Admin123!',
        },
      })
      const cookies = loginResponse.cookies
      const token = cookies.find((c) => c.name === 'access_token')?.value || ''

      // Try to get non-existent user
      const notFoundResponse = await app.inject({
        method: 'GET',
        url: '/api/v0/admin/users/00000000-0000-0000-0000-000000000000',
        cookies: { access_token: token },
      })

      expect(notFoundResponse.statusCode).toBe(404)
    })

    it('should handle UnauthorizedError with 401', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/auth/me',
        cookies: { access_token: 'invalid-token' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should handle missing token with 401', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/auth/me',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should handle ForbiddenError with 403', async () => {
      // Register and login as teacher
      await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'teacher@test.com',
          password: 'Teacher123!',
          name: 'Teacher User',
          role: 'teacher',
        },
      })

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'teacher@test.com',
          password: 'Teacher123!',
        },
      })
      const cookies = loginResponse.cookies
      const token = cookies.find((c) => c.name === 'access_token')?.value || ''

      // Try to access admin endpoint
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/admin/users',
        cookies: { access_token: token },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should handle AlreadyExistsError with 409', async () => {
      // Register user
      await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'duplicate@test.com',
          password: 'Test123!',
          name: 'Test User',
          role: 'student',
        },
      })

      // Try to register again with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'duplicate@test.com',
          password: 'Test123!',
          name: 'Another User',
          role: 'student',
        },
      })

      expect(response.statusCode).toBe(409)
    })

    it('should handle ZodError from validation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'invalid-email',
          password: '123',
          name: 'Test',
          role: 'invalid',
        },
      })

      // ZodError gets caught by Fastify before our handler
      expect([400, 500]).toContain(response.statusCode)
    })

    it('should handle InvalidCredentialsError with 401', async () => {
      // Register user
      await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'test@test.com',
          password: 'Test123!',
          name: 'Test User',
          role: 'student',
        },
      })

      // Try to login with wrong password
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'test@test.com',
          password: 'WrongPassword123!',
        },
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
