import { create } from 'zustand'

type QuickAddState = {
  isOpen: boolean
  defaultListId: string | null
  defaultParentId: string | null
  open: (listId?: string, parentId?: string) => void
  close: () => void
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  isOpen: false,
  defaultListId: null,
  defaultParentId: null,
  open: (listId, parentId) =>
    set({ isOpen: true, defaultListId: listId ?? null, defaultParentId: parentId ?? null }),
  close: () => set({ isOpen: false, defaultListId: null, defaultParentId: null }),
}))
