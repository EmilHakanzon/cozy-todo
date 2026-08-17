import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { formatTime, getDueUrgency, isDateOnly } from '@/lib/date-utils'
import { useListStore } from '@/stores/list-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useTagStore } from '@/stores/tag-store'
import { useTodoStore } from '@/stores/todo-store'
import { getTodoProgress } from '@/features/todos/selectors'
import { getChildren } from '@/features/todos/todo-tree'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'
import { TagPill } from './tag-pill'
import { TodoCheckbox } from './todo-checkbox'

import type { SymbolViewProps } from 'expo-symbols'
import type { Todo, TodoId } from '@/features/todos/types'

const REPEAT_ICON: SymbolViewProps['name'] = { ios: 'repeat', android: 'repeat', web: 'repeat' }

type TodoItemProps = {
  todo: Todo
  onToggle: (id: TodoId) => void
  onPress?: (id: TodoId) => void
  showListName?: boolean
}

export function TodoItem({ todo, onToggle, onPress, showListName = false }: TodoItemProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const list = useListStore((s) => s.listsById[todo.listId])
  const todosById = useTodoStore((s) => s.todosById)
  const tagsById = useTagStore((s) => s.tagsById)
  const timeFormat = useSettingsStore((s) => s.timeFormat)
  const children = getChildren(todosById, todo.id)
  const isCompleted = todo.completedAt !== null
  const hasChildren = children.length > 0

  const listColors = listColorsFor(resolvedTheme)
  const listColor = list ? listColors[list.color] : null

  const tags = (todo.tagIds ?? []).map((id) => tagsById[id]).filter(Boolean)
  const urgency = todo.dueAt ? getDueUrgency(todo.dueAt, isCompleted) : 'normal'

  const metaParts: string[] = []
  if (showListName && list) metaParts.push(list.name)
  if (todo.dueAt) {
    const dueDate = new Date(todo.dueAt)
    const now = new Date()
    const isSameDay =
      dueDate.getFullYear() === now.getFullYear() &&
      dueDate.getMonth() === now.getMonth() &&
      dueDate.getDate() === now.getDate()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isTomorrow =
      dueDate.getFullYear() === tomorrow.getFullYear() &&
      dueDate.getMonth() === tomorrow.getMonth() &&
      dueDate.getDate() === tomorrow.getDate()
    const hasTime = !isDateOnly(todo.dueAt)
    const timeStr = hasTime ? formatTime(todo.dueAt, timeFormat) : ''

    let dateLabel: string
    if (isSameDay) dateLabel = 'Today'
    else if (isTomorrow) dateLabel = 'Tomorrow'
    else dateLabel = dueDate.toLocaleDateString()

    if (urgency === 'overdue') {
      metaParts.push(`Overdue · ${dateLabel}${hasTime ? ` · ${timeStr}` : ''}`)
    } else if (urgency === 'dueSoon') {
      metaParts.push(hasTime ? `Due soon · ${timeStr}` : `Today`)
    } else {
      metaParts.push(`${dateLabel}${hasTime ? ` · ${timeStr}` : ''}`)
    }
  }
  if (hasChildren) {
    const progress = getTodoProgress(todosById, todo.id)
    metaParts.push(`${progress.completed} of ${progress.total}`)
  }

  return (
    <Pressable
      onPress={() => onPress?.(todo.id)}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <TodoCheckbox checked={isCompleted} onToggle={() => onToggle(todo.id)} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...typography.taskTitle,
            color: isCompleted ? theme.color.text2 : theme.color.text,
            textDecorationLine: isCompleted ? 'line-through' : 'none',
          }}
          numberOfLines={2}
        >
          {todo.title}
        </Text>
        {(metaParts.length > 0 || todo.recurrence || tags.length > 0) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.micro, marginTop: 2, flexWrap: 'wrap' }}>
            {showListName && listColor && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: listColor.accent,
                }}
              />
            )}
            {metaParts.length > 0 && (
              <Text style={{ ...typography.meta, color: urgency === 'overdue' ? theme.color.overdue : urgency === 'dueSoon' ? theme.color.dueSoon : theme.color.text2 }}>
                {metaParts.join(' · ')}
              </Text>
            )}
            {todo.recurrence && (
              <SymbolView name={REPEAT_ICON} size={12} tintColor={theme.color.text2} />
            )}
            {tags.map((tag) => (
              <TagPill key={tag.id} tag={tag} />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  )
}
