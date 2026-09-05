import { describe, expect, it } from 'vitest'

import { agendaItemKey, buildAgendaWithEvents } from './agenda'
import type { CalendarEvent } from './types'
import type { Todo } from '@/features/todos/types'

function makeTodo(id: string, dueAt: string | null): Todo {
  return {
    id,
    listId: 'list-home',
    parentId: null,
    title: id,
    notes: '',
    dueAt,
    completedAt: null,
    recurrence: null,
    tagIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    position: 0,
  }
}

function makeEvent(id: string, date: string, startAt: string, allDay = false): CalendarEvent {
  return {
    id,
    title: id,
    date,
    startAt,
    endAt: startAt,
    allDay,
    calendarName: 'Work',
    color: '#ff0000',
  }
}

describe('buildAgendaWithEvents', () => {
  it('ger en enda rubrik när en uppgift och ett event delar dag', () => {
    const items = buildAgendaWithEvents(
      [makeTodo('uppgift', '2026-09-04T09:00:00.000Z')],
      [makeEvent('event', '2026-09-04', '2026-09-04T10:00:00.000Z')],
    )

    expect(items.filter((i) => i.kind === 'header')).toHaveLength(1)
    expect(items.map((i) => i.kind)).toEqual(['header', 'todo', 'event'])
  })

  it('räknar både uppgifter och event i rubriken', () => {
    const items = buildAgendaWithEvents(
      [makeTodo('a', '2026-09-04T09:00:00.000Z')],
      [
        makeEvent('e1', '2026-09-04', '2026-09-04T10:00:00.000Z'),
        makeEvent('e2', '2026-09-04', '2026-09-04T11:00:00.000Z'),
      ],
    )

    const header = items[0]
    expect(header.kind === 'header' && header.count).toBe(3)
  })

  it('håller dagarna i kronologisk ordning även när eventet ligger först', () => {
    const items = buildAgendaWithEvents(
      [makeTodo('senare', '2026-09-06T09:00:00.000Z')],
      [makeEvent('tidigare', '2026-09-04', '2026-09-04T10:00:00.000Z')],
    )

    const headers = items.filter((i) => i.kind === 'header')
    expect(headers).toHaveLength(2)
    expect(items.map((i) => i.kind)).toEqual(['header', 'event', 'header', 'todo'])
  })

  it('sorterar dagens rader på tid, med heldagsevent överst', () => {
    const items = buildAgendaWithEvents(
      [makeTodo('todo-13', '2026-09-04T13:00:00.000Z')],
      [
        makeEvent('event-15', '2026-09-04', '2026-09-04T15:00:00.000Z'),
        makeEvent('heldag', '2026-09-04', '2026-09-04T00:00:00.000Z', true),
        makeEvent('event-09', '2026-09-04', '2026-09-04T09:00:00.000Z'),
      ],
    )

    expect(items.slice(1).map((i) => (i.kind === 'event' ? i.event.id : i.kind === 'todo' ? i.todo.id : '')))
      .toEqual(['heldag', 'event-09', 'todo-13', 'event-15'])
  })

  it('visar en dag som bara har event', () => {
    const items = buildAgendaWithEvents([], [makeEvent('ensam', '2026-09-04', '2026-09-04T10:00:00.000Z')])

    expect(items.map((i) => i.kind)).toEqual(['header', 'event'])
  })

  it('ger unika nycklar åt ett flerdagarsevent', () => {
    const dag1 = makeEvent('resa', '2026-09-04', '2026-09-04T00:00:00.000Z', true)
    const dag2 = makeEvent('resa', '2026-09-05', '2026-09-04T00:00:00.000Z', true)

    expect(agendaItemKey({ kind: 'event', event: dag1 }, 0)).not.toBe(
      agendaItemKey({ kind: 'event', event: dag2 }, 1),
    )
  })

  it('är tom utan indata', () => {
    expect(buildAgendaWithEvents([], [])).toEqual([])
  })
})
