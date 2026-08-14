import { Pressable, Text, View } from 'react-native'

import { TODO_LIST_COLORS, type TodoListColor } from '@/features/lists/types'
import { useAppTheme } from '@/hooks/use-app-theme'
import { listColorsFor } from '@/themes/list-color'

// Inga size-tokens finns i temat ännu, så de här bor namngivna här i stället
// för att ligga utspridda som råa siffror i style-objekten.
const SWATCH_SIZE = 40
const DOT_SIZE = 14
const RING_WIDTH = 1

type ListColorPickerProps = {
  value: TodoListColor
  onChange: (color: TodoListColor) => void
  label?: string
}

export function ListColorPicker({ value, onChange, label = 'Color' }: ListColorPickerProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const listColors = listColorsFor(resolvedTheme)

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text
        style={{
          color: theme.color.text2,
          fontSize: 13,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
        }}
      >
        {TODO_LIST_COLORS.map((option) => {
          const palette = listColors[option]
          const isSelected = option === value

          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option}
              // Ringen ritas alltid, bara färgen ändras. Annars hoppar layouten
              // när markeringen flyttas mellan alternativen.
              style={({ pressed }) => ({
                padding: theme.spacing.micro,
                borderRadius: theme.radius.full,
                borderWidth: RING_WIDTH,
                borderColor: isSelected ? palette.accent : 'transparent',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: SWATCH_SIZE,
                  height: SWATCH_SIZE,
                  borderRadius: theme.radius.full,
                  backgroundColor: palette.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    borderRadius: theme.radius.full,
                    backgroundColor: palette.accent,
                  }}
                />
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
