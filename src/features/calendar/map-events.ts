import { toDateString } from '@/lib/date-utils'

import type { CalendarEvent, DeviceCalendar } from './types'

/**
 * Delmängden av expo-calendars ExpoCalendarEvent som vi bryr oss om. Egen typ så
 * att mappningen går att testa utan att ladda den nativa modulen.
 */
export type RawCalendarEvent = {
  id: string
  calendarId: string
  title: string
  startDate: string | Date
  endDate: string | Date
  allDay?: boolean
}

/** Skydd mot en trasig eller extremt lång serie som annars fyller hela listan. */
const MAX_DAYS_PER_EVENT = 30

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

/**
 * Sista dagen eventet ska synas under.
 *
 * Heldagsevent lagras med en exklusiv slutpunkt: ett event den 4:e slutar
 * 00:00 den 5:e. Att räkna rakt av skulle lägga det på två dagar. Slutar
 * eventet exakt vid lokal midnatt hör det alltså till dagen före.
 */
function lastVisibleDay(start: Date, end: Date): Date {
  if (end.getTime() <= start.getTime()) return start
  const endsAtMidnight =
    end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0
  return endsAtMidnight ? new Date(end.getTime() - 1) : end
}

/**
 * Ett flerdagarsevent blir en rad per dag det spänner över — annars syns en
 * treveckorsresa bara på avresedagen och försvinner ur agendan dagen efter.
 */
export function toCalendarEvents(
  raw: RawCalendarEvent[],
  calendarsById: Record<string, DeviceCalendar>,
): CalendarEvent[] {
  const events: CalendarEvent[] = []

  for (const item of raw) {
    const start = toDate(item.startDate)
    const end = toDate(item.endDate)
    if (Number.isNaN(start.getTime())) continue

    const calendar = calendarsById[item.calendarId]
    const last = Number.isNaN(end.getTime()) ? start : lastVisibleDay(start, end)

    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const lastDay = toDateString(last)

    for (let day = 0; day < MAX_DAYS_PER_EVENT; day++) {
      const date = toDateString(cursor)
      events.push({
        id: item.id,
        title: item.title || '(untitled)',
        date,
        startAt: start.toISOString(),
        endAt: Number.isNaN(end.getTime()) ? start.toISOString() : end.toISOString(),
        allDay: item.allDay ?? false,
        calendarName: calendar?.title ?? '',
        color: calendar?.color ?? '',
      })
      if (date >= lastDay) break
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  return events.sort(
    (a, b) => a.date.localeCompare(b.date) || a.startAt.localeCompare(b.startAt),
  )
}
