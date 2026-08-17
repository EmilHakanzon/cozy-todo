import { Text, View } from 'react-native'

import { TodoCheckbox } from './todo-checkbox'
import { getTodoProgress } from '@/features/todos/selectors'
import { getChildren } from '@/features/todos/todo-tree'
import { useAppTheme } from '@/hooks/use-app-theme'
import { formatTime } from '@/lib/date-utils'
import { useListStore } from '@/stores/list-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useTodoStore } from '@/stores/todo-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { Todo, TodoId } from '@/features/todos/types'

type AgendaItemProps = {
  todo: Todo
  onToggle: (id: TodoId) => void
}

export function AgendaItem({ todo, onToggle }: AgendaItemProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const list = useListStore((s) => s.listsById[todo.listId])
  const todosById = useTodoStore((s) => s.todosById)
  const timeFormat = useSettingsStore((s) => s.timeFormat)
  const children = getChildren(todosById, todo.id)
  const isCompleted = todo.completedAt !== null
  const hasChildren = children.length > 0

  const listColors = listColorsFor(resolvedTheme)
  const listColor = list ? listColors[list.color] : null

  const timeStr = todo.dueAt ? formatTime(todo.dueAt, timeFormat) : ''

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: theme.spacing.sm,
      }}
    >
      <View style={{ width: 52, paddingTop: 2 }}>
        <Text
          style={{
            ...typography.meta,
            fontFamily: 'Manrope_500Medium',
            color: theme.color.text2,
          }}
        >
          {timeStr}
        </Text>
      </View>

      <View
        style={{
          width: 3,
          alignSelf: 'stretch',
          borderRadius: 1.5,
          backgroundColor: listColor?.accent ?? theme.color.border,
          marginRight: theme.spacing.sm,
        }}
      />

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: theme.spacing.sm,
        }}
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.micro,
              marginTop: 2,
            }}
          >
            {listColor && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: listColor.accent,
                }}
              />
            )}
            {list && (
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                {list.name}
              </Text>
            )}
          </View>
          {hasChildren && (
            <Text style={{ ...typography.meta, color: theme.color.text2, marginTop: 2 }}>
              {getTodoProgress(todosById, todo.id).completed} /{' '}
              {getTodoProgress(todosById, todo.id).total}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}
