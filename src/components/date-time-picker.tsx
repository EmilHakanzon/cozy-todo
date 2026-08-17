import { useState, useMemo, useCallback } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SymbolView } from 'expo-symbols'

import { MonthCalendar } from './month-calendar'
import { SegmentedControl } from './segmented-control'
import { useAppTheme } from '@/hooks/use-app-theme'
import { toDateString } from '@/lib/date-utils'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

type DateTimePickerProps = {
  visible: boolean
  initialDate: string | null
  onConfirm: (isoString: string | null) => void
  onCancel: () => void
}

const CLOCK_ICON: SymbolViewProps['name'] = {
  ios: 'clock',
  android: 'schedule',
  web: 'schedule',
}

type PickerTab = 'date' | 'time'

const TABS = [
  { key: 'date' as const, label: 'Date' },
  { key: 'time' as const, label: 'Time' },
]

export function DateTimePicker({
  visible,
  initialDate,
  onConfirm,
  onCancel,
}: DateTimePickerProps) {
  const { theme } = useAppTheme()
  const [tab, setTab] = useState<PickerTab>('date')

  const parsed = useMemo(() => {
    if (!initialDate) return { date: new Date(), time: '' }
    const d = new Date(initialDate)
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return { date: d, time: `${hours}:${mins}` }
  }, [initialDate])

  const [selectedDate, setSelectedDate] = useState<Date>(parsed.date)
  const [timeStr, setTimeStr] = useState(parsed.time)
  const [monthDate, setMonthDate] = useState(parsed.date)

  const taskDots = useMemo(() => new Map<string, number>(), [])

  const handleDone = useCallback(() => {
    const dateStr = toDateString(selectedDate)
    if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
      onConfirm(`${dateStr}T${timeStr}:00.000Z`)
    } else {
      onConfirm(`${dateStr}T00:00:00.000Z`)
    }
  }, [selectedDate, timeStr, onConfirm])

  const handleClear = useCallback(() => {
    onConfirm(null)
  }, [onConfirm])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable style={{ flex: 1 }} onPress={onCancel} />
        <View
          style={{
            backgroundColor: theme.color.surface,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingBottom: 40,
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
            <Text style={{ ...typography.taskTitle, color: theme.color.text }}>
              Date & Time
            </Text>
            <Pressable onPress={handleDone}>
              <Text
                style={{
                  ...typography.body,
                  fontFamily: 'Manrope_600SemiBold',
                  color: theme.color.accent,
                }}
              >
                Done
              </Text>
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
            <SegmentedControl segments={TABS} value={tab} onChange={setTab} />
          </View>

          {tab === 'date' && (
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: theme.spacing.xs,
                }}
              >
                <Text
                  style={{
                    ...typography.body,
                    fontFamily: 'Manrope_500Medium',
                    color: theme.color.text,
                  }}
                >
                  {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                  <Pressable
                    onPress={() =>
                      setMonthDate(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                      )
                    }
                    hitSlop={8}
                  >
                    <Text style={{ ...typography.body, color: theme.color.text2 }}>{'<'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setMonthDate(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                      )
                    }
                    hitSlop={8}
                  >
                    <Text style={{ ...typography.body, color: theme.color.text2 }}>{'>'}</Text>
                  </Pressable>
                </View>
              </View>
              <MonthCalendar
                year={monthDate.getFullYear()}
                month={monthDate.getMonth()}
                selectedDate={selectedDate}
                taskDots={taskDots}
                onSelectDate={setSelectedDate}
              />
            </View>
          )}

          {tab === 'time' && (
            <View
              style={{
                paddingHorizontal: theme.spacing.lg,
                paddingTop: theme.spacing.md,
                gap: theme.spacing.md,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  backgroundColor: theme.color.surfaceSoft,
                  borderRadius: theme.radius.md,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}
              >
                <SymbolView name={CLOCK_ICON} size={20} tintColor={theme.color.text2} />
                <TextInput
                  value={timeStr}
                  onChangeText={setTimeStr}
                  placeholder="HH:MM"
                  placeholderTextColor={theme.color.text2}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  style={{
                    ...typography.body,
                    flex: 1,
                    color: theme.color.text,
                    paddingVertical: 0,
                  }}
                />
                <Pressable onPress={handleClear}>
                  <Text style={{ ...typography.body, color: theme.color.accent }}>Clear</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
