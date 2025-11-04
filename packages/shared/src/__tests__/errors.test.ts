import { describe, it, expect } from 'vitest'
import { ERROR_CODES, getStatusCode } from '../constants/errors'
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError,
  InvalidCredentialsError,
  TokenExpiredError,
  TokenInvalidError,
  AlreadyExistsError,
  InvalidStateError,
  InsufficientPermissionsError,
} from '../utils/errors'

describe('AppError', () => {
  it('should create an error with code and message', () => {
    const error = new AppError(ERROR_CODES.INTERNAL_ERROR, 'Test error message')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
    expect(error.message).toBe('Test error message')
    expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR)
    expect(error.name).toBe('AppError')
  })

  it('should use default status code from error code', () => {
    const error = new AppError(ERROR_CODES.NOT_FOUND, 'Resource not found')

    expect(error.statusCode).toBe(404)
  })

  it('should allow custom status code override', () => {
    const error = new AppError(ERROR_CODES.INTERNAL_ERROR, 'Test error', 503)

    expect(error.statusCode).toBe(503)
  })

  it('should have a stack trace', () => {
    const error = new AppError(ERROR_CODES.INTERNAL_ERROR, 'Test error')

    expect(error.stack).toBeDefined()
    expect(typeof error.stack).toBe('string')
  })

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Test error')
    }).toThrow(AppError)

    try {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Test error')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      if (error instanceof AppError) {
        expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR)
      }
    }
  })
})

describe('ValidationError', () => {
  it('should create a validation error', () => {
    const error = new ValidationError('Invalid email format')

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(ValidationError)
    expect(error.message).toBe('Invalid email format')
    expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    expect(error.statusCode).toBe(400)
    expect(error.name).toBe('ValidationError')
  })

  it('should use correct status code', () => {
    const error = new ValidationError('Test validation error')

    expect(error.statusCode).toBe(getStatusCode(ERROR_CODES.VALIDATION_ERROR))
  })
})

describe('NotFoundError', () => {
  it('should create a not found error', () => {
    const error = new NotFoundError('User')

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(NotFoundError)
    expect(error.message).toBe('User not found')
    expect(error.code).toBe(ERROR_CODES.NOT_FOUND)
    expect(error.statusCode).toBe(404)
    expect(error.name).toBe('NotFoundError')
  })

  it('should format resource name correctly', () => {
    const error = new NotFoundError('Class')

    expect(error.message).toBe('Class not found')
  })
})

describe('UnauthorizedError', () => {
  it('should create an unauthorized error with default message', () => {
    const error = new UnauthorizedError()

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(UnauthorizedError)
    expect(error.message).toBe('Unauthorized')
    expect(error.code).toBe(ERROR_CODES.UNAUTHORIZED)
    expect(error.statusCode).toBe(401)
    expect(error.name).toBe('UnauthorizedError')
  })

  it('should create an unauthorized error with custom message', () => {
    const error = new UnauthorizedError('Missing authentication token')

    expect(error.message).toBe('Missing authentication token')
  })
})

describe('ForbiddenError', () => {
  it('should create a forbidden error with default message', () => {
    const error = new ForbiddenError()

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(ForbiddenError)
    expect(error.message).toBe('Forbidden')
    expect(error.code).toBe(ERROR_CODES.FORBIDDEN)
    expect(error.statusCode).toBe(403)
    expect(error.name).toBe('ForbiddenError')
  })

  it('should create a forbidden error with custom message', () => {
    const error = new ForbiddenError('Access denied to admin resources')

    expect(error.message).toBe('Access denied to admin resources')
  })
})

describe('ConflictError', () => {
  it('should create a conflict error', () => {
    const error = new ConflictError('Email already in use')

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(ConflictError)
    expect(error.message).toBe('Email already in use')
    expect(error.code).toBe(ERROR_CODES.CONFLICT)
    expect(error.statusCode).toBe(409)
    expect(error.name).toBe('ConflictError')
  })
})

describe('DatabaseError', () => {
  it('should create a database error', () => {
    const error = new DatabaseError('Connection failed')

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(DatabaseError)
    expect(error.message).toBe('Connection failed')
    expect(error.code).toBe(ERROR_CODES.DATABASE_ERROR)
    expect(error.statusCode).toBe(500)
    expect(error.name).toBe('DatabaseError')
  })
})

describe('InvalidCredentialsError', () => {
  it('should create an invalid credentials error with default message', () => {
    const error = new InvalidCredentialsError()

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(InvalidCredentialsError)
    expect(error.message).toBe('Invalid credentials')
    expect(error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS)
    expect(error.statusCode).toBe(401)
    expect(error.name).toBe('InvalidCredentialsError')
  })

  it('should create an invalid credentials error with custom message', () => {
    const error = new InvalidCredentialsError('Incorrect password')

    expect(error.message).toBe('Incorrect password')
  })
})

describe('TokenExpiredError', () => {
  it('should create a token expired error with default message', () => {
    const error = new TokenExpiredError()

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(TokenExpiredError)
    expect(error.message).toBe('Token expired')
    expect(error.code).toBe(ERROR_CODES.TOKEN_EXPIRED)
    expect(error.statusCode).toBe(401)
    expect(error.name).toBe('TokenExpiredError')
  })

  it('should create a token expired error with custom message', () => {
    const error = new TokenExpiredError('Access token has expired')

    expect(error.message).toBe('Access token has expired')
  })
})

