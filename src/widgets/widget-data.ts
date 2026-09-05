'use no memo'

import AsyncStorage from '@react-native-async-storage/async-storage'

import type { Tag, TagColor } from '@/features/tags/types'
import type { TodoList, TodoListColor } from '@/features/lists/types'
import type { Todo, TodoById } from '@/features/todos/types'

export type WidgetTodo = {
  id: string
  title: string
  completed: boolean
  tagColor: TagColor | null
  listColor: TodoListColor
}

export type WidgetData = {
  todos: WidgetTodo[]
  totalCount: number
}

const DEFAULT_LIST_COLOR: TodoListColor = 'sage'

function parseZustandState<T>(raw: string | null): T | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    return (parsed?.state ?? null) as T | null
  } catch {
    return null
  }
}

export function filterTodosForWidget(
  todosById: TodoById,
  listsById: Record<string, TodoList>,
  tagsById: Record<string, Tag>,
): WidgetData {
  const today = new Date().toISOString().split('T')[0]

  const todayRootTodos = Object.values(todosById).filter(
    (todo) => todo.parentId === null && !!todo.dueAt?.startsWith(today),
  )

  const active = todayRootTodos
    .filter((todo) => !todo.completedAt)
    .sort((a, b) => a.position - b.position)

  const completed = todayRootTodos
    .filter((todo) => !!todo.completedAt)
    .sort((a, b) => a.position - b.position)

  const sorted: Todo[] = [...active, ...completed]

  const todos: WidgetTodo[] = sorted.map((todo) => {
    const firstTagId = todo.tagIds[0]
    const tag = firstTagId ? tagsById[firstTagId] : undefined
    const list = listsById[todo.listId]

    return {
      id: todo.id,
      title: todo.title,
      completed: !!todo.completedAt,
      tagColor: tag?.color ?? null,
      listColor: list?.color ?? DEFAULT_LIST_COLOR,
    }
  })

  return {
    todos,
    totalCount: todayRootTodos.length,
  }
}

export async function readWidgetData(): Promise<WidgetData> {
  const [todoRaw, listsRaw, tagsRaw] = await Promise.all([
    AsyncStorage.getItem('todo'),
    AsyncStorage.getItem('lists'),
    AsyncStorage.getItem('tags'),
  ])

  const todoState = parseZustandState<{ todosById: TodoById }>(todoRaw)
  const listsState = parseZustandState<{ listsById: Record<string, TodoList> }>(listsRaw)
  const tagsState = parseZustandState<{ tagsById: Record<string, Tag> }>(tagsRaw)

  const todosById = todoState?.todosById ?? {}
  const listsById = listsState?.listsById ?? {}
  const tagsById = tagsState?.tagsById ?? {}

  return filterTodosForWidget(todosById, listsById, tagsById)
}
