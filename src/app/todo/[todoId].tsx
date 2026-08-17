import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { DateTimePicker } from '@/components/date-time-picker'
import { DetailRow } from '@/components/detail-row'
import { SubtaskGroup } from '@/components/subtask-group'
import { ListPicker } from '@/components/list-picker'
import { RecurrencePicker } from '@/components/recurrence-picker'
import { TodoCheckbox } from '@/components/todo-checkbox'
import { SwipeableTodoItem } from '@/components/swipeable-todo-item'
import { InlineQuickAdd } from '@/components/quick-add'
import { formatDueLabel, formatRecurrenceLabel } from '@/features/todos/format'
import { getChildren } from '@/features/todos/todo-tree'
import { getTodoProgress } from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { useTodoStore } from '@/stores/todo-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'
import type { Recurrence } from '@/features/todos/types'

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
}
const CALENDAR_ICON: SymbolViewProps['name'] = {
  ios: 'calendar',
  android: 'calendar_today',
  web: 'calendar_today',
}
const LIST_ICON: SymbolViewProps['name'] = {
  ios: 'list.bullet',
  android: 'format_list_bulleted',
  web: 'format_list_bulleted',
}
const REPEAT_ICON: SymbolViewProps['name'] = {
  ios: 'repeat',
  android: 'repeat',
  web: 'repeat',
}
const TRASH_ICON: SymbolViewProps['name'] = {
  ios: 'trash',
  android: 'delete',
  web: 'delete',
}

