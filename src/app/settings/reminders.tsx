import { useCallback, useState } from 'react'
import { Alert, Pressable, Switch, Text, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '@/hooks/use-app-theme'
import {
  requestNotificationPermission,
  rescheduleAllReminders,
  cancelAllReminders,
} from '@/lib/notifications'
import { useSettingsStore } from '@/stores/settings-store'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
}

export default function RemindersScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
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
      <View
        style={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <SymbolView name={BACK_ICON} size={20} tintColor={theme.color.text2} />
        </Pressable>
        <Text style={{ ...typography.screenTitle, fontSize: 24, flex: 1, color: theme.color.text }}>
          Reminders
        </Text>
      </View>

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
