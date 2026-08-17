import { useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { useQuickAddStore } from '@/stores/quick-add-store'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

export function QuickAddModal() {
  const { theme } = useAppTheme()
  const { isOpen, defaultListId, defaultParentId, close } = useQuickAddStore()
  const createTodo = useTodoStore((s) => s.createTodo)
  const firstListId = useListStore((s) => {
    const lists = Object.values(s.listsById)
    return lists.length > 0 ? lists[0].id : null
  })

  const [title, setTitle] = useState('')

  const listId = defaultListId ?? firstListId

  function handleAdd() {
    const trimmed = title.trim()
    if (!trimmed || !listId) return
    createTodo({ listId, parentId: defaultParentId, title: trimmed })
    setTitle('')
    close()
  }

  function handleClose() {
    setTitle('')
    close()
  }

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <View
          style={{
            backgroundColor: theme.color.surface,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What needs doing?"
            placeholderTextColor={theme.color.text2}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            style={{
              ...typography.body,
              color: theme.color.text,
              fontSize: 20,
              paddingVertical: theme.spacing.xs,
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable
              onPress={handleAdd}
              disabled={title.trim().length === 0}
              style={({ pressed }) => ({
                backgroundColor: title.trim().length > 0 ? theme.color.accent : theme.color.surfaceSoft,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.radius.full,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  ...typography.meta,
                  fontFamily: 'Manrope_600SemiBold',
                  color: title.trim().length > 0 ? '#ffffff' : theme.color.text2,
                }}
              >
                Add
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

type InlineQuickAddProps = {
  listId?: string
  parentId?: string
}

export function InlineQuickAdd({ listId, parentId }: InlineQuickAddProps) {
  const { theme } = useAppTheme()
  const open = useQuickAddStore((s) => s.open)

  return (
    <Pressable
      onPress={() => open(listId, parentId)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.xs,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ ...typography.body, color: theme.color.text2 }}>+ Add task</Text>
    </Pressable>
  )
}
