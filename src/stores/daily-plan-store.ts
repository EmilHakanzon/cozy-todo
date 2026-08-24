import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { deriveChatTitle, pruneChats } from '@/features/daily-plan/chat-history'
import { createId } from '@/lib/create-id'

import type {
  PendingTag,
  PlanChat,
  PlanChatId,
  PlanChatMessage,
} from '@/features/daily-plan/types'

const MAX_CHATS = 30

type DailyPlanState = {
  chatsById: Record<PlanChatId, PlanChat>
  activeChatId: PlanChatId | null
  draft: string
  hasHydrated: boolean

  ensureActiveChat: () => PlanChatId
  setDraft: (text: string) => void
  appendMessage: (msg: PlanChatMessage) => void
  appendMessageTo: (chatId: PlanChatId, msg: PlanChatMessage) => void
  setTaskTags: (messageIndex: number, taskIndex: number, tags: PendingTag[]) => void
  finishActiveChat: (createdTodoCount: number) => void
  startNewChat: () => void
  resumeChat: (id: PlanChatId) => void
  deleteChat: (id: PlanChatId) => void
}

function withoutEmptyChat(
  chatsById: Record<PlanChatId, PlanChat>,
  id: PlanChatId | null,
): Record<PlanChatId, PlanChat> {
  if (id === null) return chatsById
  const chat = chatsById[id]
  if (!chat || chat.messages.length > 0) return chatsById
  const { [id]: _removed, ...rest } = chatsById
  return rest
}

// A persisted chat is only usable if the fields every reader touches survived:
// sortChatsByRecency calls updatedAt.localeCompare and withoutEmptyChat reads
// messages.length. A missing title or count only degrades cosmetically.
function isUsableChat(value: unknown): value is PlanChat {
  if (typeof value !== 'object' || value === null) return false
  const chat = value as Partial<PlanChat>
  return Array.isArray(chat.messages) && typeof chat.updatedAt === 'string'
}

function sanitizeChats(value: unknown): Record<PlanChatId, PlanChat> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}

  const next: Record<PlanChatId, PlanChat> = {}
  for (const [id, chat] of Object.entries(value)) {
    if (isUsableChat(chat)) next[id] = { ...chat, id }
  }
  return next
}

export const useDailyPlanStore = create<DailyPlanState>()(
  persist(
    (set, get) => ({
      chatsById: {},
      activeChatId: null,
      draft: '',
      hasHydrated: false,

      ensureActiveChat: () => {
        const { activeChatId, chatsById } = get()
        if (activeChatId !== null && chatsById[activeChatId]) return activeChatId

        const id = createId()
        const now = new Date().toISOString()
        const chat: PlanChat = {
          id,
          title: 'Untitled plan',
          messages: [],
          createdTodoCount: 0,
          createdAt: now,
          updatedAt: now,
        }

        // Prune here as well as in finishActiveChat: a user who chats, dislikes
        // the answer and taps "New chat" never finishes a chat, so this is the
        // only path that enforces the cap for them. The new id is passed as the
        // protected chat so the one being created can never be pruned.
        set((state) => ({
          chatsById: pruneChats({ ...state.chatsById, [id]: chat }, id, MAX_CHATS),
          activeChatId: id,
        }))
        return id
      },

      setDraft: (text) => set({ draft: text }),

      appendMessage: (msg) => {
        const id = get().activeChatId
        if (id === null) return
        get().appendMessageTo(id, msg)
      },

      // Targets a chat by id instead of re-reading activeChatId. Anything that
      // appends after an await must use this: the user can resume another chat
      // or start a new one while the request is still in flight.
      appendMessageTo: (chatId, msg) => {
        const chat = get().chatsById[chatId]
        if (!chat) return

        const isFirstUserMessage =
          msg.role === 'user' && !chat.messages.some((m) => m.role === 'user')

        set((state) => ({
          chatsById: {
            ...state.chatsById,
            [chatId]: {
              ...chat,
              title: isFirstUserMessage ? deriveChatTitle(msg.text) : chat.title,
              messages: [...chat.messages, msg],
              updatedAt: new Date().toISOString(),
            },
          },
        }))
      },

      setTaskTags: (messageIndex, taskIndex, tags) => {
        const id = get().activeChatId
        if (id === null) return
        const chat = get().chatsById[id]
        if (!chat) return

        const messages = chat.messages.map((msg, mi) => {
          if (mi !== messageIndex || !msg.tasks) return msg
          return {
            ...msg,
            tasks: msg.tasks.map((task, ti) =>
              ti === taskIndex ? { ...task, tags } : task,
            ),
          }
        })

        set((state) => ({
          chatsById: {
            ...state.chatsById,
            [id]: { ...chat, messages, updatedAt: new Date().toISOString() },
          },
        }))
      },

      finishActiveChat: (createdTodoCount) => {
        const id = get().activeChatId
        if (id === null) return
        const chat = get().chatsById[id]
        if (!chat) return

        const chatsById = {
          ...get().chatsById,
          [id]: {
            ...chat,
            createdTodoCount: chat.createdTodoCount + createdTodoCount,
            updatedAt: new Date().toISOString(),
          },
        }

        set({
          chatsById: pruneChats(chatsById, null, MAX_CHATS),
          activeChatId: null,
          draft: '',
        })
      },

      startNewChat: () => {
        const { chatsById, activeChatId } = get()
        set({
          chatsById: withoutEmptyChat(chatsById, activeChatId),
          activeChatId: null,
          draft: '',
        })
      },

      resumeChat: (id) => {
        const { chatsById, activeChatId } = get()
        if (!chatsById[id]) return
        const cleaned =
          activeChatId === id ? chatsById : withoutEmptyChat(chatsById, activeChatId)
        set({ chatsById: cleaned, activeChatId: id, draft: '' })
      },

      deleteChat: (id) => {
        set((state) => {
          const { [id]: _removed, ...rest } = state.chatsById
          return {
            chatsById: rest,
            activeChatId: state.activeChatId === id ? null : state.activeChatId,
          }
        })
      },
    }),
    {
      name: 'daily-plan',

      storage: createJSONStorage(() => AsyncStorage),

      // draft is deliberately NOT persisted: setDraft fires on every keystroke
      // and zustand/persist has no debounce, so persisting it would
      // JSON.stringify the whole chat archive once per character. The draft
      // still survives navigating away and back, since the store is
      // module-level -- and that navigation loss is the reported bug.
      partialize: (state) => ({
        chatsById: state.chatsById,
        activeChatId: state.activeChatId,
      }),

      version: 1,

      // A corrupt record must degrade to "that chat is gone", never to a crash
      // on open: sortChatsByRecency would throw on a non-object chatsById.
      // persisted is undefined when a version mismatch has no migration to run.
      merge: (persisted, current) => {
        const incoming = (persisted ?? {}) as Partial<DailyPlanState>
        const chatsById = sanitizeChats(incoming.chatsById)
        const activeChatId =
          typeof incoming.activeChatId === 'string' && chatsById[incoming.activeChatId]
            ? incoming.activeChatId
            : null

        // Only the two partialized fields come back from storage; draft and
        // hasHydrated keep their in-memory defaults.
        return { ...current, chatsById, activeChatId }
      },

      // The flag must be set on BOTH paths. On failure state is undefined, so
      // state?.… would silently skip and leave the screen blocked forever.
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('Failed to rehydrate daily plan', error)
        }

        useDailyPlanStore.setState({ hasHydrated: true })
      },
    },
  ),
)
