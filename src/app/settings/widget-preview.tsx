import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useTodoStore } from '@/stores/todo-store'
import { useListStore } from '@/stores/list-store'
import { useTagStore } from '@/stores/tag-store'
import { filterTodosForWidget } from '@/widgets/widget-data'
import type { WidgetTodo } from '@/widgets/widget-data'
import { typography } from '@/themes/typography'

const W = {
  bg: '#1e2119',
  surface: '#222520',
  text: '#e8e4da',
  textSecondary: '#9a9689',
  textDimmed: '#6a6558',
  accent: '#8bab7a',
  border: '#3a3f35',
} as const

const TAG_HEX: Record<string, string> = {
  red: '#c47a5a',
  orange: '#c4935a',
  yellow: '#c4a85a',
  green: '#8bab7a',
  blue: '#5a8ac4',
  purple: '#9a7ab8',
  pink: '#b87a9a',
  gray: '#9a9689',
}

function WidgetTodoRow({ todo }: { todo: WidgetTodo }) {
  const tagHex = todo.tagColor ? TAG_HEX[todo.tagColor] ?? null : null

  return (
    <View style={s.todoRow}>
      <View
        style={[
          s.circle,
          todo.completed && { backgroundColor: W.accent, borderColor: W.accent },
        ]}
      />
      <Text
        style={[
          s.todoTitle,
          todo.completed && { color: W.textDimmed },
        ]}
        numberOfLines={1}
      >
        {todo.title}
      </Text>
      {tagHex && <View style={[s.tagDot, { backgroundColor: tagHex }]} />}
    </View>
  )
}

export default function WidgetPreviewScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const todosById = useTodoStore((s) => s.todosById)
  const listsById = useListStore((s) => s.listsById)
  const tagsById = useTagStore((s) => s.tagsById)

  const widgetData = useMemo(
    () => filterTodosForWidget(todosById, listsById, tagsById),
    [todosById, listsById, tagsById],
  )

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.color.background }}
      contentContainerStyle={[
        s.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <Pressable onPress={() => router.back()} style={s.backBtn}>
        <Text style={[s.backText, { color: theme.color.text2 }]}>← Back</Text>
      </Pressable>

      <Text style={[typography.screenTitle, { color: theme.color.text }]}>
        Widget Preview
      </Text>
      <Text style={[s.subtitle, { color: theme.color.text2 }]}>
        How the Android widget will look with your current data
      </Text>

      {/* Widget frame */}
      <View style={s.widgetFrame}>
        <View style={s.widget}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.headerEmoji}>📋</Text>
              <Text style={s.headerTitle}>Today</Text>
            </View>
            <View style={s.headerRight}>
              <Pressable
                style={s.addBtn}
                onPress={() => {
                  router.back()
                  setTimeout(() => router.push('/(tabs)'), 100)
                }}
              >
                <Text style={s.addBtnText}>+</Text>
              </Pressable>
              <View style={s.smartBtn}>
                <Text style={s.smartBtnText}>✨</Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={s.divider} />

          {/* Body */}
          {widgetData.todos.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No tasks for today</Text>
              <Text style={s.emptySubtext}>Enjoy your day!</Text>
            </View>
          ) : (
            widgetData.todos.map((todo) => (
              <WidgetTodoRow key={todo.id} todo={todo} />
            ))
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={s.stats}>
        <Text style={[s.statLabel, { color: theme.color.text2 }]}>
          {widgetData.totalCount} {widgetData.totalCount === 1 ? 'task' : 'tasks'} today
        </Text>
        <Text style={[s.statLabel, { color: theme.color.text2 }]}>
          {widgetData.todos.filter((t) => t.completed).length} completed
        </Text>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 12,
  },
  backBtn: {
    marginBottom: 4,
  },
  backText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    marginBottom: 20,
  },
  widgetFrame: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#111',
    borderRadius: 16,
  },
  widget: {
    width: 320,
    minHeight: 200,
    backgroundColor: W.bg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerEmoji: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: W.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: W.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    color: '#ffffff',
  },
  smartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: W.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartBtnText: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: W.border,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  circle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: W.textSecondary,
  },
  todoTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: W.text,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: W.textSecondary,
  },
  emptySubtext: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: W.textDimmed,
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 8,
  },
  statLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
})
