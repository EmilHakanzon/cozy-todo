import { type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

type DetailRowProps = {
  icon?: SymbolViewProps['name']
  iconSlot?: ReactNode
  label: string
  labelColor?: string
  onPress: () => void
}

export function DetailRow({ icon, iconSlot, label, labelColor, onPress }: DetailRowProps) {
  const { theme } = useAppTheme()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        backgroundColor: theme.color.surfaceSoft,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon && <SymbolView name={icon} size={20} tintColor={theme.color.text2} />}
      {iconSlot}
      <Text
        style={{
          ...typography.body,
          flex: 1,
          color: labelColor ?? theme.color.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
