import { describe, it, expect } from 'vitest'
import {
  formatDate,
  isDateInPast,
  isDateInFuture,
  addDays,
  addHours,
  isSameDay,
} from '../utils/date'

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-03-15T10:30:45')
    const formatted = formatDate(date)

    expect(formatted).toBe('2024-03-15 10:30:45')
  })

  it('should pad single-digit months', () => {
    const date = new Date('2024-01-05T08:09:07')
    const formatted = formatDate(date)

    expect(formatted).toBe('2024-01-05 08:09:07')
  })

  it('should handle dates at midnight', () => {
    const date = new Date('2024-12-25T00:00:00')
    const formatted = formatDate(date)

    expect(formatted).toBe('2024-12-25 00:00:00')
  })

  it('should handle dates at end of day', () => {
    const date = new Date('2024-06-30T23:59:59')
    const formatted = formatDate(date)

    expect(formatted).toBe('2024-06-30 23:59:59')
  })

  it('should throw error for invalid date', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => formatDate(new Date('invalid'))).toThrow('Invalid date provided')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => formatDate('not a date' as any)).toThrow('Invalid date provided')
  })
})

describe('isDateInPast', () => {
  it('should return true for past dates', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    expect(isDateInPast(pastDate)).toBe(true)
  })

  it('should return false for future dates', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
    expect(isDateInPast(futureDate)).toBe(false)
  })

  it('should work with custom reference date', () => {
    const date = new Date('2024-03-15')
    const referenceDate = new Date('2024-03-20')

    expect(isDateInPast(date, referenceDate)).toBe(true)
  })

  it('should return false when date equals reference date', () => {
    const date = new Date('2024-03-15T12:00:00')
    const referenceDate = new Date('2024-03-15T12:00:00')

    expect(isDateInPast(date, referenceDate)).toBe(false)
  })

  it('should throw error for invalid date', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => isDateInPast(new Date('invalid'))).toThrow('Invalid date provided')
  })

  it('should throw error for invalid reference date', () => {
    const validDate = new Date('2024-03-15')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => isDateInPast(validDate, new Date('invalid'))).toThrow(
      'Invalid reference date provided'
    )
  })
})

describe('isDateInFuture', () => {
  it('should return true for future dates', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
    expect(isDateInFuture(futureDate)).toBe(true)
  })

  it('should return false for past dates', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    expect(isDateInFuture(pastDate)).toBe(false)
  })

  it('should work with custom reference date', () => {
    const date = new Date('2024-03-25')
    const referenceDate = new Date('2024-03-20')

    expect(isDateInFuture(date, referenceDate)).toBe(true)
  })

  it('should return false when date equals reference date', () => {
    const date = new Date('2024-03-15T12:00:00')
    const referenceDate = new Date('2024-03-15T12:00:00')

    expect(isDateInFuture(date, referenceDate)).toBe(false)
  })

  it('should throw error for invalid date', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => isDateInFuture(new Date('invalid'))).toThrow('Invalid date provided')
  })

  it('should throw error for invalid reference date', () => {
    const validDate = new Date('2024-03-15')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => isDateInFuture(validDate, new Date('invalid'))).toThrow(
      'Invalid reference date provided'
    )
  })
})

describe('addDays', () => {
  it('should add positive days', () => {
    const date = new Date('2024-03-15T12:00:00')
    const result = addDays(date, 7)

    expect(result.getDate()).toBe(22)
    expect(result.getMonth()).toBe(2) // March (0-indexed)
  })

  it('should subtract negative days', () => {
    const date = new Date('2024-03-15T12:00:00')
    const result = addDays(date, -7)

    expect(result.getDate()).toBe(8)
    expect(result.getMonth()).toBe(2) // March (0-indexed)
  })

  it('should handle month boundaries', () => {
    const date = new Date('2024-03-30T12:00:00')
    const result = addDays(date, 5)

    expect(result.getDate()).toBe(4)
    expect(result.getMonth()).toBe(3) // April (0-indexed)
  })

  it('should handle year boundaries', () => {
    const date = new Date('2024-12-30T12:00:00')
    const result = addDays(date, 5)

    expect(result.getDate()).toBe(4)
    expect(result.getMonth()).toBe(0) // January (0-indexed)
    expect(result.getFullYear()).toBe(2025)
  })

  it('should not modify the original date', () => {
    const date = new Date('2024-03-15T12:00:00')
    const originalTime = date.getTime()

    addDays(date, 7)

    expect(date.getTime()).toBe(originalTime)
  })

  it('should throw error for invalid date', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => addDays(new Date('invalid'), 5)).toThrow('Invalid date provided')
  })

  it('should throw error for invalid days', () => {
    const date = new Date('2024-03-15T12:00:00')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => addDays(date, 'five' as any)).toThrow('Days must be a valid number')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => addDays(date, NaN)).toThrow('Days must be a valid number')
  })
})

describe('addHours', () => {
  it('should add positive hours', () => {
    const date = new Date('2024-03-15T10:00:00')
    const result = addHours(date, 5)

    expect(result.getHours()).toBe(15)
  })

  it('should subtract negative hours', () => {
    const date = new Date('2024-03-15T10:00:00')
    const result = addHours(date, -5)

    expect(result.getHours()).toBe(5)
  })

  it('should handle day boundaries', () => {
    const date = new Date('2024-03-15T22:00:00')
    const result = addHours(date, 5)

    expect(result.getHours()).toBe(3)
    expect(result.getDate()).toBe(16)
  })

  it('should not modify the original date', () => {
    const date = new Date('2024-03-15T10:00:00')
    const originalTime = date.getTime()

    addHours(date, 5)

    expect(date.getTime()).toBe(originalTime)
  })

  it('should throw error for invalid date', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => addHours(new Date('invalid'), 5)).toThrow('Invalid date provided')
  })

  it('should throw error for invalid hours', () => {
    const date = new Date('2024-03-15')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => addHours(date, 'five' as any)).toThrow('Hours must be a valid number')
  })
})

describe('isSameDay', () => {
  it('should return true for same day, different times', () => {
    const morning = new Date('2024-03-15T08:00:00')
    const evening = new Date('2024-03-15T20:00:00')

    expect(isSameDay(morning, evening)).toBe(true)
  })

  it('should return false for different days', () => {
    const today = new Date('2024-03-15T12:00:00')
    const tomorrow = new Date('2024-03-16T12:00:00')

    expect(isSameDay(today, tomorrow)).toBe(false)
  })

  it('should return true for exact same time', () => {
    const date1 = new Date('2024-03-15T12:00:00')
    const date2 = new Date('2024-03-15T12:00:00')

    expect(isSameDay(date1, date2)).toBe(true)
  })

  it('should return false for same day different months', () => {
    const march15 = new Date('2024-03-15T12:00:00')
    const april15 = new Date('2024-04-15T12:00:00')

    expect(isSameDay(march15, april15)).toBe(false)
  })

  it('should return false for same day different years', () => {
    const date2024 = new Date('2024-03-15T12:00:00')
    const date2025 = new Date('2025-03-15T12:00:00')

    expect(isSameDay(date2024, date2025)).toBe(false)
  })

  it('should throw error for invalid first date', () => {
    const validDate = new Date('2024-03-15T12:00:00')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => isSameDay(new Date('invalid'), validDate)).toThrow(
      'Invalid first date provided'
    )
  })

  it('should throw error for invalid second date', () => {
    const validDate = new Date('2024-03-15T12:00:00')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => isSameDay(validDate, new Date('invalid'))).toThrow(
      'Invalid second date provided'
    )
  })
})
