import { Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { SettingsScreenHeader } from '@/components/settings-screen-header'
import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const AI_ICON: SymbolViewProps['name'] = {
  ios: 'brain',
  android: 'psychology',
  web: 'psychology',
}

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? ''

export default function SmartAddScreen() {
  const { theme } = useAppTheme()
  const isConfigured = OPENAI_KEY.length > 0

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <SettingsScreenHeader title="Smart Add" />

      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.lg,
          alignItems: 'center',
          paddingTop: theme.spacing.xl,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.color.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SymbolView
            name={AI_ICON}
            size={36}
            tintColor={theme.color.accent}
          />
        </View>

        <Text
          style={{
            ...typography.screenTitle,
            fontSize: 24,
            color: theme.color.text,
            textAlign: 'center',
          }}
        >
          Smart Add
        </Text>

        <Text
          style={{
            ...typography.body,
            color: theme.color.text2,
            textAlign: 'center',
            lineHeight: 22,
            paddingHorizontal: theme.spacing.md,
          }}
        >
          Describe your tasks in natural language and Smart Add creates them for
          you — with dates, notes, and subtasks. Powered by OpenAI.
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            backgroundColor: isConfigured
              ? theme.color.surfaceSoft
              : theme.color.surface,
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            alignSelf: 'stretch',
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isConfigured
                ? theme.color.accent
                : theme.color.text2,
            }}
          />
          <Text style={{ ...typography.body, color: theme.color.text }}>
            {isConfigured ? 'Connected' : 'Not configured'}
          </Text>
        </View>

        <Text
          style={{
            ...typography.meta,
            color: theme.color.text2,
            textAlign: 'center',
            lineHeight: 18,
          }}
        >
          Try it from the Daily Plan screen — tap the sparkle icon on your home
          page.
        </Text>
      </View>
    </View>
  )
}
