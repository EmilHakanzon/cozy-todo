import { useListStore } from '@/stores/list-store'

export function bootstrapApp() {
  const { listsById, createList } = useListStore.getState()

  if (Object.keys(listsById).length > 0) {
    return
  }

  createList({
    name: 'Personal',
    color: 'sage',
  })
}
