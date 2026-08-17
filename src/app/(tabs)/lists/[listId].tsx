import { useState, useMemo, useCallback } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { InlineQuickAdd } from '@/components/quick-add'
import { SegmentedControl } from '@/components/segmented-control'
import { TodoItem } from '@/components/todo-item'
import { getActiveTodos, getCompletedTodos, getRootTodos } from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { useTodoStore } from '@/stores/todo-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'
import type { Todo } from '@/features/todos/types'

type ListFilter = 'all' | 'active' | 'completed'

const SEGMENTS = [
  { key: 'all' as const, label: 'All' },
  { key: 'active' as const, label: 'Active' },
  { key: 'completed' as const, label: 'Completed' },
]

const BACK_ICON: SymbolViewProps['name'] = { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }
const LIST_ICON: SymbolViewProps['name'] = { ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }

type SectionItem =
  | { type: 'header'; label: string }
  | { type: 'todo'; todo: Todo }

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>()
  const { theme, resolvedTheme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const list = useListStore((s) => s.listsById[listId])
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const [filter, setFilter] = useState<ListFilter>('all')

  const handleTodoPress = useCallback(
    (id: string) => router.push({ pathname: '/todo/[todoId]', params: { todoId: id } }),
    [],
  )

  const rootTodos = useMemo(() => getRootTodos(todosById, listId), [todosById, listId])
  const activeTodos = useMemo(() => getActiveTodos(rootTodos), [rootTodos])
  const completedTodos = useMemo(() => getCompletedTodos(rootTodos), [rootTodos])

  const displayedTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return activeTodos
      case 'completed':
        return completedTodos
      case 'all':
        return rootTodos
    }
  }, [filter, rootTodos, activeTodos, completedTodos])

  if (!list) return null

  const listColors = listColorsFor(resolvedTheme)
  const palette = listColors[list.color]

  const sections: SectionItem[] = (() => {
    if (filter !== 'all') {
      return displayedTodos.map((todo) => ({ type: 'todo' as const, todo }))
    }
    return [
      ...(activeTodos.length > 0
        ? [{ type: 'header' as const, label: `ACTIVE (${activeTodos.length})` }]
        : []),
      ...activeTodos.map((todo) => ({ type: 'todo' as const, todo })),
      ...(completedTodos.length > 0
        ? [{ type: 'header' as const, label: `COMPLETED (${completedTodos.length})` }]
        : []),
      ...completedTodos.map((todo) => ({ type: 'todo' as const, todo })),
    ]
  })()

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <View style={{ paddingTop: insets.top + theme.spacing.md, paddingBottom: theme.spacing.md }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.micro, marginBottom: theme.spacing.md }}
          >
            <SymbolView name={BACK_ICON} size={18} tintColor={theme.color.text2} />
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>Lists</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: theme.radius.md,
                backgroundColor: palette.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SymbolView name={LIST_ICON} size={18} tintColor={palette.accent} />
            </View>
            <View>
              <Text style={{ ...typography.screenTitle, fontSize: 24, color: theme.color.text }}>
                {list.name}
              </Text>
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                {rootTodos.length} {rootTodos.length === 1 ? 'task' : 'tasks'}
              </Text>
            </View>
          </View>
        </View>

        <SegmentedControl segments={SEGMENTS} value={filter} onChange={setFilter} />
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item, index) => (item.type === 'todo' ? item.todo.id : `header-${index}`)}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: 120,
        }}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <Text
                style={{
                  ...typography.sectionTitle,
                  color: theme.color.text2,
                  paddingTop: theme.spacing.lg,
                  paddingBottom: theme.spacing.xs,
                }}
              >
                {item.label}
              </Text>
            )
          }
          return <TodoItem todo={item.todo} onToggle={toggleTodo} onPress={handleTodoPress} />
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>
              {filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
            </Text>
          </View>
        }
        ListFooterComponent={
          filter !== 'completed' ? <InlineQuickAdd listId={listId} /> : null
        }
      />
    </View>
  )
}
