import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildApp } from '../../src/app.js'
import { FastifyInstance } from 'fastify'
import { db, clearAllTables } from '@concentrate/database'

describe('Admin Routes', () => {
  let app: FastifyInstance
  let adminToken: string
  let adminUserId: string
  let teacherUserId: string
  let studentUserId: string

  beforeEach(async () => {
    await clearAllTables(db)
    app = await buildApp()

    // Create admin user and get token
    const adminResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/auth/register',
      payload: {
        email: 'admin@test.com',
        password: 'Admin123!',
        name: 'Admin User',
        role: 'admin',
      },
    })
    const adminBody = JSON.parse(adminResponse.body)
    adminUserId = adminBody.user.id

    // Login to get token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/auth/login',
      payload: {
        email: 'admin@test.com',
        password: 'Admin123!',
      },
    })
    const cookies = loginResponse.cookies
    const accessTokenCookie = cookies.find((c) => c.name === 'access_token')
    adminToken = accessTokenCookie?.value || ''

    // Create a teacher for testing
    const teacherResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/auth/register',
      payload: {
        email: 'teacher@test.com',
        password: 'Teacher123!',
        name: 'Teacher User',
        role: 'teacher',
      },
    })
    const teacherBody = JSON.parse(teacherResponse.body)
    teacherUserId = teacherBody.user.id

    // Create a student for testing
    const studentResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/auth/register',
      payload: {
        email: 'student@test.com',
        password: 'Student123!',
        name: 'Student User',
        role: 'student',
      },
    })
    const studentBody = JSON.parse(studentResponse.body)
    studentUserId = studentBody.user.id
  })

  afterEach(async () => {
    if (app) {
      await app.close()
    }
    await clearAllTables(db)
  })

  describe('GET /api/v0/admin/users', () => {
    it('should list all users with admin auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/admin/users',
        cookies: { access_token: adminToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.users).toBeDefined()
      expect(Array.isArray(body.users)).toBe(true)
      expect(body.users.length).toBeGreaterThanOrEqual(3) // admin, teacher, student
    })

    it('should filter users by role', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/admin/users?role=teacher',
        cookies: { access_token: adminToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.users.length).toBe(1)
      expect(body.users[0].role).toBe('teacher')
    })

    it('should filter by suspended status only', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/admin/users?suspended=false',
        cookies: { access_token: adminToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body.users)).toBe(true)
    })

    it('should paginate with page parameter only', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/admin/users?page=1',
        cookies: { access_token: adminToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body.users)).toBe(true)
    })

    it('should paginate with limit parameter only', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/admin/users?limit=5',
        cookies: { access_token: adminToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body.users)).toBe(true)
    })

    it('should require admin role', async () => {
      // Login as teacher
      const teacherLogin = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'teacher@test.com',
          password: 'Teacher123!',
        },
      })
      const teacherCookies = teacherLogin.cookies
      const teacherToken = teacherCookies.find((c) => c.name === 'access_token')?.value || ''

      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/admin/users',
        cookies: { access_token: teacherToken },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('POST /api/v0/admin/users', () => {
    it('should create a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/admin/users',
        cookies: { access_token: adminToken },
        payload: {
          email: 'newuser@test.com',
          password: 'NewUser123!',
          name: 'New User',
          role: 'student',
          suspended: false,
        },
      })

      if (response.statusCode !== 201) {
        console.error('Create user error:', response.body)
      }

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.user.email).toBe('newuser@test.com')
      expect(body.user.role).toBe('student')
    })

    it('should create a user without password (tests password || null branch)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/admin/users',
        cookies: { access_token: adminToken },
        payload: {
          email: 'nopassword@test.com',
          name: 'No Password User',
          role: 'student',
          suspended: false,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.user.email).toBe('nopassword@test.com')
    })

    it('should create a user without suspended field (tests suspended ?? false branch)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/admin/users',
        cookies: { access_token: adminToken },
        payload: {
          email: 'nosuspended@test.com',
          password: 'Password123!',
          name: 'No Suspended Field User',
          role: 'teacher',
          // suspended field omitted to test ?? false default
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.user.email).toBe('nosuspended@test.com')
      expect(body.user.suspended).toBe(false) // Should default to false
    })
  })

  describe('PUT /api/v0/admin/users/:id', () => {
    it('should update user details', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v0/admin/users/${teacherUserId}`,
        cookies: { access_token: adminToken },
        payload: {
          name: 'Updated Teacher Name',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user.name).toBe('Updated Teacher Name')
    })

    it('should update user email only', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v0/admin/users/${teacherUserId}`,
        cookies: { access_token: adminToken },
        payload: {
          email: 'newemail@test.com',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user.email).toBe('newemail@test.com')
    })

    it('should update user role only', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v0/admin/users/${studentUserId}`,
        cookies: { access_token: adminToken },
        payload: {
          role: 'teacher',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user.role).toBe('teacher')
    })

    it('should update multiple fields (email and name)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v0/admin/users/${teacherUserId}`,
        cookies: { access_token: adminToken },
        payload: {
          email: 'updated@test.com',
          name: 'Updated Name',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user.email).toBe('updated@test.com')
      expect(body.user.name).toBe('Updated Name')
    })

    it('should update multiple fields (name and role)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v0/admin/users/${studentUserId}`,
        cookies: { access_token: adminToken },
        payload: {
          name: 'Student Now Teacher',
          role: 'admin',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user.name).toBe('Student Now Teacher')
      expect(body.user.role).toBe('admin')
    })

    it('should update all three fields (email, name, and role)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v0/admin/users/${teacherUserId}`,
        cookies: { access_token: adminToken },
        payload: {
          email: 'allfields@test.com',
          name: 'All Fields Updated',
          role: 'admin',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user.email).toBe('allfields@test.com')
      expect(body.user.name).toBe('All Fields Updated')
      expect(body.user.role).toBe('admin')
    })

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v0/admin/users/${fakeId}`,
        cookies: { access_token: adminToken },
        payload: {
          name: 'New Name',
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('DELETE /api/v0/admin/users/:id', () => {
    it('should delete a user', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v0/admin/users/${studentUserId}`,
        cookies: { access_token: adminToken },
      })

      expect(response.statusCode).toBe(204)
    })

    it('should prevent deleting last admin', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v0/admin/users/${adminUserId}`,
        cookies: { access_token: adminToken },
      })

      expect(response.statusCode).toBe(400) // InvalidStateError
    })
  })

  describe('POST /api/v0/admin/users/:id/suspend', () => {
    it('should suspend a user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v0/admin/users/${teacherUserId}/suspend`,
        cookies: { access_token: adminToken },
        payload: {
          suspended: true,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user.suspended).toBe(true)
    })

    it('should prevent self-suspension', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v0/admin/users/${adminUserId}/suspend`,
        cookies: { access_token: adminToken },
        payload: {
          suspended: true,
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('POST /api/v0/admin/users/:id/unsuspend', () => {
    it('should unsuspend a user', async () => {
      // First suspend
      await app.inject({
        method: 'POST',
        url: `/api/v0/admin/users/${teacherUserId}/suspend`,
        cookies: { access_token: adminToken },
        payload: {
          suspended: true,
        },
      })

      // Then unsuspend
      const response = await app.inject({
        method: 'POST',
        url: `/api/v0/admin/users/${teacherUserId}/unsuspend`,
        cookies: { access_token: adminToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user.suspended).toBe(false)
    })
  })

  describe('GET /api/v0/admin/teacher-groups', () => {
    it('should return not implemented', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/admin/teacher-groups',
        cookies: { access_token: adminToken },
      })

      expect(response.statusCode).toBe(501)
    })
  })

  describe('POST /api/v0/admin/teacher-groups', () => {
    it('should return not implemented', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/admin/teacher-groups',
        cookies: { access_token: adminToken },
        payload: {},
      })

      expect(response.statusCode).toBe(501)
    })
  })

  describe('PUT /api/v0/admin/teacher-groups/:id', () => {
    it('should return not implemented', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v0/admin/teacher-groups/${fakeId}`,
        cookies: { access_token: adminToken },
        payload: {},
      })

      expect(response.statusCode).toBe(501)
    })
  })

  describe('DELETE /api/v0/admin/teacher-groups/:id', () => {
    it('should return not implemented', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v0/admin/teacher-groups/${fakeId}`,
        cookies: { access_token: adminToken },
      })

      expect(response.statusCode).toBe(501)
    })
  })
})
