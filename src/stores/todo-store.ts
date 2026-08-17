import { create } from 'zustand'

import type { Todo, TodoId, TodoListId } from '@/features/todos/types'
import { getDescendantIds, isDescendant } from '@/features/todos/todo-tree'
import { createId } from '@/lib/create-id'
import {
  scheduleTodoReminder,
  cancelTodoReminder,
} from '@/lib/notifications'
import { computeNextDueDate } from '@/lib/recurrence'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useSettingsStore } from '@/stores/settings-store'


type CreateTodoInput = {
  listId: TodoListId
  parentId?: TodoId | null
  title: string
  notes?: string
  dueAt?: string | null
}
type UpdateTodoInput = Partial<Pick<Todo, 'title' | 'notes' | 'dueAt' | 'recurrence' | 'tagIds'>>

type TodoState = {
  todosById: Record<TodoId, Todo>
  createTodo: (input: CreateTodoInput) => TodoId
  updateTodo: (id: TodoId, input: UpdateTodoInput) => void
  toggleTodo: (id: TodoId) => void
  deleteTodo: (id: TodoId) => void
  moveTodo: (ind: TodoId,targetParentId: TodoId | null) => void;
  changeList: (id: TodoId, newListId: TodoListId) => void;
  reorderTodo: (id: TodoId, newPosition: number) => void;
}

function nextSiblingPosition(
  todosById: Record<TodoId, Todo>,
  listId: TodoListId,
  parentId: TodoId | null,
  excludeId?: TodoId,
): number {
  const siblings = Object.values(todosById).filter(
    (t) => t.listId === listId && t.parentId === parentId && t.id !== excludeId,
  )
  return siblings.length === 0 ? 0 : Math.max(...siblings.map((t) => t.position)) + 1
}

function maybeScheduleReminder(todo: Todo) {
  if (useSettingsStore.getState().remindersEnabled) {
    scheduleTodoReminder(todo).catch(() => {})
  }
}

