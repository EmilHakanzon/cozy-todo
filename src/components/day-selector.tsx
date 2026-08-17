import { Pressable, Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { isSameDay, isToday } from '@/lib/date-utils'
import { typography } from '@/themes/typography'

type DaySelectorProps = {
  days: Date[]
  selectedDate: Date
  onSelect: (date: Date) => void
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DaySelector({ days, selectedDate, onSelect }: DaySelectorProps) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: theme.spacing.xs,
      }}
    >
      {days.map((day) => {
        const selected = isSameDay(day, selectedDate)
        const today = isToday(day)

        return (
          <Pressable
            key={day.toISOString()}
            onPress={() => onSelect(day)}
            style={{
              alignItems: 'center',
              gap: theme.spacing.micro,
              paddingVertical: theme.spacing.xs,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: theme.radius.md,
              backgroundColor: selected ? theme.color.accent : 'transparent',
            }}
          >
            <Text
              style={{
                ...typography.meta,
                fontSize: 11,
                color: selected ? '#ffffff' : theme.color.text2,
              }}
            >
              {DAY_ABBR[day.getDay()]}
            </Text>
            <Text
              style={{
                ...typography.taskTitle,
                fontSize: 16,
                color: selected
                  ? '#ffffff'
                  : today
                    ? theme.color.accent
                    : theme.color.text,
              }}
            >
              {day.getDate()}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