describe('TokenInvalidError', () => {
  it('should create a token invalid error with default message', () => {
    const error = new TokenInvalidError()

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(TokenInvalidError)
    expect(error.message).toBe('Token invalid')
    expect(error.code).toBe(ERROR_CODES.TOKEN_INVALID)
    expect(error.statusCode).toBe(401)
    expect(error.name).toBe('TokenInvalidError')
  })

  it('should create a token invalid error with custom message', () => {
    const error = new TokenInvalidError('Malformed JWT token')

    expect(error.message).toBe('Malformed JWT token')
  })
})

describe('AlreadyExistsError', () => {
  it('should create an already exists error', () => {
    const error = new AlreadyExistsError('User')

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(AlreadyExistsError)
    expect(error.message).toBe('User already exists')
    expect(error.code).toBe(ERROR_CODES.ALREADY_EXISTS)
    expect(error.statusCode).toBe(409)
    expect(error.name).toBe('AlreadyExistsError')
  })

  it('should format resource name correctly', () => {
    const error = new AlreadyExistsError('Email')

    expect(error.message).toBe('Email already exists')
  })
})

describe('InvalidStateError', () => {
  it('should create an invalid state error', () => {
    const error = new InvalidStateError('Cannot submit assignment after deadline')

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(InvalidStateError)
    expect(error.message).toBe('Cannot submit assignment after deadline')
    expect(error.code).toBe(ERROR_CODES.INVALID_STATE)
    expect(error.statusCode).toBe(400)
    expect(error.name).toBe('InvalidStateError')
  })
})

describe('InsufficientPermissionsError', () => {
  it('should create an insufficient permissions error with default message', () => {
    const error = new InsufficientPermissionsError()

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(InsufficientPermissionsError)
    expect(error.message).toBe('Insufficient permissions')
    expect(error.code).toBe(ERROR_CODES.INSUFFICIENT_PERMISSIONS)
    expect(error.statusCode).toBe(403)
    expect(error.name).toBe('InsufficientPermissionsError')
  })

  it('should create an insufficient permissions error with custom message', () => {
    const error = new InsufficientPermissionsError('Teacher role required')

    expect(error.message).toBe('Teacher role required')
  })
})

describe('Error hierarchy', () => {
  it('should maintain proper error instance checks', () => {
    const validationError = new ValidationError('Test')
    const notFoundError = new NotFoundError('Test')
    const unauthorizedError = new UnauthorizedError()

    expect(validationError).toBeInstanceOf(Error)
    expect(validationError).toBeInstanceOf(AppError)
    expect(validationError).toBeInstanceOf(ValidationError)

    expect(notFoundError).toBeInstanceOf(Error)
    expect(notFoundError).toBeInstanceOf(AppError)
    expect(notFoundError).toBeInstanceOf(NotFoundError)

    expect(unauthorizedError).toBeInstanceOf(Error)
    expect(unauthorizedError).toBeInstanceOf(AppError)
    expect(unauthorizedError).toBeInstanceOf(UnauthorizedError)
  })

  it('should not be instances of other error types', () => {
    const validationError = new ValidationError('Test')

    expect(validationError).not.toBeInstanceOf(NotFoundError)
    expect(validationError).not.toBeInstanceOf(UnauthorizedError)
  })
})

describe('Error code mapping', () => {
  it('should map all custom errors to correct error codes', () => {
    const errors = [
      { error: new ValidationError('Test'), code: ERROR_CODES.VALIDATION_ERROR },
      { error: new NotFoundError('Test'), code: ERROR_CODES.NOT_FOUND },
      { error: new UnauthorizedError(), code: ERROR_CODES.UNAUTHORIZED },
      { error: new ForbiddenError(), code: ERROR_CODES.FORBIDDEN },
      { error: new ConflictError('Test'), code: ERROR_CODES.CONFLICT },
      { error: new DatabaseError('Test'), code: ERROR_CODES.DATABASE_ERROR },
      { error: new InvalidCredentialsError(), code: ERROR_CODES.INVALID_CREDENTIALS },
      { error: new TokenExpiredError(), code: ERROR_CODES.TOKEN_EXPIRED },
      { error: new TokenInvalidError(), code: ERROR_CODES.TOKEN_INVALID },
      { error: new AlreadyExistsError('Test'), code: ERROR_CODES.ALREADY_EXISTS },
      { error: new InvalidStateError('Test'), code: ERROR_CODES.INVALID_STATE },
      { error: new InsufficientPermissionsError(), code: ERROR_CODES.INSUFFICIENT_PERMISSIONS },
    ]

    errors.forEach(({ error, code }) => {
      expect(error.code).toBe(code)
    })
  })

  it('should map all custom errors to correct status codes', () => {
    const errors = [
      { error: new ValidationError('Test'), status: 400 },
      { error: new NotFoundError('Test'), status: 404 },
      { error: new UnauthorizedError(), status: 401 },
      { error: new ForbiddenError(), status: 403 },
      { error: new ConflictError('Test'), status: 409 },
      { error: new DatabaseError('Test'), status: 500 },
      { error: new InvalidCredentialsError(), status: 401 },
      { error: new TokenExpiredError(), status: 401 },
      { error: new TokenInvalidError(), status: 401 },
      { error: new AlreadyExistsError('Test'), status: 409 },
      { error: new InvalidStateError('Test'), status: 400 },
      { error: new InsufficientPermissionsError(), status: 403 },
    ]

    errors.forEach(({ error, status }) => {
      expect(error.statusCode).toBe(status)
    })
  })
})
