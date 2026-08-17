import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { SettingsScreenHeader } from '@/components/settings-screen-header'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useSettingsStore } from '@/stores/settings-store'
import { typography } from '@/themes/typography'

import type { FirstDayOfWeek } from '@/stores/settings-store'
import type { SymbolViewProps } from 'expo-symbols'

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
}

const CALENDAR_ICON: SymbolViewProps['name'] = {
  ios: 'calendar',
  android: 'calendar_today',
  web: 'calendar_today',
}

const OPTIONS: { key: FirstDayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'sunday', label: 'Sunday' },
]

export default function FirstDayScreen() {
  const { theme } = useAppTheme()
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek)
  const setFirstDayOfWeek = useSettingsStore((s) => s.setFirstDayOfWeek)

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <SettingsScreenHeader title="First day of week" />

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        {OPTIONS.map((option) => {
          const isActive = firstDayOfWeek === option.key

          return (
            <Pressable
              key={option.key}
              onPress={() => setFirstDayOfWeek(option.key)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.md,
                gap: theme.spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <SymbolView
                name={CALENDAR_ICON}
                size={20}
                tintColor={isActive ? theme.color.accent : theme.color.text2}
              />
              <Text
                style={{
                  ...typography.body,
                  fontFamily: 'Manrope_500Medium',
                  flex: 1,
                  color: theme.color.text,
                }}
              >
                {option.label}
              </Text>
              {isActive && (
                <SymbolView name={CHECK_ICON} size={18} tintColor={theme.color.accent} />
              )}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
