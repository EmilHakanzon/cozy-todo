import { Text, View } from 'react-native'

import { TaskPreviewCard } from '@/components/daily-plan/task-preview-card'
import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { PlanChatMessage } from '@/features/daily-plan/types'

type ChatMessageBubbleProps = {
  message: PlanChatMessage
  timeFormat: string
}

export function ChatMessageBubble({ message, timeFormat }: ChatMessageBubbleProps) {
  const { theme } = useAppTheme()

  if (message.role === 'user') {
    return (
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: theme.color.accent,
              borderRadius: theme.radius.lg,
              borderBottomRightRadius: theme.radius.sm,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              maxWidth: '80%',
            }}
          >
            <Text style={{ ...typography.body, color: '#ffffff' }}>{message.text}</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
      <View style={{ maxWidth: '90%' }}>
        {message.text !== '' && (
          <View
            style={{
              backgroundColor: theme.color.surfaceSoft,
              borderRadius: theme.radius.lg,
              borderBottomLeftRadius: theme.radius.sm,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
            }}
          >
            <Text style={{ ...typography.body, color: theme.color.text, lineHeight: 22 }}>
              {message.text}
            </Text>
          </View>
        )}
        {message.tasks && message.tasks.length > 0 && (
          <TaskPreviewCard tasks={message.tasks} timeFormat={timeFormat} />
        )}
      </View>
    </View>
  )
}