export default function TodoDetailScreen() {
  const { todoId } = useLocalSearchParams<{ todoId: string }>()
  const { theme, resolvedTheme } = useAppTheme()
  const insets = useSafeAreaInsets()

  const todo = useTodoStore((s) => s.todosById[todoId])
  const todosById = useTodoStore((s) => s.todosById)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)
  const changeList = useTodoStore((s) => s.changeList)
  const list = useListStore((s) => (todo ? s.listsById[todo.listId] : undefined))

  const [title, setTitle] = useState(todo?.title ?? '')
  const [notes, setNotes] = useState(todo?.notes ?? '')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showListPicker, setShowListPicker] = useState(false)
  const [showRecurrence, setShowRecurrence] = useState(false)

  const titleRef = useRef<TextInput>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const children = useMemo(
    () => (todo ? getChildren(todosById, todo.id) : []),
    [todosById, todo],
  )

  const progress = useMemo(
    () => (todo ? getTodoProgress(todosById, todo.id) : null),
    [todosById, todo],
  )

  const listColors = listColorsFor(resolvedTheme)
  const palette = list ? listColors[list.color] : null

  const scheduleAutoSave = useCallback(
    (field: 'title' | 'notes', value: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        if (!todo) return
        const trimmed = value.trim()
        if (field === 'title' && !trimmed) return
        if (field === 'title' && trimmed === todo.title) return
        if (field === 'notes' && value.trim() === todo.notes) return
        updateTodo(todo.id, { [field]: value })
      }, 600)
    },
    [todo, updateTodo],
  )

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const handleTitleChange = useCallback(
    (text: string) => {
      setTitle(text)
      scheduleAutoSave('title', text)
    },
    [scheduleAutoSave],
  )

  const handleNotesChange = useCallback(
    (text: string) => {
      setNotes(text)
      scheduleAutoSave('notes', text)
    },
    [scheduleAutoSave],
  )

  const handleDateConfirm = useCallback(
    (isoString: string | null) => {
      if (!todo) return
      updateTodo(todo.id, { dueAt: isoString })
      setShowDatePicker(false)
    },
    [todo, updateTodo],
  )

  const handleListSelect = useCallback(
    (newListId: string) => {
      if (!todo) return
      changeList(todo.id, newListId)
    },
    [todo, changeList],
  )

  const handleRecurrenceChange = useCallback(
    (value: Recurrence | null) => {
      if (!todo) return
      updateTodo(todo.id, { recurrence: value })
    },
    [todo, updateTodo],
  )

  const handleDelete = useCallback(() => {
    if (!todo) return
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTodo(todo.id)
          router.back()
        },
      },
    ])
  }, [todo, deleteTodo])

  const handleSubtaskPress = useCallback(
    (id: string) => router.push({ pathname: '/todo/[todoId]', params: { todoId: id } }),
    [],
  )

  if (!todo) return null

  const isCompleted = todo.completedAt !== null

  const recurrenceLabel = formatRecurrenceLabel(todo.recurrence)
  const dueLabel = formatDueLabel(todo.dueAt)

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <View
        style={{
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.sm,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => {
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current)
              const trimmedTitle = title.trim()
              if (trimmedTitle && trimmedTitle !== todo.title) {
                updateTodo(todo.id, { title })
              }
              const trimmedNotes = notes.trim()
              if (trimmedNotes !== todo.notes) {
                updateTodo(todo.id, { notes })
              }
            }
            router.back()
          }}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.micro }}
        >
          <SymbolView name={BACK_ICON} size={18} tintColor={theme.color.text2} />
          <Text style={{ ...typography.meta, color: theme.color.text2 }}>Back</Text>
        </Pressable>

        <Pressable onPress={handleDelete} hitSlop={8}>
          <SymbolView name={TRASH_ICON} size={20} tintColor={theme.color.text2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: theme.spacing.sm,
            paddingTop: theme.spacing.sm,
          }}
        >
          <View style={{ paddingTop: 4 }}>
            <TodoCheckbox checked={isCompleted} onToggle={() => toggleTodo(todo.id)} />
          </View>
          <TextInput
            ref={titleRef}
            value={title}
            onChangeText={handleTitleChange}
            style={{
              ...typography.screenTitle,
              fontSize: 24,
              flex: 1,
              color: isCompleted ? theme.color.text2 : theme.color.text,
              textDecorationLine: isCompleted ? 'line-through' : 'none',
              paddingVertical: 0,
            }}
            multiline
            blurOnSubmit
          />
        </View>

        <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.xs }}>
          <DetailRow
            icon={CALENDAR_ICON}
            label={dueLabel}
            labelColor={todo.dueAt ? theme.color.text : theme.color.text2}
            onPress={() => setShowDatePicker(true)}
          />

          <DetailRow
            iconSlot={
              palette && (
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: theme.radius.sm,
                    backgroundColor: palette.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SymbolView name={LIST_ICON} size={12} tintColor={palette.accent} />
                </View>
              )
            }
            label={list?.name ?? 'Unknown list'}
            onPress={() => setShowListPicker(true)}
          />

          <DetailRow
            icon={REPEAT_ICON}
            label={recurrenceLabel}
            labelColor={todo.recurrence ? theme.color.text : theme.color.text2}
            onPress={() => setShowRecurrence(true)}
          />
        </View>

        <View style={{ paddingTop: theme.spacing.lg }}>
          <Text
            style={{
              ...typography.sectionTitle,
              color: theme.color.text2,
              paddingBottom: theme.spacing.xs,
            }}
          >
            NOTES
          </Text>
          <TextInput
            value={notes}
            onChangeText={handleNotesChange}
            placeholder="Add notes..."
            placeholderTextColor={theme.color.text2}
            multiline
            style={{
              ...typography.body,
              color: theme.color.text,
              backgroundColor: theme.color.surfaceSoft,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        <View style={{ paddingTop: theme.spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: theme.spacing.xs,
            }}
          >
            <Text style={{ ...typography.sectionTitle, color: theme.color.text2 }}>
              SUBTASKS
            </Text>
            {progress && progress.total > 0 && (
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                {progress.completed} / {progress.total}
              </Text>
            )}
          </View>

          {children.length > 0 && (
            <SubtaskGroup>
              {children.map((child) => (
                <SwipeableTodoItem
                  key={child.id}
                  todo={child}
                  onToggle={toggleTodo}
                  onPress={handleSubtaskPress}
                />
              ))}
            </SubtaskGroup>
          )}

          <InlineQuickAdd listId={todo.listId} parentId={todo.id} />
        </View>
      </ScrollView>

      <DateTimePicker
        visible={showDatePicker}
        initialDate={todo.dueAt}
        onConfirm={handleDateConfirm}
        onCancel={() => setShowDatePicker(false)}
      />

      <ListPicker
        visible={showListPicker}
        currentListId={todo.listId}
        onSelect={handleListSelect}
        onCancel={() => setShowListPicker(false)}
      />

      <RecurrencePicker
        visible={showRecurrence}
        value={todo.recurrence}
        onChange={handleRecurrenceChange}
        onClose={() => setShowRecurrence(false)}
      />
    </View>
  )
}
