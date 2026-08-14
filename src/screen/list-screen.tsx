import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { router } from 'expo-router'
import { FlatList, Text, View } from 'react-native'

export function ListScreen() {
  const { theme } = useAppTheme()

  const lists = useListStore((state) => Object.values(state.listsById))

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.color.background,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <Text style={{ color: theme.color.text, fontSize: 32, fontWeight: '600' }}>List</Text>
      <FlatList
        data={lists}
        keyExtractor={(lists) => lists.id}
        renderItem={({ item }) => (
          <Text
            onPress={() =>
              router.push({
                pathname: './list/[listId]',
                params: {
                  listId: item.id,
                },
              })
            }
            style={{ color: theme.color.text }}
          >
            ${item.name}
          </Text>
        )}
      />
    </View>
  )
}
