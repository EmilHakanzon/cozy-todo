import { useState, useMemo, useCallback } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'

import { InlineQuickAdd } from '@/components/quick-add'
import { ScreenHeader } from '@/components/screen-header'
import { SegmentedControl } from '@/components/segmented-control'
import { TodoItem } from '@/components/todo-item'
import {
  getAllRootTodos,
  getActiveTodos,
  getCompletedTodos,
  getTodayTodos,
  getUpcomingTodos,
} from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const SETTINGS_ICON: SymbolViewProps['name'] = {
  ios: 'gearshape',
  android: 'settings',
  web: 'settings',
}

type Filter = 'today' | 'upcoming' | 'all'

const SEGMENTS = [
  { key: 'today' as const, label: 'My Day' },
  { key: 'upcoming' as const, label: 'Upcoming' },
  { key: 'all' as const, label: 'All' },
]

type SectionItem =
  | { type: 'header'; label: string; count: string }
  | { type: 'todo'; todo: import('@/features/todos/types').Todo }

export default function TodayScreen() {
  const { theme } = useAppTheme()
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const [filter, setFilter] = useState<Filter>('today')

  const handleTodoPress = useCallback(
    (id: string) => router.push({ pathname: '/todo/[todoId]', params: { todoId: id } }),
    [],
  )

  const allRootTodos = useMemo(() => getAllRootTodos(todosById), [todosById])

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'today':
        return getTodayTodos(allRootTodos)
      case 'upcoming':
        return getUpcomingTodos(allRootTodos)
      case 'all':
        return allRootTodos
    }
  }, [filter, allRootTodos])

  const activeTodos = useMemo(() => getActiveTodos(filteredTodos), [filteredTodos])
  const completedTodos = useMemo(() => getCompletedTodos(filteredTodos), [filteredTodos])

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const sections: SectionItem[] = [
    ...(activeTodos.length > 0
      ? [{
          type: 'header' as const,
          label: filter === 'today' ? 'MY DAY' : filter === 'upcoming' ? 'UPCOMING' : 'ALL TASKS',
          count: `${completedTodos.length} / ${filteredTodos.length}`,
        }]
      : []),
    ...activeTodos.map((todo) => ({ type: 'todo' as const, todo })),
    ...(completedTodos.length > 0
      ? [{ type: 'header' as const, label: 'COMPLETED', count: String(completedTodos.length) }]
      : []),
    ...completedTodos.map((todo) => ({ type: 'todo' as const, todo })),
  ]

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <ScreenHeader
        title="Today"
        subtitle={dateStr}
        rightAction={
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <SymbolView name={SETTINGS_ICON} size={22} tintColor={theme.color.text2} />
          </Pressable>
        }
      />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
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
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingTop: theme.spacing.lg,
                  paddingBottom: theme.spacing.xs,
                }}
              >
                <Text style={{ ...typography.sectionTitle, color: theme.color.text2 }}>
                  {item.label}
                </Text>
                <Text style={{ ...typography.meta, color: theme.color.text2 }}>{item.count}</Text>
              </View>
            )
          }
          return <TodoItem todo={item.todo} onToggle={toggleTodo} onPress={handleTodoPress} showListName />
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>
              {filter === 'today'
                ? 'No tasks for today'
                : filter === 'upcoming'
                  ? 'No upcoming tasks'
                  : 'No tasks yet'}
            </Text>
          </View>
        }
        ListFooterComponent={<InlineQuickAdd />}
      />
    </View>
  )
}
