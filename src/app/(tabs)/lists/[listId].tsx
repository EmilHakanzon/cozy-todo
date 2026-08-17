import { useState, useMemo, useCallback } from 'react'
import { Pressable, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { DraggableTodoList } from '@/components/draggable-todo-list'
import { EditListSheet } from '@/components/edit-list-sheet'
import { InlineQuickAdd } from '@/components/quick-add'
import { SegmentedControl } from '@/components/segmented-control'
import { SwipeableTodoItem } from '@/components/swipeable-todo-item'
import { getActiveTodos, getCompletedTodos, getRootTodos } from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { useTodoStore } from '@/stores/todo-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

type ListFilter = 'all' | 'active' | 'completed'

const SEGMENTS = [
  { key: 'all' as const, label: 'All' },
  { key: 'active' as const, label: 'Active' },
  { key: 'completed' as const, label: 'Completed' },
]

const BACK_ICON: SymbolViewProps['name'] = { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }
const LIST_ICON: SymbolViewProps['name'] = { ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }
const EDIT_ICON: SymbolViewProps['name'] = { ios: 'pencil', android: 'edit', web: 'edit' }

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>()
  const { theme, resolvedTheme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const list = useListStore((s) => s.listsById[listId])
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const reorderTodo = useTodoStore((s) => s.reorderTodo)
  const [filter, setFilter] = useState<ListFilter>('all')
  const [showEditSheet, setShowEditSheet] = useState(false)

  const handleTodoPress = useCallback(
    (id: string) => router.push({ pathname: '/todo/[todoId]', params: { todoId: id } }),
    [],
  )

  const rootTodos = useMemo(() => getRootTodos(todosById, listId), [todosById, listId])
  const activeTodos = useMemo(() => getActiveTodos(rootTodos), [rootTodos])
  const completedTodos = useMemo(() => getCompletedTodos(rootTodos), [rootTodos])

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      const todo = activeTodos[fromIndex]
      if (todo) reorderTodo(todo.id, toIndex)
    },
    [activeTodos, reorderTodo],
  )

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
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.screenTitle, fontSize: 24, color: theme.color.text }}>
                {list.name}
              </Text>
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                {rootTodos.length} {rootTodos.length === 1 ? 'task' : 'tasks'}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowEditSheet(true)}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <SymbolView name={EDIT_ICON} size={20} tintColor={theme.color.text2} />
            </Pressable>
          </View>
        </View>

        <SegmentedControl segments={SEGMENTS} value={filter} onChange={setFilter} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: 120,
        }}
      >
        {filter === 'all' && activeTodos.length > 0 && (
          <Text
            style={{
              ...typography.sectionTitle,
              color: theme.color.text2,
              paddingTop: theme.spacing.lg,
              paddingBottom: theme.spacing.xs,
            }}
          >
            {`ACTIVE (${activeTodos.length})`}
          </Text>
        )}

        {(filter === 'all' || filter === 'active') && activeTodos.length > 0 && (
          <DraggableTodoList
            items={activeTodos}
            keyExtractor={(todo) => todo.id}
            renderItem={(todo) => (
              <SwipeableTodoItem
                todo={todo}
                onToggle={toggleTodo}
                onPress={handleTodoPress}
              />
            )}
            onReorder={handleReorder}
            itemHeight={52}
          />
        )}

        {filter === 'all' && completedTodos.length > 0 && (
          <Text
            style={{
              ...typography.sectionTitle,
              color: theme.color.text2,
              paddingTop: theme.spacing.lg,
              paddingBottom: theme.spacing.xs,
            }}
          >
            {`COMPLETED (${completedTodos.length})`}
          </Text>
        )}

        {(filter === 'all' || filter === 'completed') &&
          completedTodos.map((todo) => (
            <SwipeableTodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onPress={handleTodoPress}
            />
          ))}

        {displayedTodos.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>
              {filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
            </Text>
          </View>
        )}

        {filter !== 'completed' && <InlineQuickAdd listId={listId} />}
      </ScrollView>

      {list && (
        <EditListSheet
          visible={showEditSheet}
          list={list}
          onClose={() => setShowEditSheet(false)}
        />
      )}
    </View>
  )
}
