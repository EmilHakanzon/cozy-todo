import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { SettingsScreenHeader } from '@/components/settings-screen-header'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useThemeStore } from '@/stores/theme-store'
import { typography } from '@/themes/typography'

import type { ThemePreference } from '@/stores/theme-store'
import type { SymbolViewProps } from 'expo-symbols'

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
}

const THEME_ICONS: Record<ThemePreference, SymbolViewProps['name']> = {
  light: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  dark: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' },
  system: { ios: 'circle.lefthalf.filled', android: 'contrast', web: 'contrast' },
}

const THEME_OPTIONS: { key: ThemePreference; label: string; subtitle?: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'Follow system', subtitle: 'Use device setting' },
]

export default function ThemeScreen() {
  const { theme } = useAppTheme()
  const preference = useThemeStore((s) => s.preference)
  const setPreference = useThemeStore((s) => s.setPreference)

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <SettingsScreenHeader title="Theme" />

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        {THEME_OPTIONS.map((option) => {
          const isActive = preference === option.key

          return (
            <Pressable
              key={option.key}
              onPress={() => setPreference(option.key)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.md,
                gap: theme.spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <SymbolView
                name={THEME_ICONS[option.key]}
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
                {option.subtitle && (
                  <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                    {option.subtitle}
                  </Text>
                )}
              </View>
              {isActive && (
                <SymbolView name={CHECK_ICON} size={18} tintColor={theme.color.accent} />
              )}
            </Pressable>
          )
        })}
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl }}>
        <Text style={{ ...typography.sectionTitle, color: theme.color.text2, marginBottom: theme.spacing.sm }}>
          PREVIEW
        </Text>
        <View
          style={{
            backgroundColor: theme.color.surface,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.color.border,
          }}
        >
          <Text style={{ ...typography.screenTitle, fontSize: 20, color: theme.color.text }}>
            Today
          </Text>
          <Text style={{ ...typography.meta, color: theme.color.text2, marginTop: 2 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: theme.color.border,
                }}
              />
              <Text style={{ ...typography.body, color: theme.color.text }}>
                Sample task
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: theme.color.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SymbolView name={CHECK_ICON} size={12} tintColor="#ffffff" />
              </View>
              <Text
                style={{
                  ...typography.body,
                  color: theme.color.text2,
                  textDecorationLine: 'line-through',
                }}
              >
                Completed task
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
