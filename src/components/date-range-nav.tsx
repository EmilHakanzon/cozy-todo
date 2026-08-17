import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

type DateRangeNavProps = {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

const CHEVRON_LEFT: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'chevron_left',
  web: 'chevron_left',
}
const CHEVRON_RIGHT: SymbolViewProps['name'] = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
}

export function DateRangeNav({ label, onPrev, onNext, onToday }: DateRangeNavProps) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Pressable
          onPress={onPrev}
          hitSlop={8}
          accessibilityLabel="Previous"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <SymbolView name={CHEVRON_LEFT} size={18} tintColor={theme.color.text2} />
        </Pressable>
        <Text
          style={{
            ...typography.meta,
            fontFamily: 'Manrope_500Medium',
            color: theme.color.text,
          }}
        >
          {label}
        </Text>
        <Pressable
          onPress={onNext}
          hitSlop={8}
          accessibilityLabel="Next"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <SymbolView name={CHEVRON_RIGHT} size={18} tintColor={theme.color.text2} />
        </Pressable>
      </View>
      <Pressable
        onPress={onToday}
        style={({ pressed }) => ({
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.micro,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.color.surfaceSoft,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            ...typography.meta,
            fontFamily: 'Manrope_500Medium',
            color: theme.color.text,
          }}
        >
          Today
        </Text>
      </Pressable>
    </View>
  )
}
