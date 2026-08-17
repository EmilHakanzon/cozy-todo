import type { Recurrence } from '@/features/todos/types'

export function computeNextDueDate(
  dueAt: string | null,
  recurrence: Recurrence,
): string | null {
  if (!dueAt) return null

  const d = new Date(dueAt)

  switch (recurrence.frequency) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + recurrence.interval)
      break
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7 * recurrence.interval)
      break
    case 'monthly': {
      const day = d.getUTCDate()
      d.setUTCDate(1)
      d.setUTCMonth(d.getUTCMonth() + recurrence.interval)
      const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
      d.setUTCDate(Math.min(day, lastDay))
      break
    }
    case 'yearly': {
      const day = d.getUTCDate()
      d.setUTCDate(1)
      d.setUTCFullYear(d.getUTCFullYear() + recurrence.interval)
      const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
      d.setUTCDate(Math.min(day, lastDay))
      break
    }
  }

  return d.toISOString()
}
