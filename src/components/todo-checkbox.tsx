import { Pressable, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'

import type { SymbolViewProps } from 'expo-symbols'

type TodoCheckboxProps = {
  checked: boolean
  onToggle: () => void
}

const SIZE = 24
const BORDER_WIDTH = 2
const CHECK_ICON: SymbolViewProps['name'] = { ios: 'checkmark', android: 'check', web: 'check' }

export function TodoCheckbox({ checked, onToggle }: TodoCheckboxProps) {
  const { theme } = useAppTheme()

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {checked ? (
        <View
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: theme.color.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SymbolView name={CHECK_ICON} size={14} tintColor="#ffffff" />
        </View>
      ) : (
        <View
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: BORDER_WIDTH,
            borderColor: theme.color.border,
            backgroundColor: 'transparent',
          }}
        />
      )}
    </Pressable>
  )
}
