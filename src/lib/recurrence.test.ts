import { describe, expect, it } from 'vitest'

import { computeNextDueDate } from './recurrence'

import type { Recurrence } from '@/features/todos/types'

describe('computeNextDueDate', () => {
  const daily: Recurrence = { frequency: 'daily', interval: 1 }
  const weekly: Recurrence = { frequency: 'weekly', interval: 1 }
  const biweekly: Recurrence = { frequency: 'weekly', interval: 2 }
  const monthly: Recurrence = { frequency: 'monthly', interval: 1 }
  const yearly: Recurrence = { frequency: 'yearly', interval: 1 }

  it('advances daily by interval days', () => {
    const result = computeNextDueDate('2026-08-17T09:00:00.000Z', daily)
    expect(result).toBe('2026-08-18T09:00:00.000Z')
  })

  it('advances weekly by interval weeks', () => {
    const result = computeNextDueDate('2026-08-17T09:00:00.000Z', weekly)
    expect(result).toBe('2026-08-24T09:00:00.000Z')
  })

  it('advances biweekly', () => {
    const result = computeNextDueDate('2026-08-17T09:00:00.000Z', biweekly)
    expect(result).toBe('2026-08-31T09:00:00.000Z')
  })

  it('advances monthly', () => {
    const result = computeNextDueDate('2026-08-17T09:00:00.000Z', monthly)
    expect(result).toBe('2026-09-17T09:00:00.000Z')
  })

  it('advances yearly', () => {
    const result = computeNextDueDate('2026-08-17T09:00:00.000Z', yearly)
    expect(result).toBe('2027-08-17T09:00:00.000Z')
  })

  it('handles month-end overflow (Jan 31 + 1 month)', () => {
    const result = computeNextDueDate('2026-01-31T09:00:00.000Z', monthly)
    expect(result!.startsWith('2026-02-28')).toBe(true)
  })

  it('returns null when dueAt is null', () => {
    const result = computeNextDueDate(null, daily)
    expect(result).toBeNull()
  })
})
