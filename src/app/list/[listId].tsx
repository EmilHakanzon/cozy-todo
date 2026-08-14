import { useLocalSearchParams } from 'expo-router'

export default function ListDetailRoute() {
  const { listId } = useLocalSearchParams<{
    listId: string
  }>()

  return null
}
