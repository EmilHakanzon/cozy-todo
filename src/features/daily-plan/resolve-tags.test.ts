import { describe, expect, it } from 'vitest'

import { resolveTags } from './resolve-tags'

import type { Tag, TagId } from '@/features/tags/types'

const work: Tag = {
  id: 'tag-work',
  name: 'Work',
  color: 'purple',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const existing: Record<TagId, Tag> = { [work.id]: work }

describe('resolveTags', () => {
  it('matches an existing tag case-insensitively and reuses its id, name and colour', () => {
    expect(resolveTags(['WORK'], existing)).toEqual([
      { tagId: 'tag-work', name: 'Work', color: 'purple' },
    ])
  })

  it('marks an unknown name for creation', () => {
    const [tag] = resolveTags(['groceries'], existing)

    expect(tag.tagId).toBeNull()
    expect(tag.name).toBe('groceries')
  })

  it('gives the same unknown name the same colour regardless of the tag store', () => {
    const first = resolveTags(['groceries'], existing)[0]
    const second = resolveTags(['groceries'], {})[0]

    expect(first.color).toBe(second.color)
  })

  it('hashes the colour on the lowercased name, so casing cannot change it', () => {
    const lower = resolveTags(['groceries'], {})[0]
    const upper = resolveTags(['GROCERIES'], {})[0]

    expect(upper.color).toBe(lower.color)
  })

  it('dedupes case-insensitively, keeping the first occurrence', () => {
    expect(resolveTags(['home', 'Home', 'HOME'], {})).toHaveLength(1)
  })

  it('caps at three tags', () => {
    expect(resolveTags(['a', 'b', 'c', 'd', 'e'], {})).toHaveLength(3)
  })

  it('drops empty and whitespace-only names', () => {
    expect(resolveTags(['', '   ', 'real'], {})).toEqual([
      { tagId: null, name: 'real', color: expect.any(String) },
    ])
  })

  it('trims and collapses whitespace inside a name', () => {
    expect(resolveTags(['  side   project  '], {})[0].name).toBe('side project')
  })

  it('returns an empty array for an empty input', () => {
    expect(resolveTags([], existing)).toEqual([])
  })
})
