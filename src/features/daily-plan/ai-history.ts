import type { PlanChatMessage } from './types'
import type { ChatMessage } from '@/lib/smart-add'

/**
 * Flattens app-side chat messages into the shape smart-add sends to the model.
 * PendingTag objects become plain names so smart-add never sees app types.
 */
export function toAiHistory(messages: PlanChatMessage[]): ChatMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    text: msg.text,
    todos: msg.tasks?.map((task) => ({
      title: task.title,
      dueAt: task.dueAt,
      notes: task.notes,
      subtasks: task.subtasks,
    })),
  }))
}
