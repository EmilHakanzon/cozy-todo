import type { Recurrence } from './types'

export function formatRecurrenceLabel(recurrence: Recurrence | null): string {
  if (!recurrence) return 'None'
  const { frequency, interval } = recurrence
  if (frequency === 'weekly' && interval === 2) return 'Biweekly'
  if (interval === 1) return frequency.charAt(0).toUpperCase() + frequency.slice(1)
  return `Every ${interval} ${frequency.replace('ly', '')}s`
}

export function formatDueLabel(dueAt: string | null): string {
  if (!dueAt) return 'Add date & time'
  return new Date(dueAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
