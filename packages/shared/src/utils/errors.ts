/**
 * Custom error classes for consistent error handling throughout the application
 */

import { ERROR_CODES, getStatusCode, type ErrorCode } from '../constants/errors'

/**
 * Base application error class
 * Extends Error with error code and HTTP status code
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number

  constructor(
    code: ErrorCode,
    message: string,
    statusCode?: number
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode ?? getStatusCode(code)

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace !== undefined) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * Validation error - used when input validation fails
 * HTTP 400 Bad Request
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.VALIDATION_ERROR, message)
    this.name = 'ValidationError'
  }
}

/**
 * Not found error - used when a requested resource doesn't exist
 * HTTP 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(ERROR_CODES.NOT_FOUND, `${resource} not found`)
    this.name = 'NotFoundError'
  }
}

/**
 * Unauthorized error - used when authentication is required or fails
 * HTTP 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(ERROR_CODES.UNAUTHORIZED, message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Forbidden error - used when user doesn't have permission
 * HTTP 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(ERROR_CODES.FORBIDDEN, message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Conflict error - used when there's a conflict with existing data
 * HTTP 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.CONFLICT, message)
    this.name = 'ConflictError'
  }
}

/**
 * Database error - used when database operations fail
 * HTTP 500 Internal Server Error
 */
export class DatabaseError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.DATABASE_ERROR, message)
    this.name = 'DatabaseError'
  }
}

/**
 * Invalid credentials error - used when login credentials are incorrect
 * HTTP 401 Unauthorized
 */
export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid credentials') {
    super(ERROR_CODES.INVALID_CREDENTIALS, message)
    this.name = 'InvalidCredentialsError'
  }
}

/**
 * Token expired error - used when JWT token has expired
 * HTTP 401 Unauthorized
 */
export class TokenExpiredError extends AppError {
  constructor(message = 'Token expired') {
    super(ERROR_CODES.TOKEN_EXPIRED, message)
    this.name = 'TokenExpiredError'
  }
}

/**
 * Token invalid error - used when JWT token is malformed or invalid
 * HTTP 401 Unauthorized
 */
export class TokenInvalidError extends AppError {
  constructor(message = 'Token invalid') {
    super(ERROR_CODES.TOKEN_INVALID, message)
    this.name = 'TokenInvalidError'
  }
}

/**
 * Already exists error - used when trying to create a duplicate resource
 * HTTP 409 Conflict
 */
export class AlreadyExistsError extends AppError {
  constructor(resource: string) {
    super(ERROR_CODES.ALREADY_EXISTS, `${resource} already exists`)
    this.name = 'AlreadyExistsError'
  }
}

/**
 * Invalid state error - used when operation is not valid in current state
 * HTTP 400 Bad Request
 */
export class InvalidStateError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.INVALID_STATE, message)
    this.name = 'InvalidStateError'
  }
}

/**
 * Insufficient permissions error - used when user lacks required permissions
 * HTTP 403 Forbidden
 */
export class InsufficientPermissionsError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(ERROR_CODES.INSUFFICIENT_PERMISSIONS, message)
    this.name = 'InsufficientPermissionsError'
  }
}
