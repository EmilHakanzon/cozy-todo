import { useState, useMemo, useCallback } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { FlatList } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SwipeableTodoItem } from '@/components/swipeable-todo-item'
import { searchTodos } from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useTagStore } from '@/stores/tag-store'
import { useTodoStore } from '@/stores/todo-store'
import { tagColorsFor } from '@/themes/tag-color'
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
  const { theme, resolvedTheme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const tagsById = useTagStore((s) => s.tagsById)
  const [query, setQuery] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())

  const tags = useMemo(() => Object.values(tagsById), [tagsById])
  const tagPalettes = tagColorsFor(resolvedTheme)

  const results = useMemo(() => {
    const hasQuery = query.trim().length > 0
    const hasTagFilter = selectedTagIds.size > 0

    if (!hasQuery && !hasTagFilter) return []

    let candidates = hasQuery
      ? searchTodos(todosById, query)
      : Object.values(todosById)

    if (hasTagFilter) {
      candidates = candidates.filter((todo) =>
        (todo.tagIds ?? []).some((tagId) => selectedTagIds.has(tagId)),
      )
    }

    return candidates
  }, [todosById, query, selectedTagIds])

  const handleTodoPress = useCallback(
    (id: string) =>
      router.push({ pathname: '/todo/[todoId]', params: { todoId: id } }),
    [],
  )

  const toggleTagFilter = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }, [])

  const hasActiveFilters = query.trim().length > 0 || selectedTagIds.size > 0

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

      {tags.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            paddingHorizontal: theme.spacing.lg,
            gap: theme.spacing.xs,
            paddingBottom: theme.spacing.sm,
          }}
        >
          {tags.map((tag) => {
            const isActive = selectedTagIds.has(tag.id)
            const palette = tagPalettes[tag.color]
            return (
              <Pressable
                key={tag.id}
                onPress={() => toggleTagFilter(tag.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: 6,
                  borderRadius: theme.radius.full,
                  backgroundColor: isActive ? palette.background : theme.color.surfaceSoft,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: palette.text,
                  }}
                />
                <Text
                  style={{
                    ...typography.meta,
                    color: isActive ? palette.text : theme.color.text,
                  }}
                >
                  {tag.name}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}

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
          hasActiveFilters ? (
            <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
              <Text style={{ ...typography.body, color: theme.color.text2 }}>
                No tasks found
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
