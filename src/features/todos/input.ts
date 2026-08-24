import { addDays, endOfMonth, startOfDay, startOfWeek, toDateString } from '@/lib/date-utils'

import type { Recurrence } from './types'

export type ParsedInputTask = {
  title: string
  notes: string
  dueAt: string | null
  subtasks: string[]
  tagNames: string[]
  recurrence: Recurrence | null
}

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const SATURDAY = 6

function strip(text: string, match: string): string {
  return text.replace(match, ' ')
}

function tidy(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+(on|at|by)$/i, '')
    .trim()
}

/** Days forward to the next `target` weekday, never returning today. */
function nextWeekday(from: Date, target: number, extraWeeks: number): Date {
  const delta = (target - from.getDay() + 7) % 7
  return addDays(from, (delta === 0 ? 7 : delta) + extraWeeks * 7)
}

function weekdayIndex(word: string): number {
  const lower = word.toLowerCase()
  return WEEKDAYS.findIndex((day) => day.startsWith(lower))
}

type DateMatch = { date: Date | null; rest: string }

function matchDate(text: string, today: Date, firstDay: 'monday' | 'sunday'): DateMatch {
  const base = startOfDay(today)

  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    return { date, rest: strip(text, iso[0]) }
  }

  const inDays = text.match(/\bin (\d+) days?\b/i)
  if (inDays) return { date: addDays(base, Number(inDays[1])), rest: strip(text, inDays[0]) }

  const inWeeks = text.match(/\bin (\d+) weeks?\b/i)
  if (inWeeks) {
    return { date: addDays(base, 7 * Number(inWeeks[1])), rest: strip(text, inWeeks[0]) }
  }

  const nextWeekendM = text.match(/\bnext weekend\b/i)
  if (nextWeekendM) {
    return { date: nextWeekday(base, SATURDAY, 1), rest: strip(text, nextWeekendM[0]) }
  }

  const thisWeekendM = text.match(/\b(this )?weekend\b/i)
  if (thisWeekendM) {
    return { date: nextWeekday(base, SATURDAY, 0), rest: strip(text, thisWeekendM[0]) }
  }

  const nextWeekM = text.match(/\bnext week\b/i)
  if (nextWeekM) {
    return { date: startOfWeek(addDays(base, 7), firstDay), rest: strip(text, nextWeekM[0]) }
  }

  const endOfMonthM = text.match(/\bend of month\b/i)
  if (endOfMonthM) {
    return { date: startOfDay(endOfMonth(base)), rest: strip(text, endOfMonthM[0]) }
  }

  const nextDayM = text.match(/\bnext (sun|mon|tues?|wed(nes)?|thur?s?|fri|sat(ur)?)[a-z]*\b/i)
  if (nextDayM) {
    const index = weekdayIndex(nextDayM[1])
    if (index >= 0) {
      return { date: nextWeekday(base, index, 1), rest: strip(text, nextDayM[0]) }
    }
  }

  const tomorrowM = text.match(/\btomorrow\b/i)
  if (tomorrowM) return { date: addDays(base, 1), rest: strip(text, tomorrowM[0]) }

  const todayM = text.match(/\btoday\b/i)
  if (todayM) return { date: base, rest: strip(text, todayM[0]) }

  // Full names only — a bare \bsun\b would swallow "sun cream".
  const dayM = text.match(new RegExp(`\\b(${WEEKDAYS.join('|')})\\b`, 'i'))
  if (dayM) {
    const index = weekdayIndex(dayM[1])
    return { date: nextWeekday(base, index, 0), rest: strip(text, dayM[0]) }
  }

  return { date: null, rest: text }
}

type TimeMatch = { time: { hours: number; minutes: number } | null; rest: string }

function matchTime(text: string): TimeMatch {
  const tonight = text.match(/\btonight\b/i)
  if (tonight) {
    return { time: { hours: 20, minutes: 0 }, rest: strip(text, tonight[0]) }
  }

  const hhmm = text.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i)
  if (hhmm) {
    return {
      time: { hours: Number(hhmm[1]), minutes: Number(hhmm[2]) },
      rest: strip(text, hhmm[0]),
    }
  }

  const ampm = text.match(/\bat\s+(\d{1,2})\s*(am|pm)\b/i)
  if (ampm) {
    const raw = Number(ampm[1]) % 12
    const hours = ampm[2].toLowerCase() === 'pm' ? raw + 12 : raw
    return { time: { hours, minutes: 0 }, rest: strip(text, ampm[0]) }
  }

  const bare = text.match(/\bat\s+(\d{1,2})\b/i)
  if (bare) {
    const raw = Number(bare[1])
    if (raw >= 0 && raw <= 23) {
      // "call mom at 5" means 17:00 in a todo app; "at 9" means 09:00.
      const hours = raw >= 1 && raw <= 7 ? raw + 12 : raw
      return { time: { hours, minutes: 0 }, rest: strip(text, bare[0]) }
    }
  }

  return { time: null, rest: text }
}

function buildDueAt(
  date: Date | null,
  time: { hours: number; minutes: number } | null,
  today: Date,
): string | null {
  if (date === null && time === null) return null

  const day = toDateString(date ?? startOfDay(today))
  if (time === null) return day

  const hh = String(time.hours).padStart(2, '0')
  const mm = String(time.minutes).padStart(2, '0')
  return `${day}T${hh}:${mm}:00`
}

function parseSegment(
  segment: string,
  today: Date,
  firstDay: 'monday' | 'sunday',
): ParsedInputTask {
  const timeResult = matchTime(segment)
  const dateResult = matchDate(timeResult.rest, today, firstDay)

  return {
    title: tidy(dateResult.rest),
    notes: '',
    dueAt: buildDueAt(dateResult.date, timeResult.time, today),
    subtasks: [],
    tagNames: [],
    recurrence: null,
  }
}

export function parseTaskInput(
  text: string,
  today: Date,
  firstDay: 'monday' | 'sunday',
): ParsedInputTask[] | null {
  const trimmed = text.trim()
  if (trimmed === '') return null

  const tasks = [parseSegment(trimmed, today, firstDay)].filter((t) => t.title !== '')
  return tasks.length > 0 ? tasks : null
}
