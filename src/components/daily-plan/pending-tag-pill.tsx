import { Pressable, Text } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { tagColorsFor } from '@/themes/tag-color'
import { typography } from '@/themes/typography'

import type { PendingTag } from '@/features/daily-plan/types'

type PendingTagPillProps = {
  tag: PendingTag
  onPress: () => void
}

export function PendingTagPill({ tag, onPress }: PendingTagPillProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const palette = tagColorsFor(resolvedTheme)[tag.color]
  const isNew = tag.tagId === null

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: palette.background,
        borderRadius: theme.radius.full,
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 1,
        opacity: pressed ? 0.6 : 1,
        ...(isNew
          ? { borderWidth: 1, borderStyle: 'dashed' as const, borderColor: palette.text }
          : null),
      })}
    >
      <Text style={{ ...typography.meta, fontSize: 10, color: palette.text }}>
        {tag.name}
      </Text>
    </Pressable>
  )
}
