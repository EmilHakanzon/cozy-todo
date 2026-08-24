import { Pressable, View } from 'react-native'

import { TAG_COLORS } from '@/features/tags/types'
import { useAppTheme } from '@/hooks/use-app-theme'
import { tagColorsFor } from '@/themes/tag-color'

import type { TagColor } from '@/features/tags/types'

type TagColorSwatchesProps = {
  selected: TagColor
  onSelect: (color: TagColor) => void
}

export function TagColorSwatches({ selected, onSelect }: TagColorSwatchesProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const tagPalettes = tagColorsFor(resolvedTheme)

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
      {TAG_COLORS.map((color) => {
        const palette = tagPalettes[color]
        return (
          <Pressable
            key={color}
            onPress={() => onSelect(color)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: palette.background,
              borderWidth: selected === color ? 2 : 0,
              borderColor: palette.text,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected === color && (
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.text }} />
            )}
          </Pressable>
        )
      })}
    </View>
  )
}
