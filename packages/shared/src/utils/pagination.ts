/**
 * Pagination utility functions for database queries and API responses
 */

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * Pagination result with data and metadata
 */
export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * Calculate pagination metadata
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @param totalItems - Total number of items
 * @returns Pagination metadata
 *
 * @example
 * ```typescript
 * const meta = calculatePagination(2, 10, 45)
 * // Returns:
 * // {
 * //   page: 2,
 * //   limit: 10,
 * //   totalItems: 45,
 * //   totalPages: 5,
 * //   hasNextPage: true,
 * //   hasPrevPage: true
 * // }
 * ```
 */
export function calculatePagination(
  page: number,
  limit: number,
  totalItems: number
): PaginationMeta {
  // Validate inputs
  if (typeof page !== 'number' || page < 1 || !Number.isInteger(page)) {
    throw new Error('Page must be a positive integer')
  }

  if (typeof limit !== 'number' || limit < 1 || !Number.isInteger(limit)) {
    throw new Error('Limit must be a positive integer')
  }

  if (typeof totalItems !== 'number' || totalItems < 0 || !Number.isInteger(totalItems)) {
    throw new Error('Total items must be a non-negative integer')
  }

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / limit)

  // Calculate navigation flags
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
  }
}

/**
 * Calculate database query offset from page number
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @returns Offset for database OFFSET clause
 *
 * @example
 * ```typescript
 * const offset = calculateOffset(3, 10)
 * // Returns: 20 (skip first 20 items to get page 3)
 *
 * // Usage in database query:
 * db.selectFrom('users')
 *   .selectAll()
 *   .limit(limit)
 *   .offset(calculateOffset(page, limit))
 *   .execute()
 * ```
 */
export function calculateOffset(page: number, limit: number): number {
  // Validate inputs
  if (typeof page !== 'number' || page < 1 || !Number.isInteger(page)) {
    throw new Error('Page must be a positive integer')
  }

  if (typeof limit !== 'number' || limit < 1 || !Number.isInteger(limit)) {
    throw new Error('Limit must be a positive integer')
  }

  return (page - 1) * limit
}

/**
 * Create a paginated result object
 *
 * @param data - Array of items for current page
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalItems - Total number of items
 * @returns Paginated result with data and metadata
 *
 * @example
 * ```typescript
 * const users = await db.selectFrom('users').limit(10).offset(20).execute()
 * const result = createPaginatedResult(users, 3, 10, 45)
 * ```
 */
export function createPaginatedResult<T>(
  data: T[],
  page: number,
  limit: number,
  totalItems: number
): PaginatedResult<T> {
  const meta = calculatePagination(page, limit, totalItems)

  return {
    data,
    meta,
  }
}

/**
 * Validate and normalize pagination parameters
 *
 * @param page - Page number (defaults to 1)
 * @param limit - Items per page (defaults to 10)
 * @param maxLimit - Maximum allowed limit (defaults to 100)
 * @returns Normalized pagination parameters
 *
 * @example
 * ```typescript
 * const { page, limit } = normalizePaginationParams(0, 500)
 * // Returns: { page: 1, limit: 100 }
 * ```
 */
export function normalizePaginationParams(
  page?: number | string,
  limit?: number | string,
  maxLimit = 100
): { page: number; limit: number } {
  // Parse and validate page
  let normalizedPage = 1
  if (page !== undefined) {
    const parsedPage = typeof page === 'string' ? parseInt(page, 10) : page
    if (!isNaN(parsedPage) && parsedPage > 0 && Number.isInteger(parsedPage)) {
      normalizedPage = parsedPage
    }
  }

  // Parse and validate limit
  let normalizedLimit = 10
  if (limit !== undefined) {
    const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit
    if (!isNaN(parsedLimit) && parsedLimit > 0 && Number.isInteger(parsedLimit)) {
      normalizedLimit = Math.min(parsedLimit, maxLimit)
    }
  }

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  }
}
