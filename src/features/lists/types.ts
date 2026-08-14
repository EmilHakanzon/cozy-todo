import type { TodoListId } from '../todos/types'

// Arrayen är källan, typen härleds. Då kan UI:t iterera över färgerna utan att
// någon kan glömma uppdatera en av dem när en färg läggs till eller tas bort.
export const TODO_LIST_COLORS = [
  'sage',
  'terracotta',
  'ochre',
  'dustyBlue',
  'lavender',
  'taupe',
] as const

export type TodoListColor = (typeof TODO_LIST_COLORS)[number]

export type TodoList = {
  id: TodoListId
  name: string
  color: TodoListColor
  createdAt: string
  updatedAt: string
}

export type ListItemProps = {
  name: string
  color: TodoListColor
  taskCount: number
  onPress: () => void
}
