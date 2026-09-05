import { useCallback } from 'react'
import { Pressable, Switch, Text, View } from 'react-native'

import { SettingsScreenHeader } from '@/components/settings-screen-header'
import { useAppTheme } from '@/hooks/use-app-theme'
import { requestNotificationPermission } from '@/lib/notifications'
import { useSettingsStore } from '@/stores/settings-store'
import { typography } from '@/themes/typography'

const TIME_OPTIONS = [
  '06:00',
  '06:30',
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
]

function formatTimeLabel(time: string, format: '12h' | '24h'): string {
  if (format === '24h') return time
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export default function DailyPlanSettingsScreen() {
  const { theme } = useAppTheme()
  const {
    dailyPlanEnabled,
    dailyPlanTime,
    timeFormat,
    setDailyPlanEnabled,
    setDailyPlanTime,
  } = useSettingsStore()

  /**
   * Skärmen sätter bara flaggan. Själva schemaläggningen — och de färska
   * räkningarna i notistexten — ägs av useDailyPlanNotification.
   */
  const handleToggle = useCallback(
    async (value: boolean) => {
      if (!value) {
        setDailyPlanEnabled(false)
        return
      }
      const granted = await requestNotificationPermission()
      if (!granted) return
      setDailyPlanEnabled(true)
    },
    [setDailyPlanEnabled],
  )

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <SettingsScreenHeader title="Daily Plan" />

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.color.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.body, color: theme.color.text }}>
              Morning notification
            </Text>
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              Get a daily summary of your tasks
            </Text>
          </View>
          <Switch
            value={dailyPlanEnabled}
            onValueChange={handleToggle}
            trackColor={{ true: theme.color.accent, false: theme.color.border }}
          />
        </View>

        {dailyPlanEnabled && (
          <View style={{ paddingTop: theme.spacing.lg }}>
            <Text
              style={{
                ...typography.sectionTitle,
                color: theme.color.text2,
                paddingBottom: theme.spacing.sm,
              }}
            >
              NOTIFICATION TIME
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing.xs,
              }}
            >
              {TIME_OPTIONS.map((time) => {
                const isActive = dailyPlanTime === time
                return (
                  <Pressable
                    key={time}
                    onPress={() => setDailyPlanTime(time)}
                    style={({ pressed }) => ({
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      borderRadius: theme.radius.md,
                      backgroundColor: isActive
                        ? theme.color.accent
                        : theme.color.surfaceSoft,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        ...typography.body,
                        color: isActive ? '#ffffff' : theme.color.text,
                      }}
                    >
                      {formatTimeLabel(time, timeFormat)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
