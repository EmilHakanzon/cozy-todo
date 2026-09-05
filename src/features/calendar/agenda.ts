import { groupTodosByDate } from '@/features/todos/selectors'
import { formatDayHeader } from '@/lib/date-utils'

import type { Todo } from '@/features/todos/types'
import type { CalendarEvent } from './types'

export type AgendaListItem =
  | { kind: 'header'; label: string; count: number }
  | { kind: 'todo'; todo: Todo }
  | { kind: 'event'; event: CalendarEvent }

function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const existing = groups.get(event.date) ?? []
    existing.push(event)
    groups.set(event.date, existing)
  }
  return groups
}

function timeOf(item: AgendaListItem): string {
  if (item.kind === 'event') return item.event.startAt
  if (item.kind === 'todo') return item.todo.dueAt ?? ''
  return ''
}

/**
 * Slår ihop uppgifter och kalenderevent till en agenda.
 *
 * Grupperingen sker på datum, aldrig på rubriktext. En tidigare version letade
 * upp rätt dag genom att jämföra formaterade etiketter, vilket aldrig kunde
 * matcha eftersom formatDayHeader versaliserar och sätter "TODAY ·" framför —
 * så varje event fick en egen dubblettrubrik sist i listan.
 */
export function buildAgendaWithEvents(
  todos: Todo[],
  events: CalendarEvent[],
): AgendaListItem[] {
  const todosByDate = groupTodosByDate(todos)
  const eventsByDate = groupEventsByDate(events)

  const dates = [...new Set([...todosByDate.keys(), ...eventsByDate.keys()])].sort()

  const items: AgendaListItem[] = []
  for (const dateStr of dates) {
    const dayTodos = todosByDate.get(dateStr) ?? []
    const dayEvents = eventsByDate.get(dateStr) ?? []

    items.push({
      kind: 'header',
      label: formatDayHeader(new Date(`${dateStr}T00:00:00`)),
      count: dayTodos.length + dayEvents.length,
    })

    const rows: AgendaListItem[] = [
      ...dayEvents.map((event): AgendaListItem => ({ kind: 'event', event })),
      ...dayTodos.map((todo): AgendaListItem => ({ kind: 'todo', todo })),
    ]

    // Heldagsevent hör hemma överst — de har ingen tid att sorteras in på.
    const allDay = rows.filter((row) => row.kind === 'event' && row.event.allDay)
    const timed = rows
      .filter((row) => !(row.kind === 'event' && row.event.allDay))
      .sort((a, b) => timeOf(a).localeCompare(timeOf(b)))

    items.push(...allDay, ...timed)
  }

  return items
}

export function agendaItemKey(item: AgendaListItem, index: number): string {
  if (item.kind === 'todo') return item.todo.id
  // Ett flerdagarsevent förekommer en gång per dag och behöver dagen i nyckeln.
  if (item.kind === 'event') return `event-${item.event.id}-${item.event.date}`
  return `header-${index}`
}
