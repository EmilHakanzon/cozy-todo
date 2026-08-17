import { Modal, Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'
import type { Recurrence } from '@/features/todos/types'

type RecurrencePickerProps = {
  visible: boolean
  value: Recurrence | null
  onChange: (value: Recurrence | null) => void
  onClose: () => void
}

const CHECK_ICON: SymbolViewProps['name'] = { ios: 'checkmark', android: 'check', web: 'check' }

const OPTIONS: { label: string; value: Recurrence | null }[] = [
  { label: 'None', value: null },
  { label: 'Daily', value: { frequency: 'daily', interval: 1 } },
  { label: 'Weekly', value: { frequency: 'weekly', interval: 1 } },
  { label: 'Biweekly', value: { frequency: 'weekly', interval: 2 } },
  { label: 'Monthly', value: { frequency: 'monthly', interval: 1 } },
  { label: 'Yearly', value: { frequency: 'yearly', interval: 1 } },
]

function isSelected(option: Recurrence | null, value: Recurrence | null): boolean {
  if (option === null && value === null) return true
  if (option === null || value === null) return false
  return option.frequency === value.frequency && option.interval === value.interval
}

export function RecurrencePicker({ visible, value, onChange, onClose }: RecurrencePickerProps) {
  const { theme } = useAppTheme()

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
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.md,
          }}
        >
          <Text style={{ ...typography.taskTitle, color: theme.color.text }}>Repeat</Text>
          <Pressable onPress={onClose}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>Done</Text>
          </Pressable>
        </View>

        {OPTIONS.map((option) => (
          <Pressable
            key={option.label}
            onPress={() => {
              onChange(option.value)
              onClose()
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: theme.spacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ ...typography.body, flex: 1, color: theme.color.text }}>
              {option.label}
            </Text>
            {isSelected(option.value, value) && (
              <SymbolView name={CHECK_ICON} size={18} tintColor={theme.color.accent} />
            )}
          </Pressable>
        ))}
      </View>
    </Modal>
  )
}
