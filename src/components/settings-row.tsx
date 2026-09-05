import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

type SettingsRowProps = {
  icon: SymbolViewProps['name']
  label: string
  value?: string
  onPress?: () => void
  onLongPress?: () => void
  disabled?: boolean
  destructive?: boolean
}

const CHEVRON: SymbolViewProps['name'] = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
}

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  onLongPress,
  disabled = false,
  destructive = false,
}: SettingsRowProps) {
  const { theme } = useAppTheme()

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.sm,
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      <SymbolView
        name={icon}
        size={20}
        tintColor={destructive ? '#c44' : theme.color.text2}
      />
      <Text
        style={{
          ...typography.body,
          flex: 1,
          color: destructive ? '#c44' : theme.color.text,
        }}
      >
        {label}
      </Text>
      {value && (
        <Text style={{ ...typography.meta, color: theme.color.text2 }}>
          {value}
        </Text>
      )}
      {onPress && !destructive && (
        <SymbolView name={CHEVRON} size={14} tintColor={theme.color.text2} />
      )}
    </Pressable>
  )
}
