import { create } from 'zustand'

type QuickAddState = {
  isOpen: boolean
  defaultListId: string | null
  defaultParentId: string | null
  defaultDueDate: string | null
  open: (listId?: string, parentId?: string, dueDate?: string) => void
  close: () => void
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  isOpen: false,
  defaultListId: null,
  defaultParentId: null,
  defaultDueDate: null,
  open: (listId, parentId, dueDate) =>
    set({ isOpen: true, defaultListId: listId ?? null, defaultParentId: parentId ?? null, defaultDueDate: dueDate ?? null }),
  close: () => set({ isOpen: false, defaultListId: null, defaultParentId: null, defaultDueDate: null }),
}))
