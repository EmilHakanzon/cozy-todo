import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useTagStore } from '@/stores/tag-store'
import { TAG_COLORS } from '@/features/tags/types'
import { tagColorsFor } from '@/themes/tag-color'
import { typography } from '@/themes/typography'

import type { TagColor } from '@/features/tags/types'
import type { SymbolViewProps } from 'expo-symbols'

const CHECK_ICON: SymbolViewProps['name'] = { ios: 'checkmark', android: 'check', web: 'check' }
const PLUS_ICON: SymbolViewProps['name'] = { ios: 'plus', android: 'add', web: 'add' }

type TagPickerProps = {
  selectedTagIds: string[]
  onToggleTag: (tagId: string) => void
}

export function TagPicker({ selectedTagIds, onToggleTag }: TagPickerProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const tagsById = useTagStore((s) => s.tagsById)
  const createTag = useTagStore((s) => s.createTag)
  const tagPalettes = tagColorsFor(resolvedTheme)

  const tags = useMemo(() => Object.values(tagsById), [tagsById])
  const selectedSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds])

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<TagColor>('blue')

  function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const id = createTag(trimmed, newColor)
    onToggleTag(id)
    setNewName('')
    setShowCreate(false)
  }

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {tags.map((tag) => {
        const isSelected = selectedSet.has(tag.id)
        const palette = tagPalettes[tag.color]
        return (
          <Pressable
            key={tag.id}
            onPress={() => onToggleTag(tag.id)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: palette.background,
                borderWidth: 2,
                borderColor: palette.text,
              }}
            />
            <Text style={{ ...typography.body, flex: 1, color: theme.color.text }}>
              {tag.name}
            </Text>
            {isSelected && (
              <SymbolView name={CHECK_ICON} size={16} tintColor={theme.color.accent} />
            )}
          </Pressable>
        )
      })}

      {showCreate ? (
        <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.xs }}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Tag name"
            placeholderTextColor={theme.color.text2}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            style={{
              ...typography.body,
              color: theme.color.text,
              backgroundColor: theme.color.surfaceSoft,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              borderWidth: 1,
              borderColor: theme.color.border,
            }}
          />
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            {TAG_COLORS.map((color) => {
              const palette = tagPalettes[color]
              return (
                <Pressable
                  key={color}
                  onPress={() => setNewColor(color)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: palette.background,
                    borderWidth: newColor === color ? 2 : 0,
                    borderColor: palette.text,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {newColor === color && (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.text }} />
                  )}
                </Pressable>
              )
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            <Pressable
              onPress={() => { setShowCreate(false); setNewName('') }}
              style={({ pressed }) => ({
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.micro,
                borderRadius: theme.radius.full,
                backgroundColor: theme.color.surfaceSoft,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleCreate}
              disabled={!newName.trim()}
              style={({ pressed }) => ({
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.micro,
                borderRadius: theme.radius.full,
                backgroundColor: newName.trim() ? theme.color.accent : theme.color.surfaceSoft,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ ...typography.meta, color: newName.trim() ? '#ffffff' : theme.color.text2 }}>
                Create
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setShowCreate(true)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            paddingVertical: theme.spacing.xs,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <SymbolView name={PLUS_ICON} size={14} tintColor={theme.color.text2} />
          <Text style={{ ...typography.meta, color: theme.color.text2 }}>Create tag</Text>
        </Pressable>
      )}
    </View>
  )
}
