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

function many(text: string) {
  const tasks = parseTaskInput(text, TODAY, 'monday')
  if (tasks === null) throw new Error(`expected tasks, got escalation for: ${text}`)
  return tasks
}

describe('splitting', () => {
  it('splits on newlines', () => {
    expect(many('buy milk\nwalk dog').map((t) => t.title)).toEqual(['buy milk', 'walk dog'])
  })

  it('splits on semicolons', () => {
    expect(many('buy milk; walk dog').map((t) => t.title)).toEqual(['buy milk', 'walk dog'])
  })

  it('does not split on and', () => {
    expect(many('buy bread and butter')).toHaveLength(1)
  })

  it('parses a date per segment', () => {
    const [first, second] = many('buy milk today\nwalk dog tomorrow')
    expect(first.dueAt).toBe('2026-08-24')
    expect(second.dueAt).toBe('2026-08-25')
  })
})

describe('subtasks', () => {
  it('turns a colon list into subtasks', () => {
    const task = one('Groceries: milk, eggs, bread')
    expect(task.title).toBe('Groceries')
    expect(task.subtasks).toEqual(['milk', 'eggs', 'bread'])
  })

  it('does not split commas without a colon', () => {
    const task = one('milk, eggs, bread')
    expect(task.title).toBe('milk, eggs, bread')
    expect(task.subtasks).toEqual([])
  })

  it('needs at least two items after the colon', () => {
    const task = one('Groceries: milk')
    expect(task.subtasks).toEqual([])
  })

  it('keeps a date in the title part out of the subtasks', () => {
    const task = one('Groceries tomorrow: milk, eggs')
    expect(task.title).toBe('Groceries')
    expect(task.dueAt).toBe('2026-08-25')
    expect(task.subtasks).toEqual(['milk', 'eggs'])
  })
})

describe('recurrence', () => {
  it('parses daily', () => {
    expect(one('stretch daily').recurrence).toEqual({ frequency: 'daily', interval: 1 })
  })

  it('parses every week', () => {
    expect(one('water plants every week').recurrence).toEqual({
      frequency: 'weekly',
      interval: 1,
    })
  })

  it('parses every N days', () => {
    expect(one('water plants every 3 days').recurrence).toEqual({
      frequency: 'daily',
      interval: 3,
    })
  })

  it('parses monthly and yearly', () => {
    expect(one('rent monthly').recurrence?.frequency).toBe('monthly')
    expect(one('mot yearly').recurrence?.frequency).toBe('yearly')
  })

  it('parses every weekday as weekly with the first due date on that day', () => {
    const task = one('gym every monday')
    expect(task.recurrence).toEqual({ frequency: 'weekly', interval: 1 })
    expect(task.dueAt).toBe('2026-08-31')
    expect(task.title).toBe('gym')
  })
})

describe('tags', () => {
  it('extracts hash tags and strips them from the title', () => {
    const task = one('finish report #work #urgent')
    expect(task.tagNames).toEqual(['work', 'urgent'])
    expect(task.title).toBe('finish report')
  })

  it('does not guess tags from keywords', () => {
    expect(one('buy groceries').tagNames).toEqual([])
  })
})

describe('escalation to the AI', () => {
  const escalates = (text: string) => parseTaskInput(text, TODAY, 'monday') === null

  it('escalates a question', () => {
    expect(escalates('what should I do about the party?')).toBe(true)
  })

  it('escalates a planning verb', () => {
    expect(escalates('plan a birthday party for next saturday')).toBe(true)
    expect(escalates('help me get ready for the trip')).toBe(true)
    expect(escalates('organize my week')).toBe(true)
    expect(escalates('brainstorm gift ideas')).toBe(true)
    expect(escalates('suggest some meals')).toBe(true)
  })

  it('escalates long unstructured prose', () => {
    expect(
      escalates('i really need to get my whole life in order before the summer arrives'),
    ).toBe(true)
  })

  it('does not escalate a short bare task', () => {
    expect(escalates('buy milk')).toBe(false)
  })

  it('does not escalate long text that has structure', () => {
    expect(
      escalates('remember to call the dentist about the appointment tomorrow at 09:30'),
    ).toBe(false)
  })

  it('escalates empty input', () => {
    expect(escalates('   ')).toBe(true)
  })

  it('is not fooled by a planning verb inside the sentence', () => {
    expect(escalates('buy plan tickets')).toBe(false)
  })
})
