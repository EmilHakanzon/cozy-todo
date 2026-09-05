import { useEffect, useState } from 'react'

import { fetchCalendarEvents, listDeviceCalendars } from '@/lib/device-calendar'
import { toDateString } from '@/lib/date-utils'
import { useCalendarStore } from '@/stores/calendar-store'

import type { CalendarEvent } from '@/features/calendar/types'

/**
 * Hämtar valda kalendrars event för ett datumintervall.
 *
 * Ingen egen synk och ingen cache: operativsystemet håller redan kalendrarna
 * uppdaterade, så vi läser om från den lokala databasen när intervallet eller
 * urvalet ändras. Det gör vyn korrekt även offline.
 */
export function useCalendarEvents(startDate: Date, endDate: Date): CalendarEvent[] {
  const selectedCalendarIds = useCalendarStore((s) => s.selectedCalendarIds)
  const hasHydrated = useCalendarStore((s) => s.hasHydrated)
  const [events, setEvents] = useState<CalendarEvent[]>([])

  // Datumobjekt är nya vid varje render — nyckla effekten på dagen, inte referensen.
  const startKey = toDateString(startDate)
  const endKey = toDateString(endDate)
  const selectionKey = selectedCalendarIds.join(',')
  const active = hasHydrated && selectionKey !== ''

  useEffect(() => {
    if (!active) return

    let cancelled = false
    void (async () => {
      const calendars = await listDeviceCalendars()
      const selected = new Set(selectionKey.split(','))
      const found = await fetchCalendarEvents(
        calendars.filter((calendar) => selected.has(calendar.id)),
        new Date(`${startKey}T00:00:00`),
        new Date(`${endKey}T23:59:59`),
      )
      if (!cancelled) setEvents(found)
    })()

    return () => {
      cancelled = true
    }
  }, [active, selectionKey, startKey, endKey])

  // Utan urval finns inget att visa — härlett, så att effekten slipper nolla state.
  return active ? events : []
}
