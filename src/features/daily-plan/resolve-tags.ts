import { TAG_COLORS } from '@/features/tags/types'

import type { PendingTag } from './types'
import type { Tag, TagId } from '@/features/tags/types'

const MAX_TAGS_PER_TASK = 3

/** Stable char-code sum so a given name always lands on the same colour. */
function colorForName(name: string) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return TAG_COLORS[sum % TAG_COLORS.length]
}

export function resolveTags(
  names: string[],
  tagsById: Record<TagId, Tag>,
): PendingTag[] {
  const existingByName = new Map<string, Tag>()
  for (const tag of Object.values(tagsById)) {
    existingByName.set(tag.name.trim().toLowerCase(), tag)
  }

  const seen = new Set<string>()
  const resolved: PendingTag[] = []

  for (const raw of names) {
    if (resolved.length >= MAX_TAGS_PER_TASK) break

    const name = raw.trim().replace(/\s+/g, ' ')
    if (name === '') continue

    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const match = existingByName.get(key)
    resolved.push(
      match
        ? { tagId: match.id, name: match.name, color: match.color }
        : { tagId: null, name, color: colorForName(key) },
    )
  }

  return resolved
}
