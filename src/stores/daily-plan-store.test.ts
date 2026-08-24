import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDailyPlanStore } from './daily-plan-store'

import type { PlanChat, PlanChatMessage } from '@/features/daily-plan/types'

const store = () => useDailyPlanStore.getState()
const chats = () => useDailyPlanStore.getState().chatsById

function userMsg(text: string): PlanChatMessage {
  return { role: 'user', text }
}

beforeEach(() => {
  useDailyPlanStore.setState({ chatsById: {}, activeChatId: null, draft: '' })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ensureActiveChat', () => {
  it('creates a chat lazily and marks it active', () => {
    expect(store().activeChatId).toBeNull()

    const id = store().ensureActiveChat()

    expect(store().activeChatId).toBe(id)
    expect(chats()[id].messages).toEqual([])
    expect(chats()[id].createdTodoCount).toBe(0)
  })

  it('is idempotent while a chat is active', () => {
    const first = store().ensureActiveChat()
    const second = store().ensureActiveChat()

    expect(second).toBe(first)
    expect(Object.keys(chats())).toHaveLength(1)
  })
})

describe('appendMessage', () => {
  it('titles the chat from the first user message', () => {
    const id = store().ensureActiveChat()
    store().appendMessage(userMsg('  plan   the party  '))

    expect(chats()[id].title).toBe('plan the party')
    expect(chats()[id].messages).toHaveLength(1)
  })

  it('does not retitle on later messages', () => {
    const id = store().ensureActiveChat()
    store().appendMessage(userMsg('first'))
    store().appendMessage({ role: 'ai', text: 'ok' })
    store().appendMessage(userMsg('second'))

    expect(chats()[id].title).toBe('first')
    expect(chats()[id].messages).toHaveLength(3)
  })
})

describe('appendMessageTo', () => {
  it('lands in the chat it was given even after activeChatId moved on', () => {
    // The shape of an in-flight AI request: the user resumes another chat
    // while chat A is still waiting for its reply.
    const chatA = store().ensureActiveChat()
    store().appendMessage(userMsg('plan chat A'))
    store().startNewChat()
    const chatB = store().ensureActiveChat()
    store().appendMessage(userMsg('plan chat B'))

    store().appendMessageTo(chatA, { role: 'ai', text: 'reply for A' })

    expect(chats()[chatA].messages.map((m) => m.text)).toEqual([
      'plan chat A',
      'reply for A',
    ])
    expect(chats()[chatB].messages.map((m) => m.text)).toEqual(['plan chat B'])
    expect(store().activeChatId).toBe(chatB)
  })

  it('still delivers after "New chat" left no chat active', () => {
    const chatA = store().ensureActiveChat()
    store().appendMessage(userMsg('question'))
    store().startNewChat()

    store().appendMessageTo(chatA, { role: 'ai', text: 'answer' })

    expect(store().activeChatId).toBeNull()
    expect(chats()[chatA].messages).toHaveLength(2)
  })

  it('is a no-op when the target chat was deleted mid-flight', () => {
    const gone = store().ensureActiveChat()
    store().appendMessage(userMsg('doomed'))
    store().deleteChat(gone)

    store().appendMessageTo(gone, { role: 'ai', text: 'too late' })

    expect(chats()[gone]).toBeUndefined()
  })
})

describe('setDraft', () => {
  it('survives without an active chat', () => {
    store().setDraft('half a sentence')

    expect(store().draft).toBe('half a sentence')
    expect(Object.keys(chats())).toHaveLength(0)
  })
})

describe('finishActiveChat', () => {
  it('records the count and clears the active chat', () => {
    const id = store().ensureActiveChat()
    store().appendMessage(userMsg('groceries'))
    store().setDraft('leftover')

    store().finishActiveChat(4)

    expect(store().activeChatId).toBeNull()
    expect(store().draft).toBe('')
    expect(chats()[id].createdTodoCount).toBe(4)
  })
})

describe('startNewChat', () => {
  it('deletes the active chat when it has no messages', () => {
    const id = store().ensureActiveChat()

    store().startNewChat()

    expect(store().activeChatId).toBeNull()
    expect(chats()[id]).toBeUndefined()
  })

  it('keeps the active chat when it has messages', () => {
    const id = store().ensureActiveChat()
    store().appendMessage(userMsg('keep me'))

    store().startNewChat()

    expect(store().activeChatId).toBeNull()
    expect(chats()[id]).toBeDefined()
  })
})

