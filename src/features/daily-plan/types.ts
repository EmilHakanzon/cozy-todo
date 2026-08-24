import type { TagColor, TagId } from '@/features/tags/types'
import type { Recurrence } from '@/features/todos/types'

export type PlanChatId = string

/** A tag attached to a proposed task. tagId === null means "create it on confirm". */
export type PendingTag = {
  tagId: TagId | null
  name: string
  color: TagColor
}

export type PlanTask = {
  title: string
  notes: string
  dueAt: string | null
  subtasks: string[]
  tags: PendingTag[]
  recurrence: Recurrence | null
}

export type PlanChatMessage = {
  role: 'user' | 'ai'
  text: string
  tasks?: PlanTask[]
}

export type PlanChat = {
  id: PlanChatId
  title: string
  messages: PlanChatMessage[]
  createdTodoCount: number
  createdAt: string
  updatedAt: string
}
