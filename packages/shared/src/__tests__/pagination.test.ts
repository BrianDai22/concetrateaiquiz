import { describe, it, expect } from 'vitest'
import {
  calculatePagination,
  calculateOffset,
  createPaginatedResult,
  normalizePaginationParams,
  type PaginationMeta,
  type PaginatedResult,
} from '../utils/pagination'

describe('calculatePagination', () => {
  it('should calculate pagination for first page', () => {
    const meta = calculatePagination(1, 10, 45)

    expect(meta).toEqual({
      page: 1,
      limit: 10,
      totalItems: 45,
      totalPages: 5,
      hasNextPage: true,
      hasPrevPage: false,
    })
  })

  it('should calculate pagination for middle page', () => {
    const meta = calculatePagination(3, 10, 45)

    expect(meta).toEqual({
      page: 3,
      limit: 10,
      totalItems: 45,
      totalPages: 5,
      hasNextPage: true,
      hasPrevPage: true,
    })
  })

  it('should calculate pagination for last page', () => {
    const meta = calculatePagination(5, 10, 45)

    expect(meta).toEqual({
      page: 5,
      limit: 10,
      totalItems: 45,
      totalPages: 5,
      hasNextPage: false,
      hasPrevPage: true,
    })
  })

  it('should handle exact page boundary', () => {
    const meta = calculatePagination(2, 10, 20)

    expect(meta).toEqual({
      page: 2,
      limit: 10,
      totalItems: 20,
      totalPages: 2,
      hasNextPage: false,
      hasPrevPage: true,
    })
  })

  it('should handle zero total items', () => {
    const meta = calculatePagination(1, 10, 0)

    expect(meta).toEqual({
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    })
  })

  it('should handle single item', () => {
    const meta = calculatePagination(1, 10, 1)

    expect(meta).toEqual({
      page: 1,
      limit: 10,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    })
  })

  it('should throw error for invalid page', () => {
    expect(() => calculatePagination(0, 10, 45)).toThrow('Page must be a positive integer')
    expect(() => calculatePagination(-1, 10, 45)).toThrow('Page must be a positive integer')
    expect(() => calculatePagination(1.5, 10, 45)).toThrow('Page must be a positive integer')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => calculatePagination('1' as any, 10, 45)).toThrow('Page must be a positive integer')
  })

  it('should throw error for invalid limit', () => {
    expect(() => calculatePagination(1, 0, 45)).toThrow('Limit must be a positive integer')
    expect(() => calculatePagination(1, -10, 45)).toThrow('Limit must be a positive integer')
    expect(() => calculatePagination(1, 10.5, 45)).toThrow('Limit must be a positive integer')
  })

  it('should throw error for invalid total items', () => {
    expect(() => calculatePagination(1, 10, -1)).toThrow(
      'Total items must be a non-negative integer'
    )
    expect(() => calculatePagination(1, 10, 45.5)).toThrow(
      'Total items must be a non-negative integer'
    )
  })
})

describe('calculateOffset', () => {
  it('should calculate offset for first page', () => {
    expect(calculateOffset(1, 10)).toBe(0)
  })

  it('should calculate offset for second page', () => {
    expect(calculateOffset(2, 10)).toBe(10)
  })

  it('should calculate offset for third page', () => {
    expect(calculateOffset(3, 10)).toBe(20)
  })

  it('should calculate offset for page 10', () => {
    expect(calculateOffset(10, 10)).toBe(90)
  })

  it('should handle different limit sizes', () => {
    expect(calculateOffset(3, 20)).toBe(40)
    expect(calculateOffset(5, 25)).toBe(100)
  })

  it('should throw error for invalid page', () => {
    expect(() => calculateOffset(0, 10)).toThrow('Page must be a positive integer')
    expect(() => calculateOffset(-1, 10)).toThrow('Page must be a positive integer')
    expect(() => calculateOffset(1.5, 10)).toThrow('Page must be a positive integer')
  })

  it('should throw error for invalid limit', () => {
    expect(() => calculateOffset(1, 0)).toThrow('Limit must be a positive integer')
    expect(() => calculateOffset(1, -10)).toThrow('Limit must be a positive integer')
    expect(() => calculateOffset(1, 10.5)).toThrow('Limit must be a positive integer')
  })
})

