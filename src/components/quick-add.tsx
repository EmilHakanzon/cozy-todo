import { useEffect, useState, useMemo } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { toDateString } from '@/lib/date-utils'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { useQuickAddStore } from '@/stores/quick-add-store'
import { useTodoStore } from '@/stores/todo-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const CALENDAR_ICON: SymbolViewProps['name'] = { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }
const CLOSE_ICON: SymbolViewProps['name'] = { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }

export function QuickAddModal() {
  const { theme, resolvedTheme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const { isOpen, defaultListId, defaultParentId, defaultDueDate, close } = useQuickAddStore()
  const createTodo = useTodoStore((s) => s.createTodo)
  const listsById = useListStore((s) => s.listsById)

  const lists = useMemo(() => Object.values(listsById), [listsById])
  const firstListId = lists.length > 0 ? lists[0].id : null
  const listColors = listColorsFor(resolvedTheme)

  const [title, setTitle] = useState('')
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) setDueDate(defaultDueDate)
  }, [isOpen, defaultDueDate])

  const listId = selectedListId ?? defaultListId ?? firstListId
  const selectedList = listId ? listsById[listId] : null

  function handleAdd() {
    const trimmed = title.trim()
    if (!trimmed || !listId) return
    createTodo({ listId, parentId: defaultParentId, title: trimmed, dueAt: dueDate })
    resetAndClose()
  }

  function resetAndClose() {
    setTitle('')
    setSelectedListId(null)
    setDueDate(null)
    close()
  }

  function handleToggleToday() {
    if (dueDate) {
      setDueDate(null)
    } else {
      setDueDate(toDateString(new Date()))
    }
  }

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable style={{ flex: 1 }} onPress={resetAndClose} />
        <View
          style={{
            backgroundColor: theme.color.surface,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            padding: theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.lg,
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.xs }}
          >
            {lists.map((l) => {
              const isSelected = l.id === listId
              const palette = listColors[l.color]
              return (
                <Pressable
                  key={l.id}
                  onPress={() => setSelectedListId(l.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.micro,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.micro,
                    borderRadius: theme.radius.full,
                    backgroundColor: isSelected ? palette.background : theme.color.surfaceSoft,
                    borderWidth: 1,
                    borderColor: isSelected ? palette.accent : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: palette.accent,
                    }}
                  />
                  <Text
                    style={{
                      ...typography.meta,
                      color: isSelected ? palette.accent : theme.color.text2,
                      fontFamily: isSelected ? 'Manrope_600SemiBold' : 'Manrope_400Regular',
                    }}
                  >
                    {l.name}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              onPress={handleToggleToday}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.micro,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.micro,
                borderRadius: theme.radius.full,
                backgroundColor: dueDate ? theme.color.accentSoft : theme.color.surfaceSoft,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <SymbolView name={CALENDAR_ICON} size={14} tintColor={dueDate ? theme.color.accent : theme.color.text2} />
              <Text
                style={{
                  ...typography.meta,
                  color: dueDate ? theme.color.accent : theme.color.text2,
                  fontFamily: dueDate ? 'Manrope_600SemiBold' : 'Manrope_400Regular',
                }}
              >
                Today
              </Text>
              {dueDate && (
                <Pressable onPress={() => setDueDate(null)} hitSlop={4}>
                  <SymbolView name={CLOSE_ICON} size={14} tintColor={theme.color.text2} />
                </Pressable>
              )}
            </Pressable>

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
