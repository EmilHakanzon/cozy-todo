import { create } from 'zustand'

type QuickAddState = {
  isOpen: boolean
  defaultListId: string | null
  open: (listId?: string) => void
  close: () => void
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  isOpen: false,
  defaultListId: null,
  open: (listId) => set({ isOpen: true, defaultListId: listId ?? null }),
  close: () => set({ isOpen: false, defaultListId: null }),
}))
