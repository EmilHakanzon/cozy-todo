import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useSettingsStore } from '@/stores/settings-store'
import { typography } from '@/themes/typography'

import type { TimeFormat } from '@/stores/settings-store'
import type { SymbolViewProps } from 'expo-symbols'

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
}

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
}

const CLOCK_ICON: SymbolViewProps['name'] = {
  ios: 'clock',
  android: 'schedule',
  web: 'schedule',
}

const OPTIONS: { key: TimeFormat; label: string; subtitle: string }[] = [
  { key: '24h', label: '24-hour', subtitle: '14:30' },
  { key: '12h', label: '12-hour', subtitle: '2:30 PM' },
]

export default function TimeFormatScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const timeFormat = useSettingsStore((s) => s.timeFormat)
  const setTimeFormat = useSettingsStore((s) => s.setTimeFormat)

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
          Time format
        </Text>
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        {OPTIONS.map((option) => {
          const isActive = timeFormat === option.key

          return (
            <Pressable
              key={option.key}
              onPress={() => setTimeFormat(option.key)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.md,
                gap: theme.spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <SymbolView
                name={CLOCK_ICON}
                size={20}
                tintColor={isActive ? theme.color.accent : theme.color.text2}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...typography.body,
                    fontFamily: 'Manrope_500Medium',
                    color: theme.color.text,
                  }}
                >
                  {option.label}
                </Text>
                <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                  {option.subtitle}
                </Text>
              </View>
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
