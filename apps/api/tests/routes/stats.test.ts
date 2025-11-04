import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildApp } from '../../src/app.js'
import { FastifyInstance } from 'fastify'
import { db, clearAllTables } from '@concentrate/database'

describe('Stats Routes (Public)', () => {
  let app: FastifyInstance
  let teacherToken: string
  let studentId: string
  let classId: string
  let assignmentId: string

  beforeEach(async () => {
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
    teacherToken = teacherCookies.find((c) => c.name === 'access_token')?.value || ''

    // Create class
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

    // Create student
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

    // Enroll student
    await app.inject({
      method: 'POST',
      url: `/api/v0/teacher/classes/${classId}/students`,
      cookies: { access_token: teacherToken },
      payload: {
        studentId: studentId,
      },
    })

    // Create assignment
    const assignmentResponse = await app.inject({
      method: 'POST',
      url: '/api/v0/teacher/assignments',
      cookies: { access_token: teacherToken },
      payload: {
        classId: classId,
        title: 'Homework 1',
        description: 'Test assignment',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    })
    const assignmentBody = JSON.parse(assignmentResponse.body)
    assignmentId = assignmentBody.assignment.id
  })

  afterEach(async () => {
    if (app) {
      await app.close()
    }
    await clearAllTables(db)
  })

  describe('GET /api/v0/stats/average-grades', () => {
    it('should return zero when no grades exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/stats/average-grades',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.average).toBe(0)
      expect(body.count).toBe(0)
    })

    it('should calculate average grade across all classes', async () => {
      // Login student
      const studentLogin = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'student@test.com',
          password: 'Student123!',
        },
      })
      const studentToken = studentLogin.cookies.find((c) => c.name === 'access_token')?.value || ''

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
      const submissionId = submitBody.submission.id

      // Grade submission
      await app.inject({
        method: 'POST',
        url: `/api/v0/teacher/submissions/${submissionId}/grade`,
        cookies: { access_token: teacherToken },
        payload: {
          grade: 85,
          feedback: 'Good work',
        },
      })

      // Get average
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/stats/average-grades',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.count).toBe(1)
      expect(Number(body.average)).toBeCloseTo(85, 1)
    })
  })

  describe('GET /api/v0/stats/average-grades/:id', () => {
    it('should return zero for class with no grades', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v0/stats/average-grades/${classId}`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.average).toBe(0)
      expect(body.count).toBe(0)
    })

    it('should calculate average for specific class', async () => {
      // Login student and submit
      const studentLogin = await app.inject({
        method: 'POST',
        url: '/api/v0/auth/login',
        payload: {
          email: 'student@test.com',
          password: 'Student123!',
        },
      })
      const studentToken = studentLogin.cookies.find((c) => c.name === 'access_token')?.value || ''

      const submitResponse = await app.inject({
        method: 'POST',
        url: '/api/v0/student/submissions',
        cookies: { access_token: studentToken },
        payload: {
          assignmentId: assignmentId,
          content: 'Test',
        },
      })
      const submissionId = JSON.parse(submitResponse.body).submission.id

      await app.inject({
        method: 'POST',
        url: `/api/v0/teacher/submissions/${submissionId}/grade`,
        cookies: { access_token: teacherToken },
        payload: { grade: 90 },
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/v0/stats/average-grades/${classId}`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.count).toBe(1)
      expect(Number(body.average)).toBeCloseTo(90, 1)
    })
  })

  describe('GET /api/v0/stats/teacher-names', () => {
    it('should list all teacher names', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/stats/teacher-names',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.teachers.length).toBe(1)
      expect(body.teachers[0]).toBe('Teacher User')
      expect(body.count).toBe(1)
    })
  })

  describe('GET /api/v0/stats/student-names', () => {
    it('should list all student names', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/stats/student-names',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.students.length).toBe(1)
      expect(body.students[0]).toBe('Student User')
      expect(body.count).toBe(1)
    })
  })

  describe('GET /api/v0/stats/classes', () => {
    it('should list all classes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v0/stats/classes',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.classes.length).toBe(1)
      expect(body.classes[0].name).toBe('Math 101')
      expect(body.count).toBe(1)
    })
  })

  describe('GET /api/v0/stats/classes/:id', () => {
    it('should list students in a class', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v0/stats/classes/${classId}`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.students.length).toBe(1)
      expect(body.students[0].name).toBe('Student User')
      expect(body.count).toBe(1)
    })
  })
})
