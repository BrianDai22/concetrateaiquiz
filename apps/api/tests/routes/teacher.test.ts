import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildApp } from '../../src/app.js'
import { FastifyInstance } from 'fastify'
import { db, clearAllTables } from '@concentrate/database'

describe('Teacher Routes', () => {
  let app: FastifyInstance
  let teacherToken: string
  let teacherId: string
  let studentId: string
  let studentToken: string
  let classId: string
  let assignmentId: string

  beforeEach(async () => {
    await clearAllTables(db)
    app = await buildApp()

    // Create teacher and get token
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
    teacherId = teacherBody.user.id

    // Login teacher
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/auth/login',
      payload: {
        email: 'teacher@test.com',
        password: 'Teacher123!',
      },
    })
    const cookies = loginResponse.cookies
    teacherToken = cookies.find((c) => c.name === 'access_token')?.value || ''

    // Create a student
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
    studentId = studentBody.user.id

    // Login student
    const studentLoginResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/auth/login',
      payload: {
        email: 'student@test.com',
        password: 'Student123!',
      },
    })
    const studentCookies = studentLoginResponse.cookies
    studentToken = studentCookies.find((c) => c.name === 'access_token')?.value || ''
  })

  afterEach(async () => {
    if (app) {
      await app.close()
    }
    await clearAllTables(db)
  })

  describe('Class Management', () => {
    describe('POST /api/v0/teacher/classes', () => {
      it('should create a class', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: {
            name: 'Math 101',
            description: 'Introduction to Mathematics',
          },
        })

        expect(response.statusCode).toBe(201)
        const body = JSON.parse(response.body)
        expect(body.class.name).toBe('Math 101')
        expect(body.class.teacher_id).toBe(teacherId)
        classId = body.class.id
      })

      it('should create class without description', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: {
            name: 'Science 101',
          },
        })

        expect(response.statusCode).toBe(201)
        const body = JSON.parse(response.body)
        expect(body.class.name).toBe('Science 101')
        expect(body.class.description).toBeNull()
      })
    })

    describe('GET /api/v0/teacher/classes', () => {
      it('should list teacher classes', async () => {
        // Create a class first
        await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: { name: 'Math 101' },
        })

        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.classes.length).toBe(1)
        expect(body.classes[0].name).toBe('Math 101')
      })

      it('should paginate with page parameter only', async () => {
        // Create a class first
        await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: { name: 'Math 101' },
        })

        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/classes?page=1',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Array.isArray(body.classes)).toBe(true)
      })

      it('should paginate with limit parameter only', async () => {
        // Create a class first
        await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: { name: 'Math 101' },
        })

        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/classes?limit=10',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Array.isArray(body.classes)).toBe(true)
      })

      it('should paginate with both page and limit parameters', async () => {
        // Create a class first
        await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: { name: 'Math 101' },
        })

        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/classes?page=1&limit=10',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Array.isArray(body.classes)).toBe(true)
      })
    })

    describe('PUT /api/v0/teacher/classes/:id', () => {
      it('should update class', async () => {
        // Create class
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: { name: 'Math 101' },
        })
        const createBody = JSON.parse(createResponse.body)
        classId = createBody.class.id

        // Update class
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v0/teacher/classes/${classId}`,
          cookies: { access_token: teacherToken },
          payload: {
            name: 'Advanced Math 101',
            description: 'Updated description',
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.class.name).toBe('Advanced Math 101')
      })

      it('should update class name only', async () => {
        // Create class
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: { name: 'Math 101' },
        })
        const createBody = JSON.parse(createResponse.body)
        const tempClassId = createBody.class.id

        // Update name only
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v0/teacher/classes/${tempClassId}`,
          cookies: { access_token: teacherToken },
          payload: {
            name: 'Math 102',
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.class.name).toBe('Math 102')
      })

      it('should update class description only', async () => {
        // Create class
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: { name: 'Math 101', description: 'Original' },
        })
        const createBody = JSON.parse(createResponse.body)
        const tempClassId = createBody.class.id

        // Update description only
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v0/teacher/classes/${tempClassId}`,
          cookies: { access_token: teacherToken },
          payload: {
            description: 'New Description',
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.class.description).toBe('New Description')
      })
    })

    describe('DELETE /api/v0/teacher/classes/:id', () => {
      it('should delete class', async () => {
        // Create class
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: { name: 'Math 101' },
        })
        const createBody = JSON.parse(createResponse.body)
        classId = createBody.class.id

        // Delete class
        const response = await app.inject({
          method: 'DELETE',
          url: `/api/v0/teacher/classes/${classId}`,
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(204)
      })
    })

    describe('POST /api/v0/teacher/classes/:id/students', () => {
      it('should add student to class', async () => {
        // Create class
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: { name: 'Math 101' },
        })
        const createBody = JSON.parse(createResponse.body)
        classId = createBody.class.id

        // Add student
        const response = await app.inject({
          method: 'POST',
          url: `/api/v0/teacher/classes/${classId}/students`,
          cookies: { access_token: teacherToken },
          payload: {
            studentId: studentId,
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.success).toBe(true)
      })
    })

    describe('DELETE /api/v0/teacher/classes/:classId/students/:studentId', () => {
      it('should remove student from class', async () => {
        // Create class and add student
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: { name: 'Math 101' },
        })
        const createBody = JSON.parse(createResponse.body)
        classId = createBody.class.id

        await app.inject({
          method: 'POST',
          url: `/api/v0/teacher/classes/${classId}/students`,
          cookies: { access_token: teacherToken },
          payload: { studentId },
        })

        // Remove student
        const response = await app.inject({
          method: 'DELETE',
          url: `/api/v0/teacher/classes/${classId}/students/${studentId}`,
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(204)
      })
    })

    describe('GET /api/v0/teacher/users/search', () => {
      it('should search for students by email', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/users/search?email=student',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.users).toBeDefined()
        expect(Array.isArray(body.users)).toBe(true)
      })

      it('should only return students (not teachers or admins)', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/users/search?email=admin',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.users).toBeDefined()
        // Should not find admin users since we filter for students only
        expect(body.users.length).toBe(0)
      })

      it('should not return suspended students', async () => {
        // This test assumes suspended students are filtered out
        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/users/search?email=suspended',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.users).toBeDefined()
        // All returned users should have suspended=false
        body.users.forEach((user: { suspended: boolean }) => {
          expect(user.suspended).toBe(false)
        })
      })

      it('should return 400 without email parameter', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/users/search',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(400)
      })

      it('should require authentication', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/users/search?email=test',
        })

        expect(response.statusCode).toBe(401)
      })
    })
  })

  describe('Assignment Management', () => {
    beforeEach(async () => {
      // Create a class for assignment tests
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/teacher/classes',
        cookies: { access_token: teacherToken },
        payload: { name: 'Math 101' },
      })
      const createBody = JSON.parse(createResponse.body)
      classId = createBody.class.id
    })

    describe('POST /api/v0/teacher/assignments', () => {
      it('should create assignment', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 1',
            description: 'Complete chapter 1 exercises',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })

        expect(response.statusCode).toBe(201)
        const body = JSON.parse(response.body)
        expect(body.assignment.title).toBe('Homework 1')
        expect(body.assignment.class_id).toBe(classId)
        assignmentId = body.assignment.id
      })

      it('should return 400 when classId is missing', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            title: 'Homework 1',
            description: 'Test',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })

        expect(response.statusCode).toBe(400)
      })
    })

    describe('GET /api/v0/teacher/assignments', () => {
      it('should list teacher assignments', async () => {
        // Create assignment
        await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 1',
            description: 'Test',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })

        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.assignments.length).toBe(1)
        expect(body.assignments[0].title).toBe('Homework 1')
      })

      it('should paginate with page parameter only', async () => {
        // Create assignment
        await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 1',
            description: 'Test',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })

        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/assignments?page=1',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Array.isArray(body.assignments)).toBe(true)
      })

      it('should paginate with limit parameter only', async () => {
        // Create assignment
        await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 1',
            description: 'Test',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })

        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/assignments?limit=10',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Array.isArray(body.assignments)).toBe(true)
      })

      it('should paginate with both page and limit parameters', async () => {
        // Create assignment
        await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 1',
            description: 'Test',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })

        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/assignments?page=1&limit=10',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Array.isArray(body.assignments)).toBe(true)
      })
    })

    describe('PUT /api/v0/teacher/assignments/:id', () => {
      it('should update assignment', async () => {
        // Create assignment
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 1',
            description: 'Test',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })
        const createBody = JSON.parse(createResponse.body)
        assignmentId = createBody.assignment.id

        // Update assignment
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v0/teacher/assignments/${assignmentId}`,
          cookies: { access_token: teacherToken },
          payload: {
            title: 'Updated Homework 1',
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.assignment.title).toBe('Updated Homework 1')
      })

      it('should update assignment description only', async () => {
        // Create assignment
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 2',
            description: 'Original description',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })
        const createBody = JSON.parse(createResponse.body)
        const tempAssignmentId = createBody.assignment.id

        // Update description only
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v0/teacher/assignments/${tempAssignmentId}`,
          cookies: { access_token: teacherToken },
          payload: {
            description: 'New description',
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.assignment.description).toBe('New description')
      })

      it('should update assignment dueDate only', async () => {
        // Create assignment
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 3',
            description: 'Test',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })
        const createBody = JSON.parse(createResponse.body)
        const tempAssignmentId = createBody.assignment.id

        // Update dueDate only
        const newDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v0/teacher/assignments/${tempAssignmentId}`,
          cookies: { access_token: teacherToken },
          payload: {
            dueDate: newDueDate,
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(new Date(body.assignment.due_date).toISOString()).toBe(newDueDate)
      })

      it('should update title and description', async () => {
        // Create assignment
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 4',
            description: 'Original',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })
        const createBody = JSON.parse(createResponse.body)
        const tempAssignmentId = createBody.assignment.id

        // Update title and description
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v0/teacher/assignments/${tempAssignmentId}`,
          cookies: { access_token: teacherToken },
          payload: {
            title: 'Updated Homework 4',
            description: 'Updated description',
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.assignment.title).toBe('Updated Homework 4')
        expect(body.assignment.description).toBe('Updated description')
      })

      it('should update title and dueDate', async () => {
        // Create assignment
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 5',
            description: 'Test',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })
        const createBody = JSON.parse(createResponse.body)
        const tempAssignmentId = createBody.assignment.id

        // Update title and dueDate
        const newDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v0/teacher/assignments/${tempAssignmentId}`,
          cookies: { access_token: teacherToken },
          payload: {
            title: 'Updated Homework 5',
            dueDate: newDueDate,
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.assignment.title).toBe('Updated Homework 5')
        expect(new Date(body.assignment.due_date).toISOString()).toBe(newDueDate)
      })

      it('should update description and dueDate', async () => {
        // Create assignment
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 6',
            description: 'Original',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })
        const createBody = JSON.parse(createResponse.body)
        const tempAssignmentId = createBody.assignment.id

        // Update description and dueDate
        const newDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v0/teacher/assignments/${tempAssignmentId}`,
          cookies: { access_token: teacherToken },
          payload: {
            description: 'Updated description',
            dueDate: newDueDate,
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.assignment.description).toBe('Updated description')
        expect(new Date(body.assignment.due_date).toISOString()).toBe(newDueDate)
      })

      it('should update all three fields (title, description, dueDate)', async () => {
        // Create assignment
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 7',
            description: 'Original',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })
        const createBody = JSON.parse(createResponse.body)
        const tempAssignmentId = createBody.assignment.id

        // Update all three fields
        const newDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v0/teacher/assignments/${tempAssignmentId}`,
          cookies: { access_token: teacherToken },
          payload: {
            title: 'Final Homework',
            description: 'Final description',
            dueDate: newDueDate,
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.assignment.title).toBe('Final Homework')
        expect(body.assignment.description).toBe('Final description')
        expect(new Date(body.assignment.due_date).toISOString()).toBe(newDueDate)
      })
    })

    describe('DELETE /api/v0/teacher/assignments/:id', () => {
      it('should delete assignment', async () => {
        // Create assignment
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Homework 1',
            description: 'Test',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })
        const createBody = JSON.parse(createResponse.body)
        assignmentId = createBody.assignment.id

        // Delete assignment
        const response = await app.inject({
          method: 'DELETE',
          url: `/api/v0/teacher/assignments/${assignmentId}`,
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(204)
      })
    })

    describe('GET /api/v0/teacher/assignments/:id/stats', () => {
      it('should get submission statistics for assignment', async () => {
        // Create assignment
        const assignmentResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Stats Test Assignment',
            description: 'Test',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })
        const assignmentBody = JSON.parse(assignmentResponse.body)
        const testAssignmentId = assignmentBody.assignment.id

        // Get stats (should be 0 initially)
        const response = await app.inject({
          method: 'GET',
          url: `/api/v0/teacher/assignments/${testAssignmentId}/stats`,
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.stats).toBeDefined()
        expect(body.stats.total).toBe(0)
        expect(body.stats.graded).toBe(0)
        expect(body.stats.ungraded).toBe(0)
      })

      it('should require authentication', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v0/teacher/assignments/some-id/stats`,
        })

        expect(response.statusCode).toBe(401)
      })
    })

    describe('GET /api/v0/teacher/submissions', () => {
      it('should require assignment_id query parameter', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v0/teacher/submissions',
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(400)
      })

      it('should get submissions for assignment with student information', async () => {
        // Create assignment first
        const assignmentResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: classId,
            title: 'Test Assignment',
            description: 'Test',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })
        const assignment = JSON.parse(assignmentResponse.body).assignment

        // Student submits assignment
        await app.inject({
          method: 'POST',
          url: '/api/v0/student/assignments/submit',
          cookies: { access_token: studentToken },
          payload: {
            assignmentId: assignment.id,
            content: 'Test submission content',
          },
        })

        const response = await app.inject({
          method: 'GET',
          url: `/api/v0/teacher/submissions?assignment_id=${assignment.id}`,
          cookies: { access_token: teacherToken },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Array.isArray(body.submissions)).toBe(true)

        // Verify each submission includes student data
        if (body.submissions.length > 0) {
          const submission = body.submissions[0]
          expect(submission).toHaveProperty('student')
          expect(submission.student).toHaveProperty('id')
          expect(submission.student).toHaveProperty('name')
          expect(submission.student).toHaveProperty('email')
        }
      })
    })

    describe('POST /api/v0/teacher/classes/:id/students - multiple students', () => {
      it('should add multiple students to class', async () => {
        // Create another student
        const student2Response = await app.inject({
          method: 'POST',
          url: '/api/v0/auth/register',
          payload: {
            email: 'student2@test.com',
            password: 'Student123!',
            name: 'Student 2',
            role: 'student',
          },
        })
        const student2Id = JSON.parse(student2Response.body).user.id

        const response = await app.inject({
          method: 'POST',
          url: `/api/v0/teacher/classes/${classId}/students`,
          cookies: { access_token: teacherToken },
          payload: {
            studentIds: [studentId, student2Id],
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.enrolled).toBe(2)
      })
    })

    describe('POST /api/v0/teacher/submissions/:id/grade - success cases', () => {
      let submissionId: string
      let localClassId: string
      let localAssignmentId: string

      beforeEach(async () => {
        // Create a class
        const classResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/classes',
          cookies: { access_token: teacherToken },
          payload: {
            name: 'Grading Test Class',
            description: 'For grading tests',
          },
        })
        const classBody = JSON.parse(classResponse.body)
        localClassId = classBody.class.id

        // Enroll student in class
        await app.inject({
          method: 'POST',
          url: `/api/v0/teacher/classes/${localClassId}/students`,
          cookies: { access_token: teacherToken },
          payload: {
            studentId: studentId,
          },
        })

        // Create an assignment
        const assignmentResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/teacher/assignments',
          cookies: { access_token: teacherToken },
          payload: {
            classId: localClassId,
            title: 'Grading Test Assignment',
            description: 'Test assignment',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })
        const assignmentBody = JSON.parse(assignmentResponse.body)
        localAssignmentId = assignmentBody.assignment.id

        // Create a submission to grade
        const submitResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/student/submissions',
          cookies: { access_token: studentToken },
          payload: {
            assignmentId: localAssignmentId,
            content: 'Student submission for grading',
          },
        })
        const submitBody = JSON.parse(submitResponse.body)
        submissionId = submitBody.submission.id
      })

      it('should grade submission with feedback', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v0/teacher/submissions/${submissionId}/grade`,
          cookies: { access_token: teacherToken },
          payload: {
            grade: 85,
            feedback: 'Great work! Could improve on X',
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Number(body.grade.grade)).toBe(85)
        expect(body.grade.feedback).toBe('Great work! Could improve on X')
      })

      it('should grade submission without feedback (tests optional feedback branch)', async () => {
        // Use a different submission by creating one inline
        // First create a second submission
        const newSubmitResponse = await app.inject({
          method: 'POST',
          url: '/api/v0/student/submissions',
          cookies: { access_token: studentToken },
          payload: {
            assignmentId: localAssignmentId,
            content: 'Second submission for no-feedback test',
          },
        })

        expect(newSubmitResponse.statusCode).toBe(201)
        const newSubmitBody = JSON.parse(newSubmitResponse.body)
        const newSubmissionId = newSubmitBody.submission.id

        // Grade without feedback
        const response = await app.inject({
          method: 'POST',
          url: `/api/v0/teacher/submissions/${newSubmissionId}/grade`,
          cookies: { access_token: teacherToken },
          payload: {
            grade: 92,
            // feedback omitted to test optional branch
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(Number(body.grade.grade)).toBe(92)
      })
    })

    describe('POST /api/v0/teacher/submissions/:id/grade - error cases', () => {
      it('should return 404 for non-existent submission', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000'
        const response = await app.inject({
          method: 'POST',
          url: `/api/v0/teacher/submissions/${fakeId}/grade`,
          cookies: { access_token: teacherToken },
          payload: {
            grade: 90,
            feedback: 'Good work',
          },
        })

        expect(response.statusCode).toBe(404)
      })
    })
  })
})
