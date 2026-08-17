import { Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'

import { TodoCheckbox } from './todo-checkbox'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useSettingsStore } from '@/stores/settings-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { TodoList } from '@/features/lists/types'
import type { Todo, TodoId } from '@/features/todos/types'

type TimeGridProps = {
  columns: { todos: Todo[] }[]
  columnHeaders?: string[]
  listsById: Record<string, TodoList>
  startHour?: number
  endHour?: number
  hourHeight?: number
  onToggle: (id: TodoId) => void
}

const BLOCK_HEIGHT = 48

function isAllDay(todo: Todo): boolean {
  if (!todo.dueAt) return true
  const d = new Date(todo.dueAt)
  return d.getHours() === 0 && d.getMinutes() === 0
}

export function TimeGrid({
  columns,
  columnHeaders,
  listsById,
  startHour = 7,
  endHour = 21,
  hourHeight = 60,
  onToggle,
}: TimeGridProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const timeFormat = useSettingsStore((s) => s.timeFormat)
  const is12h = timeFormat === '12h'
  const listColors = listColorsFor(resolvedTheme)
  const totalHeight = (endHour - startHour) * hourHeight
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)

  const allDayByColumn = columns.map((col) => col.todos.filter(isAllDay))
  const timedByColumn = columns.map((col) => col.todos.filter((t) => !isAllDay(t)))
  const hasAnyAllDay = allDayByColumn.some((col) => col.length > 0)

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {columnHeaders && (
        <View style={{ flexDirection: 'row', paddingLeft: 48 }}>
          {columnHeaders.map((header, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: theme.spacing.micro,
              }}
            >
              <Text
                style={{
                  ...typography.meta,
                  fontSize: 11,
                  fontFamily: 'Manrope_500Medium',
                  color: theme.color.text2,
                  textAlign: 'center',
                }}
              >
                {header}
              </Text>
            </View>
          ))}
        </View>
      )}

      {hasAnyAllDay && (
        <View
          style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: theme.color.border,
          }}
        >
          <View style={{ width: 48, justifyContent: 'center' }}>
            <Text
              style={{
                ...typography.meta,
                fontSize: 11,
                color: theme.color.text2,
                textAlign: 'right',
                paddingRight: theme.spacing.xs,
              }}
            >
              All day
            </Text>
          </View>
          {allDayByColumn.map((todos, colIndex) => (
            <View
              key={colIndex}
              style={{
                flex: 1,
                borderLeftWidth: 1,
                borderLeftColor: theme.color.border,
                padding: 2,
                gap: 2,
              }}
            >
              {todos.map((todo) => {
                const list = listsById[todo.listId]
                const palette = list ? listColors[list.color] : null
                const isCompleted = todo.completedAt !== null

                return (
                  <Pressable
                    key={todo.id}
                    onPress={() => router.push({ pathname: '/todo/[todoId]', params: { todoId: todo.id } })}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.micro,
                      backgroundColor: palette?.background ?? theme.color.surfaceSoft,
                      borderRadius: theme.radius.sm,
                      borderLeftWidth: 3,
                      borderLeftColor: palette?.accent ?? theme.color.accent,
                      paddingHorizontal: theme.spacing.xs,
                      paddingVertical: theme.spacing.micro,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <TodoCheckbox checked={isCompleted} onToggle={() => onToggle(todo.id)} size={16} />
                    <Text
                      style={{
                        ...typography.meta,
                        fontFamily: 'Manrope_500Medium',
                        color: isCompleted ? theme.color.text2 : theme.color.text,
                        textDecorationLine: isCompleted ? 'line-through' : 'none',
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {todo.title}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', height: totalHeight }}>
        <View style={{ width: 48 }}>
          {hours.map((hour) => (
            <View
              key={hour}
              style={{ height: hourHeight, justifyContent: 'flex-start' }}
            >
              <Text
                style={{
                  ...typography.meta,
                  fontSize: 11,
                  color: theme.color.text2,
                  textAlign: 'right',
                  paddingRight: theme.spacing.xs,
                }}
              >
                {is12h
                  ? `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour} ${hour < 12 ? 'AM' : 'PM'}`
                  : `${String(hour).padStart(2, '0')}:00`}
              </Text>
            </View>
          ))}
        </View>

        {timedByColumn.map((todos, colIndex) => (
          <View
            key={colIndex}
            style={{
              flex: 1,
              position: 'relative',
              borderLeftWidth: 1,
              borderLeftColor: theme.color.border,
            }}
          >
            {hours.map((hour) => (
              <View
                key={hour}
                style={{
                  position: 'absolute',
                  top: (hour - startHour) * hourHeight,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: theme.color.border,
                }}
              />
            ))}

            {todos.map((todo) => {
              if (!todo.dueAt) return null
              const date = new Date(todo.dueAt)
              const todoHour = date.getHours() + date.getMinutes() / 60
              if (todoHour < startHour || todoHour >= endHour) return null

              const top = (todoHour - startHour) * hourHeight
              const list = listsById[todo.listId]
              const palette = list ? listColors[list.color] : null

              return (
                <Pressable
                  key={todo.id}
                  onPress={() => router.push({ pathname: '/todo/[todoId]', params: { todoId: todo.id } })}
                  style={({ pressed }) => ({
                    position: 'absolute',
                    top,
                    left: 2,
                    right: 2,
                    height: BLOCK_HEIGHT,
                    backgroundColor: palette?.background ?? theme.color.surfaceSoft,
                    borderRadius: theme.radius.sm,
                    borderLeftWidth: 3,
                    borderLeftColor: palette?.accent ?? theme.color.accent,
                    paddingHorizontal: theme.spacing.xs,
                    paddingVertical: theme.spacing.micro,
                    overflow: 'hidden',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      ...typography.meta,
                      fontFamily: 'Manrope_500Medium',
                      color: theme.color.text,
                    }}
                    numberOfLines={2}
                  >
                    {todo.title}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
