import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildApp } from '../../src/app.js'
import { FastifyInstance } from 'fastify'
import { db, clearAllTables } from '@concentrate/database'

describe('Student Routes', () => {
  let app: FastifyInstance
  let studentToken: string
  let studentId: string
  let teacherId: string
  let classId: string
  let assignmentId: string
  let submissionId: string

  beforeEach(async () => {
    // Clear all mocks before each test to ensure clean state
    vi.clearAllMocks()

    await clearAllTables(db)
    app = await buildApp()

    // Create teacher
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

    // Create class as teacher
    const classResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/teacher/classes',
      cookies: { access_token: teacherToken },
      payload: {
        name: 'Math 101',
        description: 'Test class',
      },
    })
    const classBody = JSON.parse(classResponse.body)
    classId = classBody.class.id

    // Create student and get token
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
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/auth/login',
      payload: {
        email: 'student@test.com',
        password: 'Student123!',
      },
    })
    const cookies = loginResponse.cookies
    studentToken = cookies.find((c) => c.name === 'access_token')?.value || ''

    // Enroll student in class
    await app.inject({
      method: 'POST',
      url: `/api/v0/teacher/classes/${classId}/students`,
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
        classId: classId,
        title: 'Homework 1',
        description: 'Complete chapter 1',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    })
    const assignmentBody = JSON.parse(assignmentResponse.body)
    assignmentId = assignmentBody.assignment.id
  })

  afterEach(async () => {
    // Restore all mocks to ensure no spy leaks between tests
    vi.restoreAllMocks()

    if (app) {
      await app.close()
    }
    await clearAllTables(db)
  })

  describe('GET /api/v0/student/classes', () => {
    it('should get enrolled classes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/student/classes',
        cookies: { access_token: studentToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.classes.length).toBe(1)
      expect(body.classes[0].name).toBe('Math 101')
    })
  })

  describe('GET /api/v0/student/assignments', () => {
    it('should get all assignments for student', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/student/assignments',
        cookies: { access_token: studentToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.assignments.length).toBeGreaterThanOrEqual(1)
      expect(body.assignments[0].title).toBe('Homework 1')
    })
  })

  describe('GET /api/v0/student/assignments/:id', () => {
    it('should get assignment details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v0/student/assignments/${assignmentId}`,
        cookies: { access_token: studentToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.assignment.title).toBe('Homework 1')
    })
  })

  describe('POST /api/v0/student/submissions', () => {
    it('should submit an assignment', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/student/submissions',
        cookies: { access_token: studentToken },
        payload: {
          assignmentId: assignmentId,
          content: 'My submission content',
          fileUrl: 'https://example.com/file.pdf',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.submission.content).toBe('My submission content')
      expect(body.submission.student_id).toBe(studentId)
      submissionId = body.submission.id
    })

    it('should submit without file URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/student/submissions',
        cookies: { access_token: studentToken },
        payload: {
          assignmentId: assignmentId,
          content: 'My submission without file',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.submission.content).toBe('My submission without file')
    })

    it('should return 400 when assignmentId is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/student/submissions',
        cookies: { access_token: studentToken },
        payload: {
          content: 'Test submission',
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('PUT /api/v0/student/submissions/:id', () => {
    beforeEach(async () => {
      // Create a submission
      const response = await app.inject({
        method: 'POST',
        url: '/api/v0/student/submissions',
        cookies: { access_token: studentToken },
        payload: {
          assignmentId: assignmentId,
          content: 'Original content',
        },
      })
      const body = JSON.parse(response.body)
      submissionId = body.submission.id
    })

    it('should update submission', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v0/student/submissions/${submissionId}`,
        cookies: { access_token: studentToken },
        payload: {
          content: 'Updated content',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.submission.content).toBe('Updated content')
    })

    it('should return 404 for non-existent submission', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v0/student/submissions/${fakeId}`,
        cookies: { access_token: studentToken },
        payload: {
          content: 'Updated content',
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('GET /api/v0/student/grades', () => {
    it('should get empty grades list when no submissions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/student/grades',
        cookies: { access_token: studentToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body.grades)).toBe(true)
    })

    it('should get grades after submission is graded', async () => {
      // Submit assignment
      const submitResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/student/submissions',
        cookies: { access_token: studentToken },
        payload: {
          assignmentId: assignmentId,
          content: 'Test submission',
        },
      })
      const submitBody = JSON.parse(submitResponse.body)
      submissionId = submitBody.submission.id

      // Grade it as teacher
      const teacherLogin = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'teacher@test.com',
          password: 'Teacher123!',
        },
      })
      const teacherToken = teacherLogin.cookies.find((c) => c.name === 'access_token')?.value || ''

      await app.inject({
        method: 'POST',
        url: `/api/v0/teacher/submissions/${submissionId}/grade`,
        cookies: { access_token: teacherToken },
        payload: {
          grade: 95,
          feedback: 'Great work!',
        },
      })

      // Get grades
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/student/grades',
        cookies: { access_token: studentToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.grades.length).toBe(1)
      expect(Number(body.grades[0].grade.grade)).toBe(95)
    })

    it('should handle grade fetch errors gracefully', async () => {
      // Import AssignmentService locally to avoid module-level side effects
      const { AssignmentService } = await import('@concentrate/services')

      // Submit an assignment without grading it
      const submitResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/student/submissions',
        cookies: { access_token: studentToken },
        payload: {
          assignmentId: assignmentId,
          content: 'Ungraded submission',
        },
      })

      expect(submitResponse.statusCode).toBe(201)

      // Spy on getGrade to make it throw an error (testing catch block)
      const getGradeSpy = vi
        .spyOn(AssignmentService.prototype, 'getGrade')
        .mockRejectedValueOnce(new Error('Database connection failed'))

      // Get all grades - should catch error and filter out failed grade
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/student/grades',
        cookies: { access_token: studentToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      // Should filter out submissions with null grades (from the error)
      expect(Array.isArray(body.grades)).toBe(true)
      expect(body.grades.length).toBe(0) // Filtered out because grade was null

      // Restore the spy
      getGradeSpy.mockRestore()
    })
  })

  describe('GET /api/v0/student/grades/:id', () => {
    it('should return grade details by ID', async () => {
      // Create and grade a submission first
      const submitResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/student/submissions',
        cookies: { access_token: studentToken },
        payload: {
          assignmentId: assignmentId,
          content: 'Test submission for grade lookup',
        },
      })
      const submitBody = JSON.parse(submitResponse.body)
      const newSubmissionId = submitBody.submission.id

      // Grade it as teacher
      const teacherLogin = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'teacher@test.com',
          password: 'Teacher123!',
        },
      })
      const teacherToken = teacherLogin.cookies.find((c) => c.name === 'access_token')?.value || ''

      const gradeResponse = await app.inject({
        method: 'POST',
        url: `/api/v0/teacher/submissions/${newSubmissionId}/grade`,
        cookies: { access_token: teacherToken },
        payload: {
          grade: 88,
          feedback: 'Good job!',
        },
      })
      const gradeBody = JSON.parse(gradeResponse.body)
      const gradeId = gradeBody.grade.id

      // Get grade by ID
      const response = await app.inject({
        method: 'GET',
        url: `/api/v0/student/grades/${gradeId}`,
        cookies: { access_token: studentToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.grade).toBeDefined()
      expect(body.grade.id).toBe(gradeId)
      expect(Number(body.grade.grade)).toBe(88)
    })

    it('should return 404 for non-existent grade', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await app.inject({
        method: 'GET',
        url: `/api/v0/student/grades/${fakeId}`,
        cookies: { access_token: studentToken },
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
