import { useCallback, useMemo, useState } from 'react'

import { toAiHistory } from '@/features/daily-plan/ai-history'
import { resolveTags } from '@/features/daily-plan/resolve-tags'
import { smartAddChat } from '@/lib/smart-add'
import { useDailyPlanStore } from '@/stores/daily-plan-store'
import { useListStore } from '@/stores/list-store'
import { useTagStore } from '@/stores/tag-store'
import { useTodoStore } from '@/stores/todo-store'

import type { PendingTag, PlanTask } from '@/features/daily-plan/types'
import type { SmartAddResult } from '@/lib/smart-add'

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
  const listsById = useListStore((s) => s.listsById)
  const tagsById = useTagStore((s) => s.tagsById)
  const createTag = useTagStore((s) => s.createTag)

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
      let result: SmartAddResult
      try {
        result = await smartAddChat(toAiHistory(messages), trimmed, existingTagNames)
      } catch (e) {
        // The AI is the only path now, so a failure means the feature genuinely
        // cannot produce a plan. Show the real reason -- smartAddChat already
        // turns a 429 into "Smart Add has reached its daily limit."
        setError(e instanceof Error ? e.message : 'Something went wrong')
        return
      }

      appendMessageTo(chatId, {
        role: 'ai',
        text: result.message,
        tasks: result.todos.map((todo) => ({
          title: todo.title,
          notes: todo.notes,
          dueAt: todo.dueAt,
          subtasks: todo.subtasks,
          tags: resolveTags(todo.tags, tagsById),
        })),
      })
    } catch (e) {
      // Tag resolution or a store write throwing must still leave the user with
      // a message rather than a spinner that simply stops.
      console.error('Smart Add failed', e)
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIsSending(false)
    }
  }, [
    draft,
    isSending,
    messages,
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
