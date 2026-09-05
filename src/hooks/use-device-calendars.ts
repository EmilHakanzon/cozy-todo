import { useCallback, useEffect, useState } from 'react'

import {
  hasCalendarAccess,
  listDeviceCalendars,
  requestCalendarAccess,
} from '@/lib/device-calendar'
import { useCalendarStore } from '@/stores/calendar-store'

import type { DeviceCalendar } from '@/features/calendar/types'

type DeviceCalendarsState = {
  granted: boolean
  loading: boolean
  calendars: DeviceCalendar[]
  selectedCalendarIds: string[]
  toggleCalendar: (id: string) => void
  connect: () => Promise<void>
}

/**
 * Driver inställningsskärmen: behörighet plus telefonens kalenderlista.
 * Första gången användaren släpper in oss förväljs primärkalendern, annars
 * ser skärmen ut som om ingenting hände.
 */
export function useDeviceCalendars(): DeviceCalendarsState {
  const selectedCalendarIds = useCalendarStore((s) => s.selectedCalendarIds)
  const setSelectedCalendarIds = useCalendarStore((s) => s.setSelectedCalendarIds)
  const toggleCalendar = useCalendarStore((s) => s.toggleCalendar)

  const [granted, setGranted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([])

  const load = useCallback(async (preselect: boolean) => {
    const found = await listDeviceCalendars()
    setCalendars(found)
    if (preselect && useCalendarStore.getState().selectedCalendarIds.length === 0) {
      const primary = found.filter((calendar) => calendar.isPrimary)
      setSelectedCalendarIds((primary.length > 0 ? primary : found).map((c) => c.id))
    }
  }, [setSelectedCalendarIds])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const allowed = await hasCalendarAccess()
      if (cancelled) return
      setGranted(allowed)
      if (allowed) await load(false)
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  const connect = useCallback(async () => {
    const allowed = await requestCalendarAccess()
    setGranted(allowed)
    if (allowed) await load(true)
  }, [load])

  return { granted, loading, calendars, selectedCalendarIds, toggleCalendar, connect }
}
