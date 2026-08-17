import { Pressable, Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { isSameDay, isToday } from '@/lib/date-utils'
import { typography } from '@/themes/typography'

import type { FirstDayOfWeek } from '@/stores/settings-store'

type MonthCalendarProps = {
  year: number
  month: number
  selectedDate: Date | null
  taskDots: Map<string, number>
  onSelectDate: (date: Date) => void
  firstDayOfWeek?: FirstDayOfWeek
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekdayHeaders(firstDay: FirstDayOfWeek): string[] {
  const start = firstDay === 'sunday' ? 0 : 1
  return Array.from({ length: 7 }, (_, i) => WEEKDAY_NAMES[(start + i) % 7])
}

function getStartOffset(dayOfWeek: number, firstDay: FirstDayOfWeek): number {
  const start = firstDay === 'sunday' ? 0 : 1
  return (dayOfWeek - start + 7) % 7
}

export function MonthCalendar({
  year,
  month,
  selectedDate,
  taskDots,
  onSelectDate,
  firstDayOfWeek = 'monday',
}: MonthCalendarProps) {
  const { theme } = useAppTheme()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startOffset = getStartOffset(firstDay.getDay(), firstDayOfWeek)

  const days: (number | null)[] = [
    ...new Array(startOffset).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ]
  while (days.length % 7 !== 0) days.push(null)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {getWeekdayHeaders(firstDayOfWeek).map((day) => (
          <View
            key={day}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: theme.spacing.xs,
            }}
          >
            <Text
              style={{ ...typography.meta, fontSize: 11, color: theme.color.text2 }}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={di} style={{ flex: 1, height: 48 }} />
            }

            const date = new Date(year, month, day)
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const count = taskDots.get(dateStr) ?? 0
            const today = isToday(date)
            const selected = selectedDate ? isSameDay(date, selectedDate) : false

            return (
              <Pressable
                key={di}
                onPress={() => onSelectDate(date)}
                style={{
                  flex: 1,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: selected
                      ? theme.color.accent
                      : today
                        ? theme.color.accentSoft
                        : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      ...typography.meta,
                      fontFamily: 'Manrope_500Medium',
                      color: selected
                        ? '#ffffff'
                        : today
                          ? theme.color.accent
                          : theme.color.text,
                    }}
                  >
                    {day}
                  </Text>
                </View>
                {count > 0 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 2,
                      marginTop: 2,
                      position: 'absolute',
                      bottom: 2,
                    }}
                  >
                    {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                      <View
                        key={i}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: theme.color.accent,
                        }}
                      />
                    ))}
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}
