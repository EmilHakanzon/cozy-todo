import { formatDayHeader } from '@/lib/date-utils'

import { getChildren, sortByPosition } from './todo-tree'
import type { Todo, TodoById, TodoId, TodoListId } from './types'

export type AgendaSection =
  | { type: 'header'; label: string; count: number }
  | { type: 'todo'; todo: Todo }

export type TodoProgress = {
  total: number
  completed: number
}

export function getRootTodos(todosById: TodoById, listId: TodoListId): Todo[] {
  return sortByPosition(
    Object.values(todosById).filter((todo) => todo.listId === listId && todo.parentId === null)
  )
}

/**
 * Osorterad med flit: listan spänner över flera föräldrar, och position är bara
 * definierad bland syskon. En global sortering skulle antyda en ordning som
 * domänen inte har.
 */
export function getTodosForList(todosById: TodoById, listId: TodoListId): Todo[] {
  return Object.values(todosById).filter((todo) => todo.listId === listId)
}

export function getActiveTodos(todos: Todo[]): Todo[] {
  return todos.filter((todo) => todo.completedAt === null)
}

export function getCompletedTodos(todos: Todo[]): Todo[] {
  return todos.filter((todo) => todo.completedAt !== null)
}

/**
 * Räknar bara direkta barn — inte hela subträdet. "2 of 4 completed" på en
 * förälder ska matcha raderna man faktiskt ser under den.
 */
export function getTodoProgress(todosById: TodoById, parentId: TodoId): TodoProgress {
  const children = getChildren(todosById, parentId)

  return {
    total: children.length,
    completed: getCompletedTodos(children).length,
  }
}


export function getAllRootTodos(todosById: TodoById): Todo[] {
  return sortByPosition(
    Object.values(todosById).filter((todo) => todo.parentId === null)
  )
}

export function getTodayTodos(todos: Todo[]): Todo[] {
  const today = new Date().toISOString().split('T')[0]
  return todos.filter((todo) => todo.dueAt?.startsWith(today))
}

export function getUpcomingTodos(todos: Todo[]): Todo[] {
  const todayStr = new Date().toISOString().split('T')[0]
  return todos.filter((todo) => {
    if (!todo.dueAt) return false
    return todo.dueAt.split('T')[0] > todayStr
  })
}

export function getActiveCountForList(
  todosById: TodoById,
  listId: TodoListId,
): number {
  return Object.values(todosById).filter(
    (todo) =>
      todo.listId === listId &&
      todo.parentId === null &&
      todo.completedAt === null,
  ).length
}

export function getTodoCountForList(
  todosById:TodoById,
  listId: TodoListId,
): number {
  return Object.values(todosById).filter((todo) =>
  todo.listId === listId &&
todo.parentId === null,).length;
}

export function getTodosInDateRange(
  todosById: TodoById,
  startDate: string,
  endDate: string,
): Todo[] {
  return sortByPosition(
    Object.values(todosById).filter((todo) => {
      if (!todo.dueAt || todo.parentId !== null) return false
      const dueDate = todo.dueAt.split('T')[0]
      return dueDate >= startDate && dueDate <= endDate
    }),
  )
}

export function groupTodosByDate(todos: Todo[]): Map<string, Todo[]> {
  const groups = new Map<string, Todo[]>()
  for (const todo of todos) {
    if (!todo.dueAt) continue
    const dateStr = todo.dueAt.split('T')[0]
    const existing = groups.get(dateStr) ?? []
    existing.push(todo)
    groups.set(dateStr, existing)
  }
  return groups
}

export function getTodosForDate(todosById: TodoById, dateStr: string): Todo[] {
  return sortByPosition(
    Object.values(todosById).filter(
      (todo) => todo.parentId === null && todo.dueAt?.startsWith(dateStr),
    ),
  )
}

export function buildAgendaSections(todos: Todo[]): AgendaSection[] {
  const grouped = groupTodosByDate(todos)
  const sections: AgendaSection[] = []

  const sortedDates = [...grouped.keys()].sort()
  for (const dateStr of sortedDates) {
    const dateTodos = grouped.get(dateStr)!
    const date = new Date(dateStr + 'T00:00:00')
    sections.push({ type: 'header', label: formatDayHeader(date), count: dateTodos.length })
    const sorted = [...dateTodos].sort((a, b) => {
      if (!a.dueAt || !b.dueAt) return 0
      return a.dueAt.localeCompare(b.dueAt)
    })
    for (const todo of sorted) {
      sections.push({ type: 'todo', todo })
    }
  }

  return sections
}

export function searchTodos(todosById: TodoById, query: string): Todo[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []

  return Object.values(todosById).filter(
    (todo) =>
      todo.title.toLowerCase().includes(trimmed) ||
      todo.notes.toLowerCase().includes(trimmed),
  )
}