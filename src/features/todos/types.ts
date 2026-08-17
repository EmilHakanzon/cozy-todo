export type TodoId = string;
export type TodoListId = string;

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type Recurrence = {
  frequency: RecurrenceFrequency
  interval: number
}

export type Todo = {
  id: TodoId
  listId: TodoListId
  parentId: TodoId | null
  title: string
  notes: string
  dueAt: string | null
  completedAt: string | null
  recurrence: Recurrence | null
  createdAt: string
  updatedAt: string
  position: number
}

export type TodoById = Record<TodoId, Todo>