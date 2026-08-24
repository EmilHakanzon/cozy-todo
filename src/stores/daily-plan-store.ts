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

        set((state) => ({
          chatsById: { ...state.chatsById, [id]: chat },
          activeChatId: id,
        }))
        return id
      },

      setDraft: (text) => set({ draft: text }),

      appendMessage: (msg) => {
        const id = get().activeChatId
        if (id === null) return
        const chat = get().chatsById[id]
        if (!chat) return

        const isFirstUserMessage =
          msg.role === 'user' && !chat.messages.some((m) => m.role === 'user')

        set((state) => ({
          chatsById: {
            ...state.chatsById,
            [id]: {
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
      partialize: (state) => ({
        chatsById: state.chatsById,
        activeChatId: state.activeChatId,
        draft: state.draft,
      }),
      onRehydrateStorage: () => () => {
        useDailyPlanStore.setState({ hasHydrated: true })
      },
    },
  ),
)
