import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { SettingsScreenHeader } from '@/components/settings-screen-header'
import { TODO_LIST_COLORS } from '@/features/lists/types'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useSettingsStore } from '@/stores/settings-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { TodoListColor } from '@/features/lists/types'
import type { SymbolViewProps } from 'expo-symbols'

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
}

const COLOR_LABELS: Record<TodoListColor, string> = {
  sage: 'Sage',
  terracotta: 'Terracotta',
  ochre: 'Ochre',
  dustyBlue: 'Dusty Blue',
  lavender: 'Lavender',
  taupe: 'Taupe',
}

export default function AccentColorScreen() {
  const { theme, resolvedTheme } = useAppTheme()
  const accentColor = useSettingsStore((s) => s.accentColor)
  const setAccentColor = useSettingsStore((s) => s.setAccentColor)
  const listColors = listColorsFor(resolvedTheme)

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <SettingsScreenHeader title="Accent color" />

      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.md,
          paddingTop: theme.spacing.md,
        }}
      >
        {TODO_LIST_COLORS.map((color) => {
          const palette = listColors[color]
          const isActive = accentColor === color

          return (
            <Pressable
              key={color}
              onPress={() => setAccentColor(color)}
              style={({ pressed }) => ({
                alignItems: 'center',
                gap: theme.spacing.xs,
                opacity: pressed ? 0.6 : 1,
                width: 72,
              })}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: palette.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isActive ? 3 : 0,
                  borderColor: theme.color.text,
                }}
              >
                {isActive && (
                  <SymbolView name={CHECK_ICON} size={20} tintColor="#ffffff" />
                )}
              </View>
              <Text
                style={{
                  ...typography.meta,
                  color: isActive ? theme.color.text : theme.color.text2,
                  textAlign: 'center',
                }}
              >
                {COLOR_LABELS[color]}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
