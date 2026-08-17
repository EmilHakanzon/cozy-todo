import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
}

const CALENDAR_ICON: SymbolViewProps['name'] = {
  ios: 'calendar.badge.plus',
  android: 'event',
  web: 'event',
}

export default function GoogleCalendarScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()

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
          Google Calendar
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.xl,
          paddingBottom: 120,
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
            marginBottom: theme.spacing.lg,
          }}
        >
          <SymbolView name={CALENDAR_ICON} size={36} tintColor={theme.color.accent} />
        </View>
        <Text
          style={{
            ...typography.screenTitle,
            fontSize: 24,
            color: theme.color.text,
            textAlign: 'center',
            marginBottom: theme.spacing.sm,
          }}
        >
          Coming soon
        </Text>
        <Text
          style={{
            ...typography.body,
            color: theme.color.text2,
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          Connect your Google Calendar to see events alongside your tasks. We'll let you know when this feature is ready.
        </Text>
      </View>
    </View>
  )
}
