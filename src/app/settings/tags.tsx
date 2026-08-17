import { useState, useMemo, useCallback } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { SettingsScreenHeader } from '@/components/settings-screen-header'
import { TAG_COLORS } from '@/features/tags/types'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useTagStore } from '@/stores/tag-store'
import { useTodoStore } from '@/stores/todo-store'
import { tagColorsFor } from '@/themes/tag-color'
import { typography } from '@/themes/typography'

import type { TagColor, TagId } from '@/features/tags/types'
import type { SymbolViewProps } from 'expo-symbols'

const TRASH_ICON: SymbolViewProps['name'] = {
  ios: 'trash',
  android: 'delete',
  web: 'delete',
}

export default function TagsSettingsScreen() {
  const { theme, resolvedTheme } = useAppTheme()
  const tagsById = useTagStore((s) => s.tagsById)
  const updateTag = useTagStore((s) => s.updateTag)
  const deleteTag = useTagStore((s) => s.deleteTag)
  const todosById = useTodoStore((s) => s.todosById)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const tagPalettes = tagColorsFor(resolvedTheme)

  const tags = useMemo(
    () => Object.values(tagsById).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [tagsById],
  )

  const [editingId, setEditingId] = useState<TagId | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<TagColor>('blue')

  const startEdit = useCallback((id: TagId) => {
    const tag = tagsById[id]
    if (!tag) return
    setEditingId(id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }, [tagsById])

  const saveEdit = useCallback(() => {
    if (!editingId || !editName.trim()) return
    updateTag(editingId, editName, editColor)
    setEditingId(null)
  }, [editingId, editName, editColor, updateTag])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
  }, [])

  const handleDelete = useCallback((id: TagId, name: string) => {
    const usageCount = Object.values(todosById).filter(
      (todo) => (todo.tagIds ?? []).includes(id),
    ).length

    const message = usageCount > 0
      ? `"${name}" is used on ${usageCount} ${usageCount === 1 ? 'task' : 'tasks'}. Remove the tag from all tasks and delete it?`
      : `Delete "${name}"?`

    Alert.alert('Delete Tag', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          for (const todo of Object.values(todosById)) {
            if ((todo.tagIds ?? []).includes(id)) {
              updateTodo(todo.id, {
                tagIds: todo.tagIds.filter((tagId) => tagId !== id),
              })
            }
          }
          deleteTag(id)
        },
      },
    ])
  }, [todosById, deleteTag, updateTodo])

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <SettingsScreenHeader title="Tags" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: 120,
        }}
      >
        {tags.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>
              No tags yet. Create tags from a task's detail screen.
            </Text>
          </View>
        )}

        {tags.map((tag) => {
          const palette = tagPalettes[tag.color]
          const isEditing = editingId === tag.id

          if (isEditing) {
            return (
              <View
                key={tag.id}
                style={{
                  paddingVertical: theme.spacing.sm,
                  gap: theme.spacing.xs,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.color.border,
                }}
              >
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveEdit}
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
                    const p = tagPalettes[color]
                    return (
                      <Pressable
                        key={color}
                        onPress={() => setEditColor(color)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: p.background,
                          borderWidth: editColor === color ? 2 : 0,
                          borderColor: p.text,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {editColor === color && (
                          <View
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: p.text,
                            }}
                          />
                        )}
                      </Pressable>
                    )
                  })}
                </View>
                <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
                  <Pressable
                    onPress={cancelEdit}
                    style={({ pressed }) => ({
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: theme.spacing.micro,
                      borderRadius: theme.radius.full,
                      backgroundColor: theme.color.surfaceSoft,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={saveEdit}
                    disabled={!editName.trim()}
                    style={({ pressed }) => ({
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: theme.spacing.micro,
                      borderRadius: theme.radius.full,
                      backgroundColor: editName.trim()
                        ? theme.color.accent
                        : theme.color.surfaceSoft,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        ...typography.meta,
                        color: editName.trim() ? '#ffffff' : theme.color.text2,
                      }}
                    >
                      Save
                    </Text>
                  </Pressable>
                </View>
              </View>
            )
          }

          return (
            <Pressable
              key={tag.id}
              onPress={() => startEdit(tag.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: theme.color.border,
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
              <Pressable
                onPress={() => handleDelete(tag.id, tag.name)}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <SymbolView name={TRASH_ICON} size={18} tintColor={theme.color.text2} />
              </Pressable>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
