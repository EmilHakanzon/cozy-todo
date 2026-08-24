import { useCallback, useMemo, useState } from 'react'

import { toAiHistory } from '@/features/daily-plan/ai-history'
import { smartAddChat } from '@/lib/smart-add'
import { useDailyPlanStore } from '@/stores/daily-plan-store'
import { useListStore } from '@/stores/list-store'
import { useTodoStore } from '@/stores/todo-store'

import type { PlanTask } from '@/features/daily-plan/types'

export function useDailyPlanChat() {
  const chatsById = useDailyPlanStore((s) => s.chatsById)
  const activeChatId = useDailyPlanStore((s) => s.activeChatId)
  const draft = useDailyPlanStore((s) => s.draft)
  const setDraft = useDailyPlanStore((s) => s.setDraft)
  const ensureActiveChat = useDailyPlanStore((s) => s.ensureActiveChat)
  const appendMessage = useDailyPlanStore((s) => s.appendMessage)
  const finishActiveChat = useDailyPlanStore((s) => s.finishActiveChat)
  const startNewChat = useDailyPlanStore((s) => s.startNewChat)

  const createTodo = useTodoStore((s) => s.createTodo)
  const listsById = useListStore((s) => s.listsById)

  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const messages = useMemo(
    () => (activeChatId ? (chatsById[activeChatId]?.messages ?? []) : []),
    [chatsById, activeChatId],
  )

  const latestTasks = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === 'ai' && msg.tasks && msg.tasks.length > 0) return msg.tasks
    }
    return [] as PlanTask[]
  }, [messages])

  const defaultListId = useMemo(() => {
    const lists = Object.values(listsById)
    return lists.length > 0 ? lists[0].id : ''
  }, [listsById])

  const handleSetDraft = useCallback(
    (text: string) => {
      setDraft(text)
      setError('')
    },
    [setDraft],
  )

  const send = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed || isSending) return

    ensureActiveChat()
    appendMessage({ role: 'user', text: trimmed })
    setDraft('')
    setIsSending(true)
    setError('')
    setSuccessMsg('')

    try {
      const result = await smartAddChat(toAiHistory(messages), trimmed)
      appendMessage({
        role: 'ai',
        text: result.message,
        tasks: result.todos.map((todo) => ({
          title: todo.title,
          notes: todo.notes,
          dueAt: todo.dueAt,
          subtasks: todo.subtasks,
          tags: [],
          recurrence: null,
        })),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIsSending(false)
    }
  }, [draft, isSending, messages, ensureActiveChat, appendMessage, setDraft])

  const createTasks = useCallback(() => {
    if (latestTasks.length === 0) return

    if (defaultListId === '') {
      setError('Create a list first.')
      return
    }

    for (const task of latestTasks) {
      const parentId = createTodo({
        listId: defaultListId,
        title: task.title,
        notes: task.notes,
        dueAt: task.dueAt,
      })

      for (const subtaskTitle of task.subtasks) {
        createTodo({
          listId: defaultListId,
          parentId,
          title: subtaskTitle,
        })
      }
    }

    const count = latestTasks.length
    finishActiveChat(count)
    setSuccessMsg(`Created ${count} ${count === 1 ? 'task' : 'tasks'}`)
    setTimeout(() => setSuccessMsg(''), 3000)
  }, [latestTasks, defaultListId, createTodo, finishActiveChat])

  const handleStartNewChat = useCallback(() => {
    startNewChat()
    setError('')
    setSuccessMsg('')
  }, [startNewChat])

  return {
    messages,
    draft,
    setDraft: handleSetDraft,
    isSending,
    error,
    successMsg,
    hasChatContent: messages.length > 0,
    latestTasks,
    send,
    createTasks,
    startNewChat: handleStartNewChat,
  }
}
