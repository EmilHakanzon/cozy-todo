import { Pressable, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { impactLight } from '@/lib/haptics'

import type { SymbolViewProps } from 'expo-symbols'

type TodoCheckboxProps = {
  checked: boolean
  onToggle: () => void
  size?: number
}

const DEFAULT_SIZE = 24
const BORDER_WIDTH = 2
const CHECK_ICON: SymbolViewProps['name'] = { ios: 'checkmark', android: 'check', web: 'check' }

export function TodoCheckbox({ checked, onToggle, size = DEFAULT_SIZE }: TodoCheckboxProps) {
  const { theme } = useAppTheme()

  const handleToggle = () => {
    impactLight()
    onToggle()
  }

  return (
    <Pressable
      onPress={handleToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {checked ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.color.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SymbolView name={CHECK_ICON} size={Math.round(size * 0.58)} tintColor="#ffffff" />
        </View>
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: BORDER_WIDTH,
            borderColor: theme.color.border,
            backgroundColor: 'transparent',
          }}
        />
      )}
    </Pressable>
  )
}
