import type { Recurrence } from './types'

type TimeFormat = '12h' | '24h'

export function formatRecurrenceLabel(recurrence: Recurrence | null): string {
  if (!recurrence) return 'None'
  const { frequency, interval } = recurrence
  if (frequency === 'weekly' && interval === 2) return 'Biweekly'
  if (interval === 1) return frequency.charAt(0).toUpperCase() + frequency.slice(1)
  return `Every ${interval} ${frequency.replace('ly', '')}s`
}

export function formatDueLabel(dueAt: string | null, timeFormat: TimeFormat = '24h'): string {
  if (!dueAt) return 'Add date & time'
  const d = new Date(dueAt)
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  if (!hasTime) return dateStr
  const timeStr = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  })
  return `${dateStr}, ${timeStr}`
}
