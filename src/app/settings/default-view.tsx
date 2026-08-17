import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { SettingsScreenHeader } from '@/components/settings-screen-header'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useSettingsStore } from '@/stores/settings-store'
import { typography } from '@/themes/typography'

import type { DefaultView } from '@/stores/settings-store'
import type { SymbolViewProps } from 'expo-symbols'

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
}

const VIEW_ICONS: Record<DefaultView, SymbolViewProps['name']> = {
  today: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  upcoming: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  lists: { ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' },
}

const OPTIONS: { key: DefaultView; label: string; subtitle: string }[] = [
  { key: 'today', label: 'Today', subtitle: 'Start with your daily tasks' },
  { key: 'upcoming', label: 'Upcoming', subtitle: 'Start with the calendar view' },
  { key: 'lists', label: 'Lists', subtitle: 'Start with your lists' },
]

export default function DefaultViewScreen() {
  const { theme } = useAppTheme()
  const defaultView = useSettingsStore((s) => s.defaultView)
  const setDefaultView = useSettingsStore((s) => s.setDefaultView)

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <SettingsScreenHeader title="Default view" />

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        {OPTIONS.map((option) => {
          const isActive = defaultView === option.key

          return (
            <Pressable
              key={option.key}
              onPress={() => setDefaultView(option.key)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.md,
                gap: theme.spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <SymbolView
                name={VIEW_ICONS[option.key]}
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
