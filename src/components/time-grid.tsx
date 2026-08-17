import { ScrollView, Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
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

export function TimeGrid({
  columns,
  columnHeaders,
  listsById,
  startHour = 7,
  endHour = 21,
  hourHeight = 60,
}: TimeGridProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const listColors = listColorsFor(resolvedTheme)
  const totalHeight = (endHour - startHour) * hourHeight
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)

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
                {String(hour).padStart(2, '0')}:00
              </Text>
            </View>
          ))}
        </View>

        {columns.map((col, colIndex) => (
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

            {col.todos.map((todo) => {
              if (!todo.dueAt) return null
              const date = new Date(todo.dueAt)
              const todoHour = date.getHours() + date.getMinutes() / 60
              if (todoHour < startHour || todoHour >= endHour) return null

              const top = (todoHour - startHour) * hourHeight
              const list = listsById[todo.listId]
              const palette = list ? listColors[list.color] : null

              return (
                <View
                  key={todo.id}
                  style={{
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
                  }}
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
                </View>
              )
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
