import { describe, it, expect } from 'vitest'
import {
  USER_ROLES,
  type UserRole,
  ROLE_PERMISSIONS,
  hasPermission,
  getPermissions,
  ERROR_CODES,
  type ErrorCode,
  getStatusCode,
} from '../index'

describe('User Roles', () => {
  it('should have correct role values', () => {
    expect(USER_ROLES.ADMIN).toBe('admin')
    expect(USER_ROLES.TEACHER).toBe('teacher')
    expect(USER_ROLES.STUDENT).toBe('student')
  })

  it('should type check UserRole correctly', () => {
    const adminRole: UserRole = 'admin'
    const teacherRole: UserRole = 'teacher'
    const studentRole: UserRole = 'student'

    expect(adminRole).toBe('admin')
    expect(teacherRole).toBe('teacher')
    expect(studentRole).toBe('student')
  })
})

describe('Role Permissions', () => {
  it('should have permissions for all roles', () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.ADMIN]).toBeDefined()
    expect(ROLE_PERMISSIONS[USER_ROLES.TEACHER]).toBeDefined()
    expect(ROLE_PERMISSIONS[USER_ROLES.STUDENT]).toBeDefined()
  })

  it('admin should have user management permissions', () => {
    const adminPermissions = ROLE_PERMISSIONS[USER_ROLES.ADMIN]
    expect(adminPermissions).toContain('users:create')
    expect(adminPermissions).toContain('users:read')
    expect(adminPermissions).toContain('users:update')
    expect(adminPermissions).toContain('users:delete')
    expect(adminPermissions).toContain('users:suspend')
  })

  it('teacher should have class management permissions', () => {
    const teacherPermissions = ROLE_PERMISSIONS[USER_ROLES.TEACHER]
    expect(teacherPermissions).toContain('classes:create')
    expect(teacherPermissions).toContain('assignments:create')
    expect(teacherPermissions).toContain('grades:create')
  })

  it('student should have limited permissions', () => {
    const studentPermissions = ROLE_PERMISSIONS[USER_ROLES.STUDENT]
    expect(studentPermissions).toContain('classes:read_enrolled')
    expect(studentPermissions).toContain('submissions:create_own')
    expect(studentPermissions).not.toContain('users:create')
  })

  it('should check permissions correctly with hasPermission', () => {
    expect(hasPermission(USER_ROLES.ADMIN, 'users:create')).toBe(true)
    expect(hasPermission(USER_ROLES.TEACHER, 'classes:create')).toBe(true)
    expect(hasPermission(USER_ROLES.STUDENT, 'users:create')).toBe(false)
    expect(hasPermission(USER_ROLES.STUDENT, 'submissions:create_own')).toBe(true)
  })

  it('should get all permissions for a role', () => {
    const adminPermissions = getPermissions(USER_ROLES.ADMIN)
    const teacherPermissions = getPermissions(USER_ROLES.TEACHER)
    const studentPermissions = getPermissions(USER_ROLES.STUDENT)

    expect(adminPermissions.length).toBeGreaterThan(0)
    expect(teacherPermissions.length).toBeGreaterThan(0)
    expect(studentPermissions.length).toBeGreaterThan(0)

    expect(adminPermissions).toContain('users:create')
    expect(teacherPermissions).toContain('classes:create')
    expect(studentPermissions).toContain('classes:read_enrolled')
  })
})

describe('Error Codes', () => {
  it('should have all error code categories', () => {
    // Validation
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
    expect(ERROR_CODES.INVALID_INPUT).toBe('INVALID_INPUT')

    // Authentication
    expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED')
    expect(ERROR_CODES.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS')

    // Authorization
    expect(ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN')

    // Resources
    expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND')

    // System
    expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
  })

  it('should type check ErrorCode correctly', () => {
    const validationError: ErrorCode = 'VALIDATION_ERROR'
    const notFoundError: ErrorCode = 'NOT_FOUND'

    expect(validationError).toBe('VALIDATION_ERROR')
    expect(notFoundError).toBe('NOT_FOUND')
  })

  it('should return correct HTTP status codes', () => {
    expect(getStatusCode(ERROR_CODES.VALIDATION_ERROR)).toBe(400)
    expect(getStatusCode(ERROR_CODES.UNAUTHORIZED)).toBe(401)
    expect(getStatusCode(ERROR_CODES.FORBIDDEN)).toBe(403)
    expect(getStatusCode(ERROR_CODES.NOT_FOUND)).toBe(404)
    expect(getStatusCode(ERROR_CODES.CONFLICT)).toBe(409)
    expect(getStatusCode(ERROR_CODES.INTERNAL_ERROR)).toBe(500)
    expect(getStatusCode(ERROR_CODES.EXTERNAL_SERVICE_ERROR)).toBe(502)
  })

  it('should map all error codes to status codes', () => {
    const errorCodes = Object.values(ERROR_CODES)

    errorCodes.forEach((code) => {
      const statusCode = getStatusCode(code)
      expect(statusCode).toBeGreaterThanOrEqual(400)
      expect(statusCode).toBeLessThan(600)
    })
  })
})
