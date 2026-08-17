import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { createId } from '@/lib/create-id'

import type { Tag, TagColor, TagId } from '@/features/tags/types'

type TagState = {
  tagsById: Record<TagId, Tag>
  createTag: (name: string, color: TagColor) => TagId
  updateTag: (id: TagId, name: string, color: TagColor) => void
  deleteTag: (id: TagId) => void
}

export const useTagStore = create<TagState>()(
  persist(
    (set, get) => ({
      tagsById: {},

      createTag: (name, color) => {
        const id = createId()
        const tag: Tag = {
          id,
          name: name.trim(),
          color,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          tagsById: { ...state.tagsById, [id]: tag },
        }))
        return id
      },

      updateTag: (id, name, color) => {
        const existing = get().tagsById[id]
        if (!existing) return
        set((state) => ({
          tagsById: {
            ...state.tagsById,
            [id]: { ...existing, name: name.trim(), color },
          },
        }))
      },

      deleteTag: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.tagsById
          return { tagsById: rest }
        })
      },
    }),
    {
      name: 'tags',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ tagsById: state.tagsById }),
    },
  ),
)
