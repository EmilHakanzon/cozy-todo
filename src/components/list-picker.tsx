import { useCallback } from 'react'
import { FlatList, Modal, Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'
import type { TodoListId } from '@/features/todos/types'

type ListPickerProps = {
  visible: boolean
  currentListId: TodoListId
  onSelect: (listId: TodoListId) => void
  onCancel: () => void
}

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
}

const LIST_ICON: SymbolViewProps['name'] = {
  ios: 'list.bullet',
  android: 'format_list_bulleted',
  web: 'format_list_bulleted',
}

export function ListPicker({
  visible,
  currentListId,
  onSelect,
  onCancel,
}: ListPickerProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const listsById = useListStore((s) => s.listsById)
  const lists = Object.values(listsById)
  const listColors = listColorsFor(resolvedTheme)

  const handleSelect = useCallback(
    (id: TodoListId) => {
      if (id !== currentListId) onSelect(id)
      onCancel()
    },
    [currentListId, onSelect, onCancel],
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1 }} onPress={onCancel} />
      <View
        style={{
          backgroundColor: theme.color.surface,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          paddingBottom: 40,
          maxHeight: '60%',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.sm,
          }}
        >
          <Pressable onPress={onCancel}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>Cancel</Text>
          </Pressable>
          <Text style={{ ...typography.taskTitle, color: theme.color.text }}>Move to List</Text>
          <View style={{ width: 50 }} />
        </View>

        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
          renderItem={({ item }) => {
            const palette = listColors[item.color]
            const isSelected = item.id === currentListId

            return (
              <Pressable
                onPress={() => handleSelect(item.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                  gap: theme.spacing.sm,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: theme.radius.sm,
                    backgroundColor: palette.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SymbolView name={LIST_ICON} size={16} tintColor={palette.accent} />
                </View>
                <Text
                  style={{
                    ...typography.body,
                    flex: 1,
                    color: theme.color.text,
                    fontFamily: isSelected ? 'Manrope_600SemiBold' : 'Manrope_400Regular',
                  }}
                >
                  {item.name}
                </Text>
                {isSelected && (
                  <SymbolView name={CHECK_ICON} size={18} tintColor={theme.color.accent} />
                )}
              </Pressable>
            )
          }}
        />
      </View>
    </Modal>
  )
}
