import { useState, useEffect, useCallback } from 'react'
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'

import { ListColorPicker } from './list-color-picker'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'
import type { TodoList, TodoListColor } from '@/features/lists/types'

type EditListSheetProps = {
  visible: boolean
  list: TodoList
  onClose: () => void
}

const TRASH_ICON: SymbolViewProps['name'] = {
  ios: 'trash',
  android: 'delete',
  web: 'delete',
}

export function EditListSheet({ visible, list, onClose }: EditListSheetProps) {
  const { theme } = useAppTheme()
  const renameList = useListStore((s) => s.renameList)
  const setListColor = useListStore((s) => s.setListColor)
  const deleteList = useListStore((s) => s.deleteList)

  const [name, setName] = useState(list.name)
  const [color, setColor] = useState<TodoListColor>(list.color)

  useEffect(() => {
    if (visible) {
      setName(list.name)
      setColor(list.color)
    }
  }, [visible, list.name, list.color])

  const handleSave = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) return

    if (trimmed !== list.name) renameList(list.id, trimmed)
    if (color !== list.color) setListColor(list.id, color)
    onClose()
  }, [name, color, list, renameList, setListColor, onClose])

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete List',
      `Delete "${list.name}" and all its tasks? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteList(list.id)
            onClose()
            router.back()
          },
        },
      ],
    )
  }, [list, deleteList, onClose])

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
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Pressable onPress={onClose}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>Cancel</Text>
          </Pressable>
          <Text style={{ ...typography.taskTitle, color: theme.color.text }}>Edit List</Text>
          <Pressable onPress={handleSave}>
            <Text
              style={{
                ...typography.body,
                fontFamily: 'Manrope_600SemiBold',
                color: name.trim().length > 0 ? theme.color.accent : theme.color.text2,
              }}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          <Text style={{ ...typography.sectionTitle, color: theme.color.text2 }}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
            style={{
              ...typography.body,
              backgroundColor: theme.color.surfaceSoft,
              color: theme.color.text,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
            }}
          />
        </View>

        <ListColorPicker value={color} onChange={setColor} />

        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.xs,
            paddingVertical: theme.spacing.sm,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <SymbolView name={TRASH_ICON} size={18} tintColor="#D32F2F" />
          <Text
            style={{
              ...typography.body,
              color: '#D32F2F',
              fontFamily: 'Manrope_500Medium',
            }}
          >
            Delete List
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}
