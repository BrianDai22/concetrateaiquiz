/**
 * Date utility functions for common date operations
 */

/**
 * Format a date to ISO string (YYYY-MM-DD HH:mm:ss)
 *
 * @param date - The date to format
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * const formatted = formatDate(new Date('2024-03-15T10:30:00'))
 * // Returns: "2024-03-15 10:30:00"
 * ```
 */
export function formatDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided')
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Check if a date is in the past
 *
 * @param date - The date to check
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns True if the date is before the reference date
 *
 * @example
 * ```typescript
 * const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
 * isDateInPast(yesterday) // Returns: true
 * ```
 */
export function isDateInPast(date: Date, referenceDate?: Date): boolean {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided')
  }

  const reference = referenceDate ?? new Date()

  if (!(reference instanceof Date) || isNaN(reference.getTime())) {
    throw new Error('Invalid reference date provided')
  }

  return date.getTime() < reference.getTime()
}

/**
 * Check if a date is in the future
 *
 * @param date - The date to check
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns True if the date is after the reference date
 *
 * @example
 * ```typescript
 * const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
 * isDateInFuture(tomorrow) // Returns: true
 * ```
 */
export function isDateInFuture(date: Date, referenceDate?: Date): boolean {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided')
  }

  const reference = referenceDate ?? new Date()

  if (!(reference instanceof Date) || isNaN(reference.getTime())) {
    throw new Error('Invalid reference date provided')
  }

  return date.getTime() > reference.getTime()
}

/**
 * Add days to a date
 *
 * @param date - The starting date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 *
 * @example
 * ```typescript
 * const today = new Date('2024-03-15')
 * const nextWeek = addDays(today, 7)
 * const lastWeek = addDays(today, -7)
 * ```
 */
export function addDays(date: Date, days: number): Date {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided')
  }

  if (typeof days !== 'number' || isNaN(days)) {
    throw new Error('Days must be a valid number')
  }

  const result = new Date(date)
  result.setDate(result.getDate() + days)

  return result
}

/**
 * Add hours to a date
 *
 * @param date - The starting date
 * @param hours - Number of hours to add (can be negative)
 * @returns New date with hours added
 *
 * @example
 * ```typescript
 * const now = new Date()
 * const nextHour = addHours(now, 1)
 * const lastHour = addHours(now, -1)
 * ```
 */
export function addHours(date: Date, hours: number): Date {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided')
  }

  if (typeof hours !== 'number' || isNaN(hours)) {
    throw new Error('Hours must be a valid number')
  }

  const result = new Date(date)
  result.setHours(result.getHours() + hours)

  return result
}

/**
 * Check if two dates are on the same day
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are on the same day (ignoring time)
 *
 * @example
 * ```typescript
 * const morning = new Date('2024-03-15T08:00:00')
 * const evening = new Date('2024-03-15T20:00:00')
 * isSameDay(morning, evening) // Returns: true
 * ```
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  if (!(date1 instanceof Date) || isNaN(date1.getTime())) {
    throw new Error('Invalid first date provided')
  }

  if (!(date2 instanceof Date) || isNaN(date2.getTime())) {
    throw new Error('Invalid second date provided')
  }

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}
