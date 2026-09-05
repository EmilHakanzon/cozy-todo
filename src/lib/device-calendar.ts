import * as Calendar from 'expo-calendar'

import { toCalendarEvents } from '@/features/calendar/map-events'

import type { RawCalendarEvent } from '@/features/calendar/map-events'
import type { CalendarEvent, DeviceCalendar } from '@/features/calendar/types'

/**
 * Tunt skal runt expo-calendar. Modulen finns inte på webben och kastar
 * UnavailabilityError där, så varje anrop faller tillbaka på ett tomt svar i
 * stället för att krascha skärmen.
 */

export async function hasCalendarAccess(): Promise<boolean> {
  try {
    const { status } = await Calendar.getCalendarPermissions()
    return status === 'granted'
  } catch {
    return false
  }
}

export async function requestCalendarAccess(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissions()
    return status === 'granted'
  } catch {
    return false
  }
}

export async function listDeviceCalendars(): Promise<DeviceCalendar[]> {
  try {
    const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT)
    return calendars.map((calendar) => ({
      id: calendar.id,
      title: calendar.title,
      accountName: calendar.source?.name ?? '',
      color: calendar.color ?? '',
      isPrimary: calendar.isPrimary ?? false,
    }))
  } catch {
    return []
  }
}

export async function fetchCalendarEvents(
  calendars: DeviceCalendar[],
  startDate: Date,
  endDate: Date,
): Promise<CalendarEvent[]> {
  if (calendars.length === 0) return []

  try {
    const raw = await Calendar.listEvents(
      calendars.map((calendar) => calendar.id),
      startDate,
      endDate,
    )
    const calendarsById = Object.fromEntries(
      calendars.map((calendar) => [calendar.id, calendar]),
    )
    return toCalendarEvents(raw as unknown as RawCalendarEvent[], calendarsById)
  } catch {
    return []
  }
}
