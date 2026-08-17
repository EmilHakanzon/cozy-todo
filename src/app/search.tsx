import { useState, useMemo, useCallback } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { FlatList } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SwipeableTodoItem } from '@/components/swipeable-todo-item'
import { searchTodos } from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
}
const SEARCH_ICON: SymbolViewProps['name'] = {
  ios: 'magnifyingglass',
  android: 'search',
  web: 'search',
}
const CLEAR_ICON: SymbolViewProps['name'] = {
  ios: 'xmark.circle.fill',
  android: 'cancel',
  web: 'cancel',
}

export default function SearchScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const [query, setQuery] = useState('')

  const results = useMemo(
    () => searchTodos(todosById, query),
    [todosById, query],
  )

  const handleTodoPress = useCallback(
    (id: string) =>
      router.push({ pathname: '/todo/[todoId]', params: { todoId: id } }),
    [],
  )

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <View
        style={{
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <SymbolView name={BACK_ICON} size={18} tintColor={theme.color.text2} />
        </Pressable>

        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.color.surfaceSoft,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.sm,
            gap: theme.spacing.xs,
          }}
        >
          <SymbolView name={SEARCH_ICON} size={18} tintColor={theme.color.text2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks..."
            placeholderTextColor={theme.color.text2}
            autoFocus
            returnKeyType="search"
            style={{
              ...typography.body,
              flex: 1,
              color: theme.color.text,
              paddingVertical: theme.spacing.xs,
            }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <SymbolView name={CLEAR_ICON} size={18} tintColor={theme.color.text2} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: 120,
        }}
        renderItem={({ item }) => (
          <SwipeableTodoItem
            todo={item}
            onToggle={toggleTodo}
            onPress={handleTodoPress}
            showListName
          />
        )}
        ListEmptyComponent={
          query.trim().length > 0 ? (
            <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
              <Text style={{ ...typography.body, color: theme.color.text2 }}>
                No tasks match "{query}"
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
              <Text style={{ ...typography.body, color: theme.color.text2 }}>
                Search across all your tasks
              </Text>
            </View>
          )
        }
      />
    </View>
  )
}
