import { type ReactNode } from 'react'
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

type SettingsScreenHeaderProps = {
  title: string
  rightAction?: ReactNode
}

export function SettingsScreenHeader({ title, rightAction }: SettingsScreenHeaderProps) {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
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
        {title}
      </Text>
      {rightAction}
    </View>
  )
}
