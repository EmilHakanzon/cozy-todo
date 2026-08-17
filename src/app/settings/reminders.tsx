import { useCallback, useState } from 'react'
import { Alert, Switch, Text, View } from 'react-native'

import { SettingsScreenHeader } from '@/components/settings-screen-header'
import { useAppTheme } from '@/hooks/use-app-theme'
import {
  requestNotificationPermission,
  rescheduleAllReminders,
  cancelAllReminders,
} from '@/lib/notifications'
import { useSettingsStore } from '@/stores/settings-store'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

export default function RemindersScreen() {
  const { theme } = useAppTheme()
  const remindersEnabled = useSettingsStore((s) => s.remindersEnabled)
  const setRemindersEnabled = useSettingsStore((s) => s.setRemindersEnabled)
  const todosById = useTodoStore((s) => s.todosById)
  const [toggling, setToggling] = useState(false)

  const handleToggle = useCallback(
    async (value: boolean) => {
      if (toggling) return
      setToggling(true)

      if (value) {
        const granted = await requestNotificationPermission()
        if (!granted) {
          Alert.alert(
            'Notifications disabled',
            'Enable notifications in your device settings to receive task reminders.',
          )
          setToggling(false)
          return
        }
        setRemindersEnabled(true)
        await rescheduleAllReminders(todosById)
      } else {
        setRemindersEnabled(false)
        await cancelAllReminders()
      }

      setToggling(false)
    },
    [toggling, todosById, setRemindersEnabled],
  )

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <SettingsScreenHeader title="Reminders" />

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: theme.spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.body, color: theme.color.text }}>
              Enable reminders
            </Text>
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              Get notified when tasks are due
            </Text>
          </View>
          <Switch
            value={remindersEnabled}
            onValueChange={handleToggle}
            disabled={toggling}
            trackColor={{ false: theme.color.border, true: theme.color.accent }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    </View>
  )
}
