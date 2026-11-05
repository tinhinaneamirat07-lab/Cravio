import { describe, expect, it } from 'vitest'
import { addDays, fromISODate, startOfWeek, toISODate } from './dates'

describe('dates', () => {
  it('round-trips local ISO dates without shifting the day', () => {
    expect(toISODate(fromISODate('2026-09-28'))).toBe('2026-09-28')
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('adds days across months and years', () => {
    expect(toISODate(addDays(fromISODate('2026-12-30'), 3))).toBe('2027-01-02')
    expect(toISODate(addDays(fromISODate('2026-03-01'), -1))).toBe('2026-02-28')
  })

  it('finds the Monday of the week', () => {
    expect(toISODate(startOfWeek(fromISODate('2026-09-28')))).toBe('2026-09-28') // Monday
    expect(toISODate(startOfWeek(fromISODate('2026-10-04')))).toBe('2026-09-28') // Sunday
    expect(toISODate(startOfWeek(fromISODate('2026-10-01')))).toBe('2026-09-28') // Thursday
  })
})