describe('resumeChat', () => {
  it('makes an old chat active and clears the draft', () => {
    const old = store().ensureActiveChat()
    store().appendMessage(userMsg('old chat'))
    store().finishActiveChat(1)
    store().setDraft('stale')

    store().resumeChat(old)

    expect(store().activeChatId).toBe(old)
    expect(store().draft).toBe('')
  })

  it('discards an empty chat that was active', () => {
    const empty = store().ensureActiveChat()
    useDailyPlanStore.setState({ activeChatId: null })
    const target = store().ensureActiveChat()
    store().appendMessage(userMsg('real'))
    store().finishActiveChat(0)

    useDailyPlanStore.setState({ activeChatId: empty })
    store().resumeChat(target)

    expect(chats()[empty]).toBeUndefined()
    expect(store().activeChatId).toBe(target)
  })
})

describe('setTaskTags', () => {
  it('replaces the tags of one task in one message', () => {
    store().ensureActiveChat()
    store().appendMessage(userMsg('x'))
    store().appendMessage({
      role: 'ai',
      text: 'here you go',
      tasks: [
        { title: 'a', notes: '', dueAt: null, subtasks: [], tags: [], recurrence: null },
        { title: 'b', notes: '', dueAt: null, subtasks: [], tags: [], recurrence: null },
      ],
    })

    store().setTaskTags(1, 0, [{ tagId: null, name: 'work', color: 'blue' }])

    const id = store().activeChatId as string
    expect(chats()[id].messages[1].tasks?.[0].tags).toEqual([
      { tagId: null, name: 'work', color: 'blue' },
    ])
    expect(chats()[id].messages[1].tasks?.[1].tags).toEqual([])
  })
})

describe('deleteChat', () => {
  it('removes the chat and clears activeChatId when it was active', () => {
    const id = store().ensureActiveChat()
    store().appendMessage(userMsg('bye'))

    store().deleteChat(id)

    expect(chats()[id]).toBeUndefined()
    expect(store().activeChatId).toBeNull()
  })
})

describe('retention', () => {
  it('keeps the 30 most recently updated chats and drops the oldest', () => {
    // Fixed, staggered timestamps: finishActiveChat stamps wall-clock time,
    // which cannot distinguish chats created in the same millisecond.
    const seeded: Record<string, PlanChat> = {}
    for (let i = 0; i < 31; i++) {
      const id = `seed-${String(i).padStart(2, '0')}`
      const stamp = `2026-07-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`
      seeded[id] = {
        id,
        title: id,
        messages: [{ role: 'user', text: id }],
        createdTodoCount: 0,
        createdAt: stamp,
        updatedAt: stamp,
      }
    }
    useDailyPlanStore.setState({ chatsById: seeded, activeChatId: null, draft: '' })

    // One more chat finished now — its wall-clock stamp beats every seed.
    const fresh = store().ensureActiveChat()
    store().appendMessage(userMsg('freshest'))
    store().finishActiveChat(2)

    expect(Object.keys(chats())).toHaveLength(30)
    expect(chats()[fresh]).toBeDefined()
    expect(chats()['seed-30']).toBeDefined()
    expect(chats()['seed-00']).toBeUndefined()
    expect(chats()['seed-01']).toBeUndefined()
  })

  it('holds the cap for chats that are abandoned instead of finished', () => {
    // Nobody taps "Create N tasks" here, so finishActiveChat never runs and
    // ensureActiveChat is the only place the cap can be enforced.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01T00:00:00.000Z'))

    const ids: string[] = []
    for (let i = 0; i < 32; i++) {
      vi.advanceTimersByTime(1000)
      store().startNewChat()
      ids.push(store().ensureActiveChat())
      store().appendMessage(userMsg(`abandoned ${i}`))
    }

    expect(Object.keys(chats())).toHaveLength(30)
    expect(chats()[ids[31]]).toBeDefined()
    expect(store().activeChatId).toBe(ids[31])
    expect(chats()[ids[0]]).toBeUndefined()
    expect(chats()[ids[1]]).toBeUndefined()
  })
})
