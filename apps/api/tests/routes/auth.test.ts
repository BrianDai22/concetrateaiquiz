/**
 * Auth Routes Integration Tests
 * Tests authentication flow with real database
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildApp } from '../../src/app.js'
import { FastifyInstance } from 'fastify'
import { db, clearAllTables } from '@concentrate/database'

describe('Auth Routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    // Clear database
    await clearAllTables(db)

    // Build fresh app instance
    app = await buildApp()
  })

  afterEach(async () => {
    // Close app
    if (app) {
      await app.close()
    }

    // Clean up database
    await clearAllTables(db)
  })

  describe('POST /api/v0/auth/register', () => {
    it('should register a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
          role: 'student',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.user).toBeDefined()
      expect(body.user.email).toBe('test@example.com')
      expect(body.user.name).toBe('Test User')
      expect(body.user.role).toBe('student')
    })

    it('should reject duplicate email', async () => {
      // Register first user
      await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
          role: 'student',
        },
      })

      // Try to register again with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Different123!',
          name: 'Another User',
          role: 'teacher',
        },
      })

      expect(response.statusCode).toBe(409) // AlreadyExistsError
    })
  })

  describe('POST /api/v0/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Register user first
      await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
          role: 'student',
        },
      })

      // Login
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'Password123!',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user.email).toBe('test@example.com')

      // Check cookies are set
      const cookies = response.cookies
      expect(cookies.some(c => c.name === 'access_token')).toBe(true)
      expect(cookies.some(c => c.name === 'refresh_token')).toBe(true)
    })

    it('should reject invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'WrongPassword!',
        },
      })

      expect(response.statusCode).toBe(401) // InvalidCredentialsError → Unauthorized
    })
  })

  describe('GET /api/v0/auth/me', () => {
    it('should return current user with valid token', async () => {
      // Register and login
      await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
          role: 'student',
        },
      })

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'Password123!',
        },
      })

      // Extract access token from cookies
      const cookies = loginResponse.cookies
      const accessToken = cookies.find(c => c.name === 'access_token')

      // Call /me endpoint
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/auth/me',
        cookies: {
          access_token: accessToken?.value || '',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user).toBeDefined()
      expect(body.user.role).toBe('student')
    })

    it('should reject request without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/auth/me',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/v0/auth/refresh', () => {
    it('should refresh access token', async () => {
      // Register and login
      await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
          role: 'student',
        },
      })

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'Password123!',
        },
      })

      const cookies = loginResponse.cookies
      const refreshToken = cookies.find(c => c.name === 'refresh_token')

      // Refresh token
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/refresh',
        cookies: {
          refresh_token: refreshToken?.value || '',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)

      // Check new access token cookie is set
      const newCookies = response.cookies
      expect(newCookies.some(c => c.name === 'access_token')).toBe(true)
    })

    it('should rotate refresh token on refresh', async () => {
      // Register and login
      await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'refresh@example.com',
          password: 'Password123!',
          name: 'Refresh User',
          role: 'student',
        },
      })

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'refresh@example.com',
          password: 'Password123!',
        },
      })

      const cookies = loginResponse.cookies
      const originalRefreshToken = cookies.find(c => c.name === 'refresh_token')

      // Refresh token - should rotate
      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/refresh',
        cookies: {
          refresh_token: originalRefreshToken?.value || '',
        },
      })

      expect(refreshResponse.statusCode).toBe(200)

      // Verify new refresh token is different from original
      const newCookies = refreshResponse.cookies
      const newRefreshToken = newCookies.find(c => c.name === 'refresh_token')

      expect(newRefreshToken).toBeDefined()
      expect(newRefreshToken?.value).toBeDefined()
      expect(newRefreshToken?.value).not.toBe(originalRefreshToken?.value)

      // Verify old token no longer works
      const oldTokenResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/refresh',
        cookies: {
          refresh_token: originalRefreshToken?.value || '',
        },
      })

      expect(oldTokenResponse.statusCode).toBe(401)
    })

    it('should reject refresh without token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/refresh',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/v0/auth/logout', () => {
    it('should logout and clear cookies', async () => {
      // Register and login
      await app.inject({
        method: 'POST',
        url: '/api/v0/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
          role: 'student',
        },
      })

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'Password123!',
        },
      })

      const cookies = loginResponse.cookies
      const accessToken = cookies.find(c => c.name === 'access_token')
      const refreshToken = cookies.find(c => c.name === 'refresh_token')

      // Logout
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/logout',
        cookies: {
          access_token: accessToken?.value || '',
          refresh_token: refreshToken?.value || '',
        },
      })

      expect(response.statusCode).toBe(204)
    })
  })

  describe('GET /api/v0/auth/oauth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/auth/oauth/google',
      })

      // Should redirect to Google's OAuth page
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBeDefined()
      expect(response.headers.location).toContain('accounts.google.com')
    })
  })

  describe('GET /api/v0/auth/oauth/google/callback', () => {
    it('should redirect to error page without valid OAuth code', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/auth/oauth/google/callback',
      })

      // Without a valid code parameter, should redirect to error page
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBeDefined()
      // Should redirect to error URL (login page with error param)
      expect(response.headers.location).toContain('error=oauth_failed')
    })
  })
})
