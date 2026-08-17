import { Pressable, Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

type Segment<T extends string> = {
  key: T
  label: string
}

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[]
  value: T
  onChange: (key: T) => void
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.color.surfaceSoft,
        borderRadius: theme.radius.full,
        padding: theme.spacing.micro,
      }}
    >
      {segments.map((segment) => {
        const isActive = segment.key === value
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={{
              flex: 1,
              paddingVertical: theme.spacing.xs,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: theme.radius.full,
              alignItems: 'center',
              backgroundColor: isActive ? theme.color.accent : 'transparent',
            }}
          >
            <Text
              style={{
                ...typography.meta,
                fontFamily: 'Manrope_500Medium',
                color: isActive ? '#ffffff' : theme.color.text2,
              }}
            >
              {segment.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
