import { describe, expect, it } from 'vitest'

import { deriveChatTitle, pruneChats, sortChatsByRecency } from './chat-history'

import type { PlanChat, PlanChatId } from './types'

function chat(id: string, updatedAt: string): PlanChat {
  return {
    id,
    title: id,
    messages: [],
    createdTodoCount: 0,
    createdAt: updatedAt,
    updatedAt,
  }
}

function byId(...chats: PlanChat[]): Record<PlanChatId, PlanChat> {
  return Object.fromEntries(chats.map((c) => [c.id, c]))
}

describe('deriveChatTitle', () => {
  it('uses the trimmed text', () => {
    expect(deriveChatTitle('  buy milk  ')).toBe('buy milk')
  })

  it('collapses internal whitespace', () => {
    expect(deriveChatTitle('plan   the\n\nparty')).toBe('plan the party')
  })

  it('truncates past 60 characters with an ellipsis', () => {
    const long = 'a'.repeat(80)
    const title = deriveChatTitle(long)
    expect(title).toHaveLength(61)
    expect(title.endsWith('…')).toBe(true)
  })

  it('keeps a 60 character title intact', () => {
    const exact = 'a'.repeat(60)
    expect(deriveChatTitle(exact)).toBe(exact)
  })

  it('falls back for empty and whitespace-only text', () => {
    expect(deriveChatTitle('')).toBe('Untitled plan')
    expect(deriveChatTitle('   \n ')).toBe('Untitled plan')
  })
})

describe('sortChatsByRecency', () => {
  it('returns most recently updated first', () => {
    const chats = byId(
      chat('old', '2026-08-01T10:00:00.000Z'),
      chat('new', '2026-08-24T10:00:00.000Z'),
      chat('mid', '2026-08-10T10:00:00.000Z'),
    )

    expect(sortChatsByRecency(chats).map((c) => c.id)).toEqual(['new', 'mid', 'old'])
  })

  it('returns an empty array for an empty map', () => {
    expect(sortChatsByRecency({})).toEqual([])
  })
})

describe('pruneChats', () => {
  it('leaves the map untouched when under the limit', () => {
    const chats = byId(chat('a', '2026-08-01T10:00:00.000Z'))
    expect(pruneChats(chats, null, 30)).toEqual(chats)
  })

  it('keeps only the most recent max chats', () => {
    const chats = byId(
      chat('a', '2026-08-01T10:00:00.000Z'),
      chat('b', '2026-08-02T10:00:00.000Z'),
      chat('c', '2026-08-03T10:00:00.000Z'),
    )

    expect(Object.keys(pruneChats(chats, null, 2)).sort()).toEqual(['b', 'c'])
  })

  it('never prunes the active chat even when it is the oldest', () => {
    const chats = byId(
      chat('a', '2026-08-01T10:00:00.000Z'),
      chat('b', '2026-08-02T10:00:00.000Z'),
      chat('c', '2026-08-03T10:00:00.000Z'),
    )

    expect(Object.keys(pruneChats(chats, 'a', 1)).sort()).toEqual(['a', 'c'])
  })
})
