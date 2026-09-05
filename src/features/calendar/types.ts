/**
 * En kalender som redan finns på telefonen — Google, iCloud, jobbets Exchange.
 * Vi läser dem via operativsystemet i stället för att logga in mot en leverantör.
 */
export type DeviceCalendar = {
  id: string
  title: string
  /** Kontot kalendern hör till, t.ex. en gmail-adress. Skiljer dubbletter åt. */
  accountName: string
  color: string
  isPrimary: boolean
}

export type CalendarEvent = {
  id: string
  title: string
  /** Lokal YYYY-MM-DD — dagen eventet ska visas under. */
  date: string
  startAt: string
  endAt: string
  allDay: boolean
  calendarName: string
  color: string
}
