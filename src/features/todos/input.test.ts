import { describe, expect, it } from 'vitest'

import { parseTaskInput } from './input'

// 2026-08-24 is a Monday. Built with the local constructor on purpose:
// toDateString() reads local date parts, so a UTC date would drift.
const TODAY = new Date(2026, 7, 24)

function one(text: string) {
  const tasks = parseTaskInput(text, TODAY, 'monday')
  if (tasks === null) throw new Error(`expected tasks, got escalation for: ${text}`)
  expect(tasks).toHaveLength(1)
  return tasks[0]
}

describe('date phrases', () => {
  it('parses today', () => {
    expect(one('pay rent today').dueAt).toBe('2026-08-24')
  })

  it('parses tomorrow', () => {
    expect(one('pay rent tomorrow').dueAt).toBe('2026-08-25')
  })

  it('parses a bare weekday as the next future occurrence', () => {
    expect(one('gym friday').dueAt).toBe('2026-08-28')
  })

  it('excludes today from a bare weekday', () => {
    expect(one('gym monday').dueAt).toBe('2026-08-31')
  })

  it('parses next weekday as a week later', () => {
    expect(one('gym next friday').dueAt).toBe('2026-09-04')
  })

  it('accepts an abbreviation after next', () => {
    expect(one('gym next fri').dueAt).toBe('2026-09-04')
  })

  it('parses next week as the start of next week', () => {
    expect(one('review next week').dueAt).toBe('2026-08-31')
  })

  it('parses this weekend as Saturday', () => {
    expect(one('clean this weekend').dueAt).toBe('2026-08-29')
  })

  it('parses next weekend as the Saturday after', () => {
    expect(one('clean next weekend').dueAt).toBe('2026-09-05')
  })

  it('parses in N days', () => {
    expect(one('call back in 3 days').dueAt).toBe('2026-08-27')
  })

  it('parses in N weeks', () => {
    expect(one('follow up in 2 weeks').dueAt).toBe('2026-09-07')
  })

  it('parses end of month', () => {
    expect(one('send invoice end of month').dueAt).toBe('2026-08-31')
  })

  it('parses an explicit ISO date', () => {
    expect(one('dentist 2026-12-01').dueAt).toBe('2026-12-01')
  })

  it('does not parse ambiguous numeric dates', () => {
    expect(one('dentist 3/4').dueAt).toBeNull()
  })

  it('strips the date phrase out of the title', () => {
    expect(one('pay rent tomorrow').title).toBe('pay rent')
  })

  it('strips a trailing preposition left behind by the date', () => {
    expect(one('call mom on friday').title).toBe('call mom')
  })
})

describe('time phrases', () => {
  it('parses at HH:mm onto the parsed date', () => {
    expect(one('standup tomorrow at 09:30').dueAt).toBe('2026-08-25T09:30:00')
  })

  it('parses a bare HH:mm', () => {
    expect(one('standup 14:00').dueAt).toBe('2026-08-24T14:00:00')
  })

  it('parses at H am', () => {
    expect(one('standup tomorrow at 8am').dueAt).toBe('2026-08-25T08:00:00')
  })

  it('parses at H pm', () => {
    expect(one('standup tomorrow at 8pm').dueAt).toBe('2026-08-25T20:00:00')
  })

  it('treats a bare low hour as afternoon', () => {
    expect(one('call mom tomorrow at 5').dueAt).toBe('2026-08-25T17:00:00')
  })

  it('treats a bare high hour literally', () => {
    expect(one('call mom tomorrow at 9').dueAt).toBe('2026-08-25T09:00:00')
  })

  it('applies a time with no date to today', () => {
    expect(one('standup at 09:30').dueAt).toBe('2026-08-24T09:30:00')
  })

  it('parses tonight as today at 20:00', () => {
    expect(one('dishes tonight').dueAt).toBe('2026-08-24T20:00:00')
  })

  it('strips the time out of the title', () => {
    expect(one('standup tomorrow at 09:30').title).toBe('standup')
  })
})
