import { useCallback, useMemo, useState } from 'react'

import { toAiHistory } from '@/features/daily-plan/ai-history'
import { resolveTags } from '@/features/daily-plan/resolve-tags'
import { parseTaskInput } from '@/features/todos/input'
import { smartAddChat } from '@/lib/smart-add'
import { useDailyPlanStore } from '@/stores/daily-plan-store'
import { useListStore } from '@/stores/list-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useTagStore } from '@/stores/tag-store'
import { useTodoStore } from '@/stores/todo-store'

import type { PendingTag, PlanTask } from '@/features/daily-plan/types'

/** Shown whenever Smart Add cannot produce a plan, whatever the cause. */
const FALLBACK_REPLY =
  'I could not work that one out — try something like "call mom tomorrow at 5".'

/** A short canned line. Anything conversational is the AI's job. */
function localReply(tasks: PlanTask[]): string {
  if (tasks.length === 1) {
    return tasks[0].dueAt ? 'Got it — 1 task with a due date.' : 'Got it — 1 task.'
  }
  return `Found ${tasks.length} tasks.`
}

export function useDailyPlanChat() {
  const chatsById = useDailyPlanStore((s) => s.chatsById)
  const activeChatId = useDailyPlanStore((s) => s.activeChatId)
  const draft = useDailyPlanStore((s) => s.draft)
  const setDraft = useDailyPlanStore((s) => s.setDraft)
  const ensureActiveChat = useDailyPlanStore((s) => s.ensureActiveChat)
  const appendMessage = useDailyPlanStore((s) => s.appendMessage)
  const appendMessageTo = useDailyPlanStore((s) => s.appendMessageTo)
  const finishActiveChat = useDailyPlanStore((s) => s.finishActiveChat)
  const startNewChat = useDailyPlanStore((s) => s.startNewChat)

  const createTodo = useTodoStore((s) => s.createTodo)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const listsById = useListStore((s) => s.listsById)
  const tagsById = useTagStore((s) => s.tagsById)
  const createTag = useTagStore((s) => s.createTag)
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek)

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

  const existingTagNames = useMemo(
    () => Object.values(tagsById).map((t) => t.name),
    [tagsById],
  )

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

    // Pin the chat the reply belongs to. "New chat" and the history sheet stay
    // tappable while the request is in flight, so activeChatId can move on --
    // re-reading it after the await would file the reply under the wrong chat,
    // or drop it entirely once it is null.
    const chatId = ensureActiveChat()
    appendMessage({ role: 'user', text: trimmed })
    setDraft('')
    setIsSending(true)
    setError('')
    setSuccessMsg('')

    try {
      // Follow-ups always go to the AI: refining a plan needs conversational
      // state the local parser does not have.
      const isFirstMessage = messages.length === 0
      const local = isFirstMessage
        ? parseTaskInput(trimmed, new Date(), firstDayOfWeek)
        : null

      if (local !== null) {
        const tasks: PlanTask[] = local.map((task) => ({
          title: task.title,
          notes: task.notes,
          dueAt: task.dueAt,
          subtasks: task.subtasks,
          tags: resolveTags(task.tagNames, tagsById),
          recurrence: task.recurrence,
        }))

        // A tiny delay so the instant local answer does not feel jarring
        // next to the AI path, which shows the same typing indicator.
        await new Promise((resolve) => setTimeout(resolve, 250))

        appendMessageTo(chatId, { role: 'ai', text: localReply(tasks), tasks })
        return
      }

      try {
        const result = await smartAddChat(
          toAiHistory(messages),
          trimmed,
          existingTagNames,
        )
        appendMessageTo(chatId, {
          role: 'ai',
          text: result.message,
          tasks: result.todos.map((todo) => ({
            title: todo.title,
            notes: todo.notes,
            dueAt: todo.dueAt,
            subtasks: todo.subtasks,
            tags: resolveTags(todo.tags, tagsById),
            recurrence: null,
          })),
        })
      } catch {
        // Quota, offline, unparseable JSON -- degrade to a plain hint rather
        // than a red error. Smart Add is a bonus on top of the local parser.
        appendMessageTo(chatId, { role: 'ai', text: FALLBACK_REPLY })
      }
    } catch (e) {
      // A throw here means a bug in the local parser or tag resolution, not a
      // network problem. Degrade for the user, but keep the real error visible.
      console.error('Smart Add local path failed', e)
      appendMessageTo(chatId, { role: 'ai', text: FALLBACK_REPLY })
    } finally {
      setIsSending(false)
    }
  }, [
    draft,
    isSending,
    messages,
    firstDayOfWeek,
    tagsById,
    existingTagNames,
    ensureActiveChat,
    appendMessage,
    appendMessageTo,
    setDraft,
  ])

  const createTasks = useCallback(() => {
    if (latestTasks.length === 0) return

    if (defaultListId === '') {
      setError('Create a list first.')
      return
    }

    // Per-invocation cache keyed by lowercased name, so one new tag name used
    // by several tasks in the same batch is created exactly once.
    const idByName = new Map<string, string>()

    function tagIdFor(tag: PendingTag): string {
      const key = tag.name.toLowerCase()
      const cached = idByName.get(key)
      if (cached) return cached

      // A tag deleted in Settings while this chat sat in history leaves a
      // stale id behind -- treat it as new rather than writing a dead id.
      const stillExists = tag.tagId !== null && tagsById[tag.tagId] !== undefined
      const id = stillExists ? (tag.tagId as string) : createTag(tag.name, tag.color)

      idByName.set(key, id)
      return id
    }

    for (const task of latestTasks) {
      const parentId = createTodo({
        listId: defaultListId,
        title: task.title,
        notes: task.notes,
        dueAt: task.dueAt,
        tagIds: task.tags.map(tagIdFor),
      })

      if (task.recurrence !== null) {
        updateTodo(parentId, { recurrence: task.recurrence })
      }

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
  }, [
    latestTasks,
    defaultListId,
    tagsById,
    createTag,
    createTodo,
    updateTodo,
    finishActiveChat,
  ])

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
