import { describe, expect, it } from 'vitest'

import {
  startOfDay,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isToday,
  isTomorrow,
  toDateString,
  getWeekDays,
  formatWeekRange,
  formatDayHeader,
  formatMonthYear,
  formatTime,
} from './date-utils'

describe('startOfDay', () => {
  it('zeros out hours/minutes/seconds', () => {
    const d = startOfDay(new Date(2026, 7, 17, 14, 30, 45))
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
    expect(d.getMilliseconds()).toBe(0)
  })

  it('does not mutate original date', () => {
    const original = new Date(2026, 7, 17, 14, 30)
    startOfDay(original)
    expect(original.getHours()).toBe(14)
  })
})

describe('addDays', () => {
  it('adds positive days', () => {
    const d = addDays(new Date(2026, 7, 17), 3)
    expect(d.getDate()).toBe(20)
  })

  it('adds negative days', () => {
    const d = addDays(new Date(2026, 7, 17), -2)
    expect(d.getDate()).toBe(15)
  })

  it('crosses month boundary', () => {
    const d = addDays(new Date(2026, 7, 31), 1)
    expect(d.getMonth()).toBe(8)
    expect(d.getDate()).toBe(1)
  })
})

describe('startOfWeek', () => {
  it('returns Monday for a Wednesday', () => {
    const wed = new Date(2026, 7, 19)
    const mon = startOfWeek(wed)
    expect(mon.getDay()).toBe(1)
    expect(mon.getDate()).toBe(17)
  })

  it('returns Monday for a Sunday', () => {
    const sun = new Date(2026, 7, 23)
    const mon = startOfWeek(sun)
    expect(mon.getDay()).toBe(1)
    expect(mon.getDate()).toBe(17)
  })

  it('returns same day for a Monday', () => {
    const mon = new Date(2026, 7, 17)
    expect(startOfWeek(mon).getDate()).toBe(17)
  })

  it('returns Sunday for Sunday start', () => {
    const wed = new Date(2026, 7, 19)
    const sun = startOfWeek(wed, 'sunday')
    expect(sun.getDay()).toBe(0)
    expect(sun.getDate()).toBe(16)
  })

  it('handles Sunday with Sunday start', () => {
    const sun = new Date(2026, 7, 23)
    const result = startOfWeek(sun, 'sunday')
    expect(result.getDay()).toBe(0)
    expect(result.getDate()).toBe(23)
  })

  it('defaults to monday when no arg given', () => {
    const wed = new Date(2026, 7, 19)
    const mon = startOfWeek(wed)
    expect(mon.getDay()).toBe(1)
  })
})

describe('endOfWeek', () => {
  it('returns Sunday for a Wednesday', () => {
    const wed = new Date(2026, 7, 19)
    const sun = endOfWeek(wed)
    expect(sun.getDay()).toBe(0)
    expect(sun.getDate()).toBe(23)
  })
})

describe('startOfMonth', () => {
  it('returns the 1st of the month', () => {
    const d = startOfMonth(new Date(2026, 7, 17))
    expect(d.getDate()).toBe(1)
    expect(d.getMonth()).toBe(7)
  })
})

describe('endOfMonth', () => {
  it('returns last day of month', () => {
    const d = endOfMonth(new Date(2026, 7, 17))
    expect(d.getDate()).toBe(31)
    expect(d.getMonth()).toBe(7)
  })

  it('handles February', () => {
    const d = endOfMonth(new Date(2026, 1, 5))
    expect(d.getDate()).toBe(28)
  })
})

describe('isSameDay', () => {
  it('matches same calendar day', () => {
    expect(isSameDay(new Date(2026, 7, 17, 9, 0), new Date(2026, 7, 17, 18, 0))).toBe(true)
  })

  it('rejects different days', () => {
    expect(isSameDay(new Date(2026, 7, 17), new Date(2026, 7, 18))).toBe(false)
  })
})

describe('isToday', () => {
  it('returns true for today', () => {
    expect(isToday(new Date())).toBe(true)
  })

  it('returns false for yesterday', () => {
    expect(isToday(addDays(new Date(), -1))).toBe(false)
  })
})

describe('isTomorrow', () => {
  it('returns true for tomorrow', () => {
    expect(isTomorrow(addDays(new Date(), 1))).toBe(true)
  })

  it('returns false for today', () => {
    expect(isTomorrow(new Date())).toBe(false)
  })
})

describe('toDateString', () => {
  it('returns YYYY-MM-DD', () => {
    expect(toDateString(new Date(2026, 7, 17))).toBe('2026-08-17')
  })

  it('pads single-digit month and day', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('getWeekDays', () => {
  it('returns 7 days starting from given date', () => {
    const mon = new Date(2026, 7, 17)
    const days = getWeekDays(mon)
    expect(days).toHaveLength(7)
    expect(days[0].getDate()).toBe(17)
    expect(days[6].getDate()).toBe(23)
  })
})

describe('formatWeekRange', () => {
  it('formats same-month range', () => {
    const start = new Date(2026, 7, 17)
    const end = new Date(2026, 7, 23)
    expect(formatWeekRange(start, end)).toBe('Aug 17 – 23, 2026')
  })

  it('formats cross-month range', () => {
    const start = new Date(2026, 7, 31)
    const end = new Date(2026, 8, 6)
    expect(formatWeekRange(start, end)).toBe('Aug 31 – Sep 6, 2026')
  })
})

describe('formatDayHeader', () => {
  it('formats a regular date', () => {
    const date = new Date(2026, 7, 20)
    const result = formatDayHeader(date)
    expect(result).toBe('THURSDAY, AUGUST 20')
  })
})

describe('formatMonthYear', () => {
  it('formats month and year', () => {
    expect(formatMonthYear(new Date(2026, 7, 17))).toBe('August 2026')
  })
})

describe('formatTime', () => {
  it('formats an ISO string to HH:mm', () => {
    const result = formatTime('2026-08-17T14:30:00.000Z')
    expect(result).toMatch(/\d{2}:\d{2}/)
  })

  it('formats in 12-hour mode', () => {
    const base = formatTime('2026-08-17T14:30:00.000Z')
    const result12 = formatTime('2026-08-17T14:30:00.000Z', '12h')
    expect(result12).not.toBe(base)
    expect(result12).toMatch(/\d{1,2}:\d{2}/)
  })

  it('24h and default produce same result', () => {
    const defaultResult = formatTime('2026-08-17T14:30:00.000Z')
    const explicit24 = formatTime('2026-08-17T14:30:00.000Z', '24h')
    expect(defaultResult).toBe(explicit24)
  })
})
