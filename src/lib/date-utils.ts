type FirstDayOfWeek = 'monday' | 'sunday'
type TimeFormat = '12h' | '24h'

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function startOfWeek(date: Date, firstDay: FirstDayOfWeek = 'monday'): Date {
  const d = startOfDay(date)
  const day = d.getDay()
  if (firstDay === 'sunday') {
    d.setDate(d.getDate() - day)
  } else {
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
  }
  return d
}

export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6)
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}

export function endOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function isTomorrow(date: Date): boolean {
  return isSameDay(date, addDays(new Date(), 1))
}

export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function formatWeekRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
  const year = end.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${year}`
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${year}`
}

export function formatDayHeader(date: Date): string {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDay = date
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    .toUpperCase()

  if (isToday(date)) return `TODAY · ${dayName}, ${monthDay}`
  if (isTomorrow(date)) return `TOMORROW · ${dayName}, ${monthDay}`
  return `${dayName}, ${monthDay}`
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function formatTime(isoString: string, format: TimeFormat = '24h'): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: format === '12h',
  })
}
