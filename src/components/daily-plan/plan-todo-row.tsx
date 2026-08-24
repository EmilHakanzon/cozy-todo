import { Pressable, Text } from 'react-native'

import { TodoCheckbox } from '@/components/todo-checkbox'
import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { Todo } from '@/features/todos/types'

type PlanTodoRowProps = {
  todo: Todo
  onToggle: (id: string) => void
  onPress: (id: string) => void
  showBorder: boolean
}

export function PlanTodoRow({ todo, onToggle, onPress, showBorder }: PlanTodoRowProps) {
  const { theme } = useAppTheme()
  const isCompleted = todo.completedAt !== null

  return (
    <Pressable
      onPress={() => onPress(todo.id)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: showBorder ? 1 : 0,
        borderBottomColor: theme.color.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <TodoCheckbox checked={isCompleted} onToggle={() => onToggle(todo.id)} size={20} />
      <Text
        style={{
          ...typography.body,
          flex: 1,
          color: isCompleted ? theme.color.text2 : theme.color.text,
          textDecorationLine: isCompleted ? 'line-through' : 'none',
        }}
        numberOfLines={1}
      >
        {todo.title}
      </Text>
    </Pressable>
  )
}
