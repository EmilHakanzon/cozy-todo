import { Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useSettingsStore } from '@/stores/settings-store'
import { formatTime } from '@/lib/date-utils'
import { typography } from '@/themes/typography'

import type { CalendarEvent } from '@/features/calendar/types'

type CalendarEventItemProps = {
  event: CalendarEvent
}

export function CalendarEventItem({ event }: CalendarEventItemProps) {
  const { theme } = useAppTheme()
  const timeFormat = useSettingsStore((s) => s.timeFormat)

  const timeLabel = event.allDay
    ? 'All day'
    : formatTime(event.startAt, timeFormat)

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
      }}
    >
      <View
        style={{
          width: 4,
          height: 32,
          borderRadius: 2,
          backgroundColor: event.color || theme.color.accent,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{ ...typography.taskTitle, color: theme.color.text }}
          numberOfLines={1}
        >
          {event.title}
        </Text>
        <Text style={{ ...typography.meta, color: theme.color.text2 }}>
          {timeLabel} · {event.calendarName}
        </Text>
      </View>
    </View>
  )
}
