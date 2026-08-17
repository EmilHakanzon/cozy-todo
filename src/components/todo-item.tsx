import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { useTodoStore } from '@/stores/todo-store'
import { getTodoProgress } from '@/features/todos/selectors'
import { getChildren } from '@/features/todos/todo-tree'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'
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
  const children = getChildren(todosById, todo.id)
  const isCompleted = todo.completedAt !== null
  const hasChildren = children.length > 0

  const listColors = listColorsFor(resolvedTheme)
  const listColor = list ? listColors[list.color] : null

  const metaParts: string[] = []
  if (showListName && list) metaParts.push(list.name)
  if (todo.dueAt) {
    const date = new Date(todo.dueAt)
    const today = new Date()
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    metaParts.push(isToday ? `Today · ${timeStr}` : date.toLocaleDateString())
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
        {(metaParts.length > 0 || todo.recurrence) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.micro, marginTop: 2 }}>
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
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              {metaParts.join(' · ')}
            </Text>
            {todo.recurrence && (
              <SymbolView name={REPEAT_ICON} size={12} tintColor={theme.color.text2} />
            )}
          </View>
        )}
      </View>
    </Pressable>
  )
}
