import { Modal, Pressable, Text, View } from 'react-native'

import { TagColorSwatches } from '@/components/tag-color-swatches'
import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { PendingTag } from '@/features/daily-plan/types'
import type { TagColor } from '@/features/tags/types'

type PendingTagEditorProps = {
  visible: boolean
  tag: PendingTag | null
  onChangeColor: (color: TagColor) => void
  onRemove: () => void
  onClose: () => void
}

export function PendingTagEditor({
  visible,
  tag,
  onChangeColor,
  onRemove,
  onClose,
}: PendingTagEditorProps) {
  const { theme } = useAppTheme()

  if (tag === null) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View
        style={{
          backgroundColor: theme.color.surface,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          padding: theme.spacing.lg,
          paddingBottom: 40,
          gap: theme.spacing.lg,
        }}
      >
        <View style={{ gap: theme.spacing.micro }}>
          <Text style={{ ...typography.taskTitle, color: theme.color.text }}>{tag.name}</Text>
          {tag.tagId === null && (
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              Will be created
            </Text>
          )}
        </View>

        <TagColorSwatches selected={tag.color} onSelect={onChangeColor} />

        <Pressable
          onPress={() => {
            onRemove()
            onClose()
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: theme.spacing.sm,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              ...typography.body,
              color: '#D32F2F',
              fontFamily: 'Manrope_500Medium',
            }}
          >
            Remove tag
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}