describe('createPaginatedResult', () => {
  it('should create paginated result with data', () => {
    const data = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]
    const result = createPaginatedResult(data, 1, 10, 25)

    expect(result.data).toEqual(data)
    expect(result.meta.page).toBe(1)
    expect(result.meta.limit).toBe(10)
    expect(result.meta.totalItems).toBe(25)
    expect(result.meta.totalPages).toBe(3)
  })

  it('should create empty result', () => {
    const result = createPaginatedResult([], 1, 10, 0)

    expect(result.data).toEqual([])
    expect(result.meta.totalItems).toBe(0)
    expect(result.meta.totalPages).toBe(0)
  })

  it('should preserve data types', () => {
    interface User {
      id: number
      name: string
    }

    const users: User[] = [{ id: 1, name: 'Alice' }]
    const result: PaginatedResult<User> = createPaginatedResult(users, 1, 10, 1)

    expect(result.data[0]?.id).toBe(1)
    expect(result.data[0]?.name).toBe('Alice')
  })
})

describe('normalizePaginationParams', () => {
  it('should use defaults when no params provided', () => {
    const { page, limit } = normalizePaginationParams()

    expect(page).toBe(1)
    expect(limit).toBe(10)
  })

  it('should parse valid numeric strings', () => {
    const { page, limit } = normalizePaginationParams('3', '25')

    expect(page).toBe(3)
    expect(limit).toBe(25)
  })

  it('should use valid numbers directly', () => {
    const { page, limit } = normalizePaginationParams(5, 50)

    expect(page).toBe(5)
    expect(limit).toBe(50)
  })

  it('should default to 1 for invalid page', () => {
    expect(normalizePaginationParams('invalid', '10').page).toBe(1)
    expect(normalizePaginationParams(0, 10).page).toBe(1)
    expect(normalizePaginationParams(-5, 10).page).toBe(1)
    expect(normalizePaginationParams(1.5, 10).page).toBe(1)
  })

  it('should default to 10 for invalid limit', () => {
    expect(normalizePaginationParams(1, 'invalid').limit).toBe(10)
    expect(normalizePaginationParams(1, 0).limit).toBe(10)
    expect(normalizePaginationParams(1, -10).limit).toBe(10)
    expect(normalizePaginationParams(1, 10.5).limit).toBe(10)
  })

  it('should enforce max limit', () => {
    const { limit } = normalizePaginationParams(1, 500)

    expect(limit).toBe(100) // Default max limit
  })

  it('should respect custom max limit', () => {
    const { limit } = normalizePaginationParams(1, 500, 200)

    expect(limit).toBe(200)
  })

  it('should not enforce max limit if under threshold', () => {
    const { limit } = normalizePaginationParams(1, 50, 100)

    expect(limit).toBe(50)
  })

  it('should handle undefined params', () => {
    const { page, limit } = normalizePaginationParams(undefined, undefined)

    expect(page).toBe(1)
    expect(limit).toBe(10)
  })

  it('should handle mixed valid and invalid params', () => {
    const result1 = normalizePaginationParams('5', 'invalid')
    expect(result1.page).toBe(5)
    expect(result1.limit).toBe(10)

    const result2 = normalizePaginationParams('invalid', '20')
    expect(result2.page).toBe(1)
    expect(result2.limit).toBe(20)
  })
})

describe('pagination type safety', () => {
  it('should have correct PaginationMeta type', () => {
    const meta: PaginationMeta = {
      page: 1,
      limit: 10,
      totalItems: 100,
      totalPages: 10,
      hasNextPage: true,
      hasPrevPage: false,
    }

    expect(meta).toBeDefined()
  })

  it('should have correct PaginatedResult type', () => {
    const result: PaginatedResult<{ id: number }> = {
      data: [{ id: 1 }],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }

    expect(result).toBeDefined()
  })
})
