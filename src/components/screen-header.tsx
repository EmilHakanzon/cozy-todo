import { type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

type ScreenHeaderProps = {
  title: string
  subtitle?: string
  rightAction?: ReactNode
}

export function ScreenHeader({ title, subtitle, rightAction }: ScreenHeaderProps) {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        backgroundColor: theme.color.background,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ ...typography.screenTitle, color: theme.color.text }}>{title}</Text>
        {rightAction}
      </View>
      {subtitle ? (
        <Text style={{ ...typography.meta, color: theme.color.text2, marginTop: theme.spacing.micro }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}
