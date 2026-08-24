import type { PlanChat, PlanChatId } from './types'

const MAX_TITLE_LENGTH = 60

export function deriveChatTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean === '') return 'Untitled plan'
  if (clean.length <= MAX_TITLE_LENGTH) return clean
  return `${clean.slice(0, MAX_TITLE_LENGTH)}…`
}

export function sortChatsByRecency(
  chatsById: Record<PlanChatId, PlanChat>,
): PlanChat[] {
  // ISO-8601 strings sort lexicographically, so no Date parsing is needed.
  return Object.values(chatsById).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
}

export function pruneChats(
  chatsById: Record<PlanChatId, PlanChat>,
  activeChatId: PlanChatId | null,
  max: number,
): Record<PlanChatId, PlanChat> {
  const sorted = sortChatsByRecency(chatsById)
  if (sorted.length <= max) return chatsById

  const keep = new Set(sorted.slice(0, max).map((c) => c.id))
  if (activeChatId !== null) keep.add(activeChatId)

  const next: Record<PlanChatId, PlanChat> = {}
  for (const chat of sorted) {
    if (keep.has(chat.id)) next[chat.id] = chat
  }
  return next
}