function maybeCancelReminder(todoId: TodoId) {
  if (useSettingsStore.getState().remindersEnabled) {
    cancelTodoReminder(todoId).catch(() => {})
  }
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
  todosById: {},
    

  createTodo: (input) => {
    const title = input.title.trim()

    if (!title) {
      throw new Error('Todo title cannot be empty')
    }

    const parentId = input.parentId ?? null

    if (parentId) {
      const parent = get().todosById[parentId]

      if (!parent) {
        throw new Error('Parent todo does not exist')
      }

      if (parent.listId !== input.listId) {
        throw new Error('Parent and child must belong to the same list')
      }
    }

    const now = new Date().toISOString()
    const id = createId()

    const position = nextSiblingPosition(get().todosById, input.listId, parentId)

    const todo: Todo = {
      id,
      listId: input.listId,
      parentId,

      title,
      notes: input.notes?.trim() ?? '',

      dueAt: input.dueAt ?? null,
      completedAt: null,
      recurrence: null,
      tagIds: [],

      position,

      createdAt: now,
      updatedAt: now,
    }

    set((state) => ({
      todosById: {
        ...state.todosById,
        [id]: todo,
      },
    }))

    const created = get().todosById[id]
    if (created) maybeScheduleReminder(created)

    return id
  },
  updateTodo: (id, input) => {
    const existing = get().todosById[id]

    if (!existing) {
      throw new Error('Todo does not exist')
    }

    const nextTitle = input.title !== undefined ? input.title.trim() : existing.title

    if (!nextTitle) {
      throw new Error('Todo title cannot be empty')
    }

    const updateTodo: Todo = {
      ...existing,
      ...input,
      title: nextTitle,
      notes: input.notes !== undefined ? input.notes.trim() : existing.notes,
      updatedAt: new Date().toISOString(),
    }

    set((state) => ({
      todosById: {
        ...state.todosById,
        [id]: updateTodo,
      },
    }))

    if (input.dueAt !== undefined) {
      const updated = get().todosById[id]
      if (updated) {
        if (updated.dueAt) {
          maybeScheduleReminder(updated)
        } else {
          maybeCancelReminder(id)
        }
      }
    }
  },
  toggleTodo: (id) => {
    const existing = get().todosById[id]

    if (!existing) {
      throw new Error('Todo does not exist')
    }

    const now = new Date().toISOString()

    if (!existing.completedAt && existing.recurrence && existing.dueAt) {
      const nextDueAt = computeNextDueDate(existing.dueAt, existing.recurrence)
      set((state) => ({
        todosById: {
          ...state.todosById,
          [id]: { ...existing, dueAt: nextDueAt, updatedAt: now },
        },
      }))
      const updated = get().todosById[id]
      if (updated) maybeScheduleReminder(updated)
      return
    }

    if (!existing.completedAt) {
      maybeCancelReminder(id)
    } else if (existing.dueAt) {
      maybeScheduleReminder({ ...existing, completedAt: null })
    }

    set((state) => ({
      todosById: {
        ...state.todosById,
        [id]: {
          ...existing,
          completedAt: existing.completedAt ? null : now,
          updatedAt: now,
        },
      },
    }))
  },
  deleteTodo: (id) => {
    const todosById = get().todosById

    if (!todosById[id]) {
      throw new Error('Todo does not exist')
    }

    const descendantIds = getDescendantIds(todosById, id)

    const idsToDelete = new Set([id, ...descendantIds])
    for (const deleteId of idsToDelete) {
      maybeCancelReminder(deleteId)
    }

    set((state) => {
      const nextTodoById = Object.fromEntries(
        Object.entries(state.todosById).filter(([todoId]) => !idsToDelete.has(todoId))
      )

      return {
        todosById: nextTodoById,
      }
    })
  },
  moveTodo: (id, targetParentId) => {
    const todosById = get().todosById
    const todo = todosById[id]

    if (!todo) {
      throw new Error('Todo does not exist')
    }

    if (targetParentId === id) {
      throw new Error('Todo cannot be its own parent')
    }

    let targetListId = todo.listId

    if (targetParentId) {
      const targetParent = todosById[targetParentId]

      if (!targetParent) {
        throw new Error('Target parent does not exist')
      }

      if (isDescendant(todosById, id, targetParentId)) {
        throw new Error('Cannot move todo into its own descendant')
      }

      targetListId = targetParent.listId
    }

    const nextPosition = nextSiblingPosition(todosById, targetListId, targetParentId, id)

    const now = new Date().toISOString()

    const descendantIds = getDescendantIds(todosById, id)

    set((state) => {
      const nextTodosById = {
        ...state.todosById,
      }

      nextTodosById[id] = {
        ...todo,
        parentId: targetParentId,
        listId: targetListId,
        position: nextPosition,
        updatedAt: now,
      }

      for (const descendantId of descendantIds) {
        const descendant = nextTodosById[descendantId]

        nextTodosById[descendantId] = {
          ...descendant,
          listId: targetListId,
          updatedAt: now,
        }
      }

      return {
        todosById: nextTodosById,
      }
    })
  },
  changeList: (id, newListId) => {
    const todosById = get().todosById
    const todo = todosById[id]

    if (!todo) throw new Error('Todo does not exist')

    const now = new Date().toISOString()
    const descendantIds = getDescendantIds(todosById, id)

    set((state) => {
      const next = { ...state.todosById }

      next[id] = { ...todo, listId: newListId, parentId: null, updatedAt: now }

      for (const descId of descendantIds) {
        next[descId] = { ...next[descId], listId: newListId, updatedAt: now }
      }

      return { todosById: next }
    })
  },
  reorderTodo: (id, newPosition) => {
    const todosById = get().todosById
    const todo = todosById[id]

    if (!todo) throw new Error('Todo does not exist')

    const siblings = Object.values(todosById)
      .filter(
        (t) =>
          t.listId === todo.listId &&
          t.parentId === todo.parentId &&
          t.id !== id,
      )
      .sort((a, b) => a.position - b.position)

    siblings.splice(newPosition, 0, todo)

    const now = new Date().toISOString()

    set((state) => {
      const next = { ...state.todosById }
      siblings.forEach((t, i) => {
        next[t.id] = { ...next[t.id], position: i, updatedAt: now }
      })
      return { todosById: next }
    })
  },
}),
 {
    name:'todo',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({
      todosById: state.todosById,
    }),
    version: 2,
    migrate: (persisted, version) => {
      const state = persisted as { todosById: Record<string, Todo> }
      if (version < 2) {
        for (const todo of Object.values(state.todosById)) {
          if (!todo.tagIds) todo.tagIds = []
        }
      }
      return state
    },
  }
  )
)