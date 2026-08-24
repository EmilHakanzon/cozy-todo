import { Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { ParsedTodo } from '@/lib/smart-add'

type TaskPreviewCardProps = {
  tasks: ParsedTodo[]
  timeFormat: string
}

export function TaskPreviewCard({ tasks, timeFormat }: TaskPreviewCardProps) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        marginTop: theme.spacing.xs,
        backgroundColor: theme.color.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.color.accent + '30',
        overflow: 'hidden',
      }}
    >
      {tasks.map((task, j) => (
        <TaskPreviewRow
          key={j}
          task={task}
          showBorder={j < tasks.length - 1}
          timeFormat={timeFormat}
        />
      ))}
    </View>
  )
}

function TaskPreviewRow({
  task,
  showBorder,
  timeFormat,
}: {
  task: ParsedTodo
  showBorder: boolean
  timeFormat: string
}) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        padding: theme.spacing.md,
        borderBottomWidth: showBorder ? 1 : 0,
        borderBottomColor: theme.color.border,
      }}
    >
      <Text
        style={{
          ...typography.body,
          fontFamily: 'Manrope_600SemiBold',
          color: theme.color.text,
        }}
      >
        {task.title}
      </Text>
      {task.dueAt && (
        <Text
          style={{
            ...typography.meta,
            color: theme.color.accent,
            paddingTop: 2,
          }}
        >
          {new Date(task.dueAt).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            ...(task.dueAt.includes('T')
              ? {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: timeFormat === '12h',
                }
              : {}),
          })}
        </Text>
      )}
      {task.notes !== '' && (
        <Text
          style={{
            ...typography.meta,
            color: theme.color.text2,
            paddingTop: 2,
          }}
          numberOfLines={2}
        >
          {task.notes}
        </Text>
      )}
      {task.subtasks.length > 0 && (
        <View style={{ paddingTop: theme.spacing.xs }}>
          {task.subtasks.map((sub, j) => (
            <View
              key={j}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                paddingVertical: 2,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  borderWidth: 1,
                  borderColor: theme.color.text2,
                }}
              />
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>{sub}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
