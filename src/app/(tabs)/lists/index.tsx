import { useState, useMemo } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'

import { CreateListSheet } from '@/components/create.list-sheet'
import { ListCard } from '@/components/list-card'
import { ScreenHeader } from '@/components/screen-header'
import { getTodoCountForList, getActiveCountForList } from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

export default function ListsScreen() {
  const { theme } = useAppTheme()
  const listsById = useListStore((s) => s.listsById)
  const todosById = useTodoStore((s) => s.todosById)
  const [showCreateSheet, setShowCreateSheet] = useState(false)

  const lists = useMemo(() => Object.values(listsById), [listsById])

  const totalTasks = useMemo(
    () => lists.reduce((sum, list) => sum + getTodoCountForList(todosById, list.id), 0),
    [lists, todosById],
  )

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <ScreenHeader
        title="Lists"
        subtitle={`${lists.length} ${lists.length === 1 ? 'list' : 'lists'} · ${totalTasks} tasks`}
      />

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: 120,
        }}
        renderItem={({ item }) => (
          <ListCard
            list={item}
            todoCount={getTodoCountForList(todosById, item.id)}
            activeCount={getActiveCountForList(todosById, item.id)}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/lists/[listId]',
                params: { listId: item.id },
              })
            }
          />
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: theme.color.border }} />
        )}
        ListFooterComponent={
          <Pressable
            onPress={() => setShowCreateSheet(true)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: theme.spacing.md,
              gap: theme.spacing.xs,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ ...typography.body, color: theme.color.text2 }}>+ Create new list</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>No lists yet</Text>
          </View>
        }
      />

      <CreateListSheet visible={showCreateSheet} onClose={() => setShowCreateSheet(false)} />
    </View>
  )
}
