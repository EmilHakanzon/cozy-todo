import { Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { tagColorsFor } from '@/themes/tag-color'
import { typography } from '@/themes/typography'

import type { Tag } from '@/features/tags/types'

type TagPillProps = {
  tag: Tag
}

export function TagPill({ tag }: TagPillProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const palette = tagColorsFor(resolvedTheme)[tag.color]

  return (
    <View
      style={{
        backgroundColor: palette.background,
        borderRadius: theme.radius.full,
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 1,
      }}
    >
      <Text style={{ ...typography.meta, fontSize: 10, color: palette.text }}>
        {tag.name}
      </Text>
    </View>
  )
}
