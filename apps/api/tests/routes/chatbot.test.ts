/**
 * Chatbot Routes Integration Tests
 * Tests chatbot API with authentication and real database
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the entire ChatbotService to avoid OpenAI API calls
vi.mock('@concentrate/services', async () => {
  const actual = await vi.importActual<typeof import('@concentrate/services')>('@concentrate/services')
  return {
    ...actual,
    ChatbotService: class MockChatbotService {
      constructor(_db: unknown) {
        // Accept db parameter but don't use it
      }
      async chat(_userId: string, _message: string): Promise<string> {
        return 'This is a test response from the AI assistant.'
      }
    },
  }
})

import { buildApp } from '../../src/app.js'
import { FastifyInstance } from 'fastify'
import { db, clearAllTables } from '@concentrate/database'

describe('Chatbot Routes', () => {
  let app: FastifyInstance
  let accessToken: string
  let studentUserId: string
  let teacherUserId: string
  let adminUserId: string

  beforeEach(async () => {
    // Clear database
    await clearAllTables(db)

    // Build fresh app instance
    app = await buildApp()

    // Set environment variables
    process.env['OPENAI_API_KEY'] = 'test-api-key'
    process.env['CHATBOT_MODEL'] = 'gpt-4o-mini'
    process.env['CHATBOT_MAX_TOKENS'] = '500'
    process.env['CHATBOT_TEMPERATURE'] = '0.7'

    // Register student user
    const studentResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/auth/register',
      payload: {
        email: 'student@example.com',
        password: 'Password123!',
        name: 'Test Student',
        role: 'student',
      },
    })
    const studentBody = JSON.parse(studentResponse.body)
    studentUserId = studentBody.user.id

    // Register teacher user
    const teacherResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/auth/register',
      payload: {
        email: 'teacher@example.com',
        password: 'Password123!',
        name: 'Test Teacher',
        role: 'teacher',
      },
    })
    const teacherBody = JSON.parse(teacherResponse.body)
    teacherUserId = teacherBody.user.id

    // Register admin user
    const adminResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/auth/register',
      payload: {
        email: 'admin@example.com',
        password: 'Password123!',
        name: 'Test Admin',
        role: 'admin',
      },
    })
    const adminBody = JSON.parse(adminResponse.body)
    adminUserId = adminBody.user.id

    // Login as student to get access token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/auth/login',
      payload: {
        email: 'student@example.com',
        password: 'Password123!',
      },
    })
    const cookies = loginResponse.cookies
    const accessTokenCookie = cookies.find((c) => c.name === 'access_token')
    accessToken = accessTokenCookie?.value || ''
  })

  afterEach(async () => {
    // Close app
    if (app) {
      await app.close()
    }

    // Clean up database
    await clearAllTables(db)
  })

  describe('POST /api/v0/chatbot/chat', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        payload: {
          message: 'How do I submit an assignment?',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 200 with valid auth and AI response', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        cookies: {
          access_token: accessToken,
        },
        payload: {
          message: 'How do I submit an assignment?',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.response).toBe('This is a test response from the AI assistant.')
      expect(body.timestamp).toBeDefined()
    })

    it('should work for student users', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        cookies: {
          access_token: accessToken,
        },
        payload: {
          message: 'What classes am I enrolled in?',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.response).toBeDefined()
    })

    it('should work for teacher users', async () => {
      // Login as teacher
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'teacher@example.com',
          password: 'Password123!',
        },
      })
      const cookies = loginResponse.cookies
      const teacherTokenCookie = cookies.find((c) => c.name === 'access_token')
      const teacherToken = teacherTokenCookie?.value || ''

      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        cookies: {
          access_token: teacherToken,
        },
        payload: {
          message: 'How do I grade assignments?',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.response).toBeDefined()
    })

    it('should work for admin users', async () => {
      // Login as admin
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'admin@example.com',
          password: 'Password123!',
        },
      })
      const cookies = loginResponse.cookies
      const adminTokenCookie = cookies.find((c) => c.name === 'access_token')
      const adminToken = adminTokenCookie?.value || ''

      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        cookies: {
          access_token: adminToken,
        },
        payload: {
          message: 'How do I create a new user?',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.response).toBeDefined()
    })

    it('should return 400 for empty message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        cookies: {
          access_token: accessToken,
        },
        payload: {
          message: '',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 for message too long (>1000 chars)', async () => {
      const longMessage = 'a'.repeat(1001)

      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        cookies: {
          access_token: accessToken,
        },
        payload: {
          message: longMessage,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 for missing message field', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        cookies: {
          access_token: accessToken,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })

    it('should trim whitespace from message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        cookies: {
          access_token: accessToken,
        },
        payload: {
          message: '   How do I submit?   ',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.response).toBeDefined()
    })

    it('should return 401 for invalid access token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        headers: {
          authorization: 'Bearer invalid-token-123',
        },
        payload: {
          message: 'Test message',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 401 for expired access token', async () => {
      // Use a token that looks valid but is expired
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjN9.test'

      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
        payload: {
          message: 'Test message',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should handle special characters in message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        cookies: {
          access_token: accessToken,
        },
        payload: {
          message: 'How do I use <script>alert("test")</script> in HTML?',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.response).toBeDefined()
    })

    it('should handle unicode characters in message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        cookies: {
          access_token: accessToken,
        },
        payload: {
          message: '¿Cómo puedo enviar una tarea? 你好',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.response).toBeDefined()
    })

    it('should handle multiline message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/chatbot/chat',
        cookies: {
          access_token: accessToken,
        },
        payload: {
          message: 'How do I:\n1. Submit assignment\n2. View grades\n3. Check feedback',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.response).toBeDefined()
    })
  })
})
