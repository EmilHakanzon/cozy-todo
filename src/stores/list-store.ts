import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { TodoList, TodoListColor } from '@/features/lists/types'
import type { TodoListId } from '@/features/todos/types'
import { createId } from '@/lib/create-id'
import { useTodoStore } from '@/stores/todo-store'

type CreateListInput = {
  name: string
  color: TodoListColor
}

type ListState = {
  listsById: Record<TodoListId, TodoList>
  createList: (input: CreateListInput) => TodoListId
  renameList: (id: TodoListId, name: string) => void
  setListColor: (id: TodoListId, color: TodoListColor) => void
  deleteList: (id: TodoListId) => void
  hasHydrated: boolean
  setHasHydrated: (value: boolean) => void
}

export const useListStore = create<ListState>()(
  persist(
    (set, get) => ({
      listsById: {},
      hasHydrated: false,

      setHasHydrated: (value) => {
        set({ hasHydrated: value })
      },

      createList: (input) => {
        const name = input.name.trim()

        if (!name) {
          throw new Error('List name cannot be empty')
        }

        const id = createId()
        const now = new Date().toISOString()

        const list: TodoList = {
          id,
          name,
          color: input.color,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          listsById: {
            ...state.listsById,
            [id]: list,
          },
        }))

        return id
      },

      renameList: (id, name) => {
        const existing = get().listsById[id]

        if (!existing) {
          throw new Error('List does not exist')
        }

        const nextName = name.trim()

        if (!nextName) {
          throw new Error('List name cannot be empty')
        }

        set((state) => ({
          listsById: {
            ...state.listsById,
            [id]: {
              ...existing,
              name: nextName,
              updatedAt: new Date().toISOString(),
            },
          },
        }))
      },

      setListColor: (id, color) => {
        const existing = get().listsById[id]

        if (!existing) {
          throw new Error('List does not exist')
        }

        set((state) => ({
          listsById: {
            ...state.listsById,
            [id]: {
              ...existing,
              color,
              updatedAt: new Date().toISOString(),
            },
          },
        }))
      },

      deleteList: (id) => {
        if (!get().listsById[id]) {
          throw new Error('List does not exist')
        }

        useTodoStore.setState((state) => ({
          todosById: Object.fromEntries(
            Object.entries(state.todosById).filter(([, todo]) => todo.listId !== id)
          ),
        }))

        set((state) => {
          const nextListsById = { ...state.listsById }

          delete nextListsById[id]

          return {
            listsById: nextListsById,
          }
        })
      },
    }),
    {
      name: 'lists',

      storage: createJSONStorage(() => AsyncStorage),

      partialize: (state) => ({
        listsById: state.listsById,
      }),

      version: 1,

      // Flaggan måste sättas på BÅDA vägarna. Vid fel är `state` undefined,
      // så `state?.setHasHydrated(true)` skulle tyst hoppas över och lämna
      // bootstrap permanent blockerad. Vi går via storen i stället.
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('Failed to rehydrate lists', error)
        }

        useListStore.setState({ hasHydrated: true })
      },
    }
  )
)
