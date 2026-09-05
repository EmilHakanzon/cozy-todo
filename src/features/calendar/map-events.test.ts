import { describe, expect, it } from 'vitest'

import { toCalendarEvents } from './map-events'
import type { RawCalendarEvent } from './map-events'
import type { DeviceCalendar } from './types'

const WORK: DeviceCalendar = {
  id: 'cal-work',
  title: 'Work',
  accountName: 'jobb@example.com',
  color: '#ff0000',
  isPrimary: false,
}
const CALENDARS = { [WORK.id]: WORK }

function makeRaw(raw: Partial<RawCalendarEvent> & Pick<RawCalendarEvent, 'id'>): RawCalendarEvent {
  return {
    calendarId: WORK.id,
    title: raw.id,
    startDate: new Date(2026, 8, 4, 9, 0),
    endDate: new Date(2026, 8, 4, 10, 0),
    ...raw,
  }
}

describe('toCalendarEvents', () => {
  it('lägger eventet på sin lokala dag och ärver kalenderns namn och färg', () => {
    const [event] = toCalendarEvents([makeRaw({ id: 'mote' })], CALENDARS)

    expect(event.date).toBe('2026-09-04')
    expect(event.calendarName).toBe('Work')
    expect(event.color).toBe('#ff0000')
    expect(event.allDay).toBe(false)
  })

  it('lägger ett heldagsevent på en dag, trots exklusiv slutpunkt vid midnatt', () => {
    const events = toCalendarEvents(
      [
        makeRaw({
          id: 'ledig',
          allDay: true,
          startDate: new Date(2026, 8, 4, 0, 0),
          endDate: new Date(2026, 8, 5, 0, 0),
        }),
      ],
      CALENDARS,
    )

    expect(events.map((e) => e.date)).toEqual(['2026-09-04'])
  })

  it('sprider ett flerdagarsevent över varje dag det spänner över', () => {
    const events = toCalendarEvents(
      [
        makeRaw({
          id: 'resa',
          allDay: true,
          startDate: new Date(2026, 8, 4, 0, 0),
          endDate: new Date(2026, 8, 7, 0, 0),
        }),
      ],
      CALENDARS,
    )

    expect(events.map((e) => e.date)).toEqual([
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ])
  })

  it('överlever okänd kalender, tom titel och ogiltigt slutdatum', () => {
    const [event] = toCalendarEvents(
      [makeRaw({ id: 'trasig', calendarId: 'borta', title: '', endDate: 'inte-ett-datum' })],
      CALENDARS,
    )

    expect(event.title).toBe('(untitled)')
    expect(event.calendarName).toBe('')
    expect(event.date).toBe('2026-09-04')
  })

  it('hoppar över event utan giltigt startdatum', () => {
    expect(toCalendarEvents([makeRaw({ id: 'x', startDate: 'skräp' })], CALENDARS)).toEqual([])
  })

  it('sorterar på dag och därefter starttid', () => {
    const events = toCalendarEvents(
      [
        makeRaw({ id: 'sen', startDate: new Date(2026, 8, 4, 16, 0) }),
        makeRaw({ id: 'imorgon', startDate: new Date(2026, 8, 5, 8, 0) }),
        makeRaw({ id: 'tidig', startDate: new Date(2026, 8, 4, 8, 0) }),
      ],
      CALENDARS,
    )

    expect(events.map((e) => e.id)).toEqual(['tidig', 'sen', 'imorgon'])
  })
})
