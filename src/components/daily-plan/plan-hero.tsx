import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useWeather } from '@/hooks/use-weather'
import { useSettingsStore } from '@/stores/settings-store'
import { typography } from '@/themes/typography'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

type PlanHeroProps = {
  totalPlanned: number
}

export function PlanHero({ totalPlanned }: PlanHeroProps) {
  const { theme } = useAppTheme()
  const timeFormat = useSettingsStore((s) => s.timeFormat)
  const weather = useWeather()

  const formatClock = useCallback(
    () =>
      new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: timeFormat === '12h',
      }),
    [timeFormat]
  )
  const [clockTime, setClockTime] = useState(formatClock)
  useEffect(() => {
    setClockTime(formatClock())
    const id = setInterval(() => setClockTime(formatClock()), 30_000)
    return () => clearInterval(id)
  }, [formatClock])

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const weatherStr =
    weather.status === 'success'
      ? `${weather.data.icon} ${weather.data.temperature}°  ·  ${weather.data.description}`
      : ''

  return (
    <View
      style={{
        marginHorizontal: theme.spacing.lg,
        backgroundColor: theme.color.accentSoft,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
      }}
    >
      <Text
        style={{
          fontFamily: 'Manrope_600SemiBold',
          fontSize: 28,
          lineHeight: 34,
          color: theme.color.text,
        }}
      >
        {getGreeting()}
      </Text>
      <Text
        style={{
          ...typography.body,
          color: theme.color.text2,
          paddingTop: theme.spacing.micro,
        }}
      >
        {dateStr} · {clockTime}
      </Text>
      {weatherStr !== '' && (
        <Text
          style={{
            ...typography.meta,
            color: theme.color.text2,
            paddingTop: theme.spacing.micro,
          }}
        >
          {weatherStr}
        </Text>
      )}
      {totalPlanned > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            paddingTop: theme.spacing.md,
          }}
        >
          <View
            style={{
              backgroundColor: theme.color.accent,
              borderRadius: theme.radius.full,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                fontFamily: 'Manrope_600SemiBold',
                fontSize: 13,
                color: '#ffffff',
              }}
            >
              {totalPlanned}
            </Text>
          </View>
          <Text style={{ ...typography.meta, color: theme.color.text2 }}>
            {totalPlanned === 1 ? 'task' : 'tasks'} on your plate
          </Text>
        </View>
      )}
    </View>
  )
}
