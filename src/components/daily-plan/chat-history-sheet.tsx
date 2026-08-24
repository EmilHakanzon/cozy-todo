import { useMemo } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native'

import { sortChatsByRecency } from '@/features/daily-plan/chat-history'
import { useAppTheme } from '@/hooks/use-app-theme'
import { addDays, isSameDay, isToday } from '@/lib/date-utils'
import { useDailyPlanStore } from '@/stores/daily-plan-store'
import { typography } from '@/themes/typography'

import type { PlanChat } from '@/features/daily-plan/types'

type ChatHistorySheetProps = {
  visible: boolean
  onClose: () => void
}

function formatChatDate(iso: string): string {
  const date = new Date(iso)
  if (isToday(date)) return 'Today'
  if (isSameDay(date, addDays(new Date(), -1))) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ChatHistorySheet({ visible, onClose }: ChatHistorySheetProps) {
  const { theme } = useAppTheme()
  const chatsById = useDailyPlanStore((s) => s.chatsById)
  const activeChatId = useDailyPlanStore((s) => s.activeChatId)
  const resumeChat = useDailyPlanStore((s) => s.resumeChat)
  const deleteChat = useDailyPlanStore((s) => s.deleteChat)

  const chats = useMemo(
    () => sortChatsByRecency(chatsById).filter((chat) => chat.id !== activeChatId),
    [chatsById, activeChatId],
  )

  const handlePress = (chat: PlanChat) => {
    resumeChat(chat.id)
    onClose()
  }

  const handleLongPress = (chat: PlanChat) => {
    Alert.alert(
      'Delete Chat',
      `Delete "${chat.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteChat(chat.id),
        },
      ],
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View
        style={{
          backgroundColor: theme.color.surface,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          padding: theme.spacing.lg,
          paddingBottom: 40,
          gap: theme.spacing.lg,
          maxHeight: '70%',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ width: 60 }} />
          <Text style={{ ...typography.taskTitle, color: theme.color.text }}>Past Chats</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>Close</Text>
          </Pressable>
        </View>

        {chats.length === 0 ? (
          <View
            style={{
              paddingVertical: theme.spacing.xl,
              alignItems: 'center',
            }}
          >
            <Text style={{ ...typography.body, color: theme.color.text2 }}>
              No past chats yet
            </Text>
          </View>
        ) : (
          <ScrollView>
            <View
              style={{
                backgroundColor: theme.color.surfaceSoft,
                borderRadius: theme.radius.lg,
                overflow: 'hidden',
              }}
            >
              {chats.map((chat, i) => (
                <Pressable
                  key={chat.id}
                  onPress={() => handlePress(chat)}
                  onLongPress={() => handleLongPress(chat)}
                  style={({ pressed }) => ({
                    paddingVertical: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.md,
                    borderBottomWidth: i < chats.length - 1 ? 1 : 0,
                    borderBottomColor: theme.color.border,
                    opacity: pressed ? 0.7 : 1,
                    gap: 2,
                  })}
                >
                  <Text
                    style={{ ...typography.body, color: theme.color.text }}
                    numberOfLines={1}
                  >
                    {chat.title}
                  </Text>
                  <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                    {formatChatDate(chat.updatedAt)} ·{' '}
                    {chat.createdTodoCount > 0
                      ? `${chat.createdTodoCount} ${chat.createdTodoCount === 1 ? 'task' : 'tasks'}`
                      : 'Draft'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}
