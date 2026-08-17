import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MonthCalendar } from './month-calendar'
import { SegmentedControl } from './segmented-control'
import { useAppTheme } from '@/hooks/use-app-theme'
import { toDateString } from '@/lib/date-utils'
import { useSettingsStore } from '@/stores/settings-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

type DateTimePickerProps = {
  visible: boolean
  initialDate: string | null
  onConfirm: (isoString: string | null) => void
  onCancel: () => void
}

const CHEVRON_UP: SymbolViewProps['name'] = { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
const CHEVRON_DOWN: SymbolViewProps['name'] = { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }

type PickerTab = 'date' | 'time'

const TABS = [
  { key: 'date' as const, label: 'Date' },
  { key: 'time' as const, label: 'Time' },
]

const QUICK_TIMES = [
  { label: 'Morning', hour: 9, minute: 0 },
  { label: 'Noon', hour: 12, minute: 0 },
  { label: 'Afternoon', hour: 15, minute: 0 },
  { label: 'Evening', hour: 18, minute: 0 },
]

function formatHour(hour: number, is12h: boolean): string {
  if (!is12h) return String(hour).padStart(2, '0')
  if (hour === 0) return '12'
  if (hour > 12) return String(hour - 12)
  return String(hour)
}

function formatAmPm(hour: number): string {
  return hour < 12 ? 'AM' : 'PM'
}

export function DateTimePicker({
  visible,
  initialDate,
  onConfirm,
  onCancel,
}: DateTimePickerProps) {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek)
  const timeFormat = useSettingsStore((s) => s.timeFormat)
  const is12h = timeFormat === '12h'
  const [tab, setTab] = useState<PickerTab>('date')

  const parsed = useMemo(() => {
    if (!initialDate) return { date: new Date(), hour: 9, minute: 0, hasTime: false }
    const d = new Date(initialDate)
    const h = d.getHours()
    const m = d.getMinutes()
    return { date: d, hour: h, minute: m, hasTime: h !== 0 || m !== 0 }
  }, [initialDate])

  const [selectedDate, setSelectedDate] = useState<Date>(parsed.date)
  const [hour, setHour] = useState(parsed.hour)
  const [minute, setMinute] = useState(parsed.minute)
  const [hasTime, setHasTime] = useState(parsed.hasTime)
  const [monthDate, setMonthDate] = useState(parsed.date)
  const [editingField, setEditingField] = useState<'hour' | 'minute' | null>(null)
  const [editText, setEditText] = useState('')
  const hourInputRef = useRef<TextInput>(null)
  const minuteInputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (visible) {
      setSelectedDate(parsed.date)
      setHour(parsed.hour)
      setMinute(parsed.minute)
      setHasTime(parsed.hasTime)
      setMonthDate(parsed.date)
      setEditingField(null)
      setTab('date')
    }
  }, [visible, parsed])

  const taskDots = useMemo(() => new Map<string, number>(), [])

  const handleDone = useCallback(() => {
    if (hasTime) {
      const d = new Date(selectedDate)
      d.setHours(hour, minute, 0, 0)
      onConfirm(d.toISOString())
    } else {
      const dateStr = toDateString(selectedDate)
      onConfirm(`${dateStr}T00:00:00.000Z`)
    }
  }, [selectedDate, hour, minute, hasTime, onConfirm])

  const handleClear = useCallback(() => {
    onConfirm(null)
  }, [onConfirm])

  const adjustHour = useCallback((delta: number) => {
    setHour((prev) => ((prev + delta + 24) % 24))
    setHasTime(true)
  }, [])

  const adjustMinute = useCallback((delta: number) => {
    setMinute((prev) => ((prev + delta + 60) % 60))
    setHasTime(true)
  }, [])

  const selectQuickTime = useCallback((h: number, m: number) => {
    setHour(h)
    setMinute(m)
    setHasTime(true)
    setEditingField(null)
  }, [])

  const startEditing = useCallback((field: 'hour' | 'minute') => {
    if (field === 'hour') {
      setEditText(formatHour(hour, is12h))
      setEditingField('hour')
      setTimeout(() => hourInputRef.current?.focus(), 50)
    } else {
      setEditText(String(minute).padStart(2, '0'))
      setEditingField('minute')
      setTimeout(() => minuteInputRef.current?.focus(), 50)
    }
  }, [hour, minute, is12h])

  const commitEdit = useCallback((field: 'hour' | 'minute') => {
    const val = parseInt(editText, 10)
    if (field === 'hour') {
      if (!isNaN(val)) {
        let h = val
        if (is12h) {
          if (h < 1 || h > 12) h = Math.max(1, Math.min(12, h))
          const wasPm = hour >= 12
          h = h === 12 ? 0 : h
          if (wasPm) h += 12
        } else {
          h = Math.max(0, Math.min(23, h))
        }
        setHour(h)
        setHasTime(true)
      }
    } else {
      if (!isNaN(val)) {
        setMinute(Math.max(0, Math.min(59, val)))
        setHasTime(true)
      }
    }
    setEditingField(null)
  }, [editText, is12h, hour])

  const displayTime = hasTime
    ? `${formatHour(hour, is12h)}:${String(minute).padStart(2, '0')}${is12h ? ` ${formatAmPm(hour)}` : ''}`
    : 'No time set'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1 }} onPress={onCancel} />
      <View
        style={{
          backgroundColor: theme.color.surface,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          paddingBottom: insets.bottom + theme.spacing.lg,
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
              firstDayOfWeek={firstDayOfWeek}
            />

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: theme.spacing.md,
            }}>
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {hasTime ? ` at ${displayTime}` : ''}
              </Text>
              <Pressable onPress={handleClear}>
                <Text style={{ ...typography.meta, color: theme.color.accent }}>Clear date</Text>
              </Pressable>
            </View>
          </View>
        )}

        {tab === 'time' && (
          <View style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: theme.spacing.xs, paddingTop: theme.spacing.xs }}
            >
              {QUICK_TIMES.map((qt) => {
                const isSelected = hasTime && hour === qt.hour && minute === qt.minute
                return (
                  <Pressable
                    key={qt.label}
                    onPress={() => selectQuickTime(qt.hour, qt.minute)}
                    style={({ pressed }) => ({
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.xs,
                      borderRadius: theme.radius.full,
                      backgroundColor: isSelected ? theme.color.accentSoft : theme.color.surfaceSoft,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.color.accent : 'transparent',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{
                      ...typography.meta,
                      fontFamily: isSelected ? 'Manrope_600SemiBold' : 'Manrope_400Regular',
                      color: isSelected ? theme.color.accent : theme.color.text,
                    }}>
                      {qt.label} ({formatHour(qt.hour, is12h)}:00{is12h ? ` ${formatAmPm(qt.hour)}` : ''})
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
                <View style={{ alignItems: 'center', gap: theme.spacing.micro }}>
                  <Pressable
                    onPress={() => adjustHour(1)}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      padding: theme.spacing.xs,
                      opacity: pressed ? 0.5 : 1,
                    })}
                  >
                    <SymbolView name={CHEVRON_UP} size={20} tintColor={theme.color.text2} />
                  </Pressable>
                  <Pressable
                    onPress={() => startEditing('hour')}
                    style={{
                      width: 64,
                      height: 56,
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.color.surfaceSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: editingField === 'hour' ? 2 : 0,
                      borderColor: theme.color.accent,
                    }}
                  >
                    {editingField === 'hour' ? (
                      <TextInput
                        ref={hourInputRef}
                        value={editText}
                        onChangeText={setEditText}
                        onBlur={() => commitEdit('hour')}
                        onSubmitEditing={() => commitEdit('hour')}
                        keyboardType="number-pad"
                        maxLength={2}
                        selectTextOnFocus
                        style={{
                          fontSize: 28,
                          fontFamily: 'Manrope_600SemiBold',
                          color: theme.color.text,
                          textAlign: 'center',
                          width: '100%',
                          padding: 0,
                        }}
                      />
                    ) : (
                      <Text style={{
                        fontSize: 28,
                        fontFamily: 'Manrope_600SemiBold',
                        color: hasTime ? theme.color.text : theme.color.text2,
                      }}>
                        {formatHour(hour, is12h)}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => adjustHour(-1)}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      padding: theme.spacing.xs,
                      opacity: pressed ? 0.5 : 1,
                    })}
                  >
                    <SymbolView name={CHEVRON_DOWN} size={20} tintColor={theme.color.text2} />
                  </Pressable>
                </View>

                <Text style={{ fontSize: 28, fontFamily: 'Manrope_600SemiBold', color: theme.color.text2 }}>:</Text>

                <View style={{ alignItems: 'center', gap: theme.spacing.micro }}>
                  <Pressable
                    onPress={() => adjustMinute(5)}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      padding: theme.spacing.xs,
                      opacity: pressed ? 0.5 : 1,
                    })}
                  >
                    <SymbolView name={CHEVRON_UP} size={20} tintColor={theme.color.text2} />
                  </Pressable>
                  <Pressable
                    onPress={() => startEditing('minute')}
                    style={{
                      width: 64,
                      height: 56,
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.color.surfaceSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: editingField === 'minute' ? 2 : 0,
                      borderColor: theme.color.accent,
                    }}
                  >
                    {editingField === 'minute' ? (
                      <TextInput
                        ref={minuteInputRef}
                        value={editText}
                        onChangeText={setEditText}
                        onBlur={() => commitEdit('minute')}
                        onSubmitEditing={() => commitEdit('minute')}
                        keyboardType="number-pad"
                        maxLength={2}
                        selectTextOnFocus
                        style={{
                          fontSize: 28,
                          fontFamily: 'Manrope_600SemiBold',
                          color: theme.color.text,
                          textAlign: 'center',
                          width: '100%',
                          padding: 0,
                        }}
                      />
                    ) : (
                      <Text style={{
                        fontSize: 28,
                        fontFamily: 'Manrope_600SemiBold',
                        color: hasTime ? theme.color.text : theme.color.text2,
                      }}>
                        {String(minute).padStart(2, '0')}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => adjustMinute(-5)}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      padding: theme.spacing.xs,
                      opacity: pressed ? 0.5 : 1,
                    })}
                  >
                    <SymbolView name={CHEVRON_DOWN} size={20} tintColor={theme.color.text2} />
                  </Pressable>
                </View>

                {is12h && (
                  <View style={{ alignItems: 'center', gap: theme.spacing.micro }}>
                    <Pressable
                      onPress={() => adjustHour(12)}
                      hitSlop={8}
                      style={({ pressed }) => ({
                        padding: theme.spacing.xs,
                        opacity: pressed ? 0.5 : 1,
                      })}
                    >
                      <SymbolView name={CHEVRON_UP} size={20} tintColor={theme.color.text2} />
                    </Pressable>
                    <View style={{
                      width: 52,
                      height: 56,
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.color.surfaceSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{
                        fontSize: 20,
                        fontFamily: 'Manrope_600SemiBold',
                        color: hasTime ? theme.color.text : theme.color.text2,
                      }}>
                        {formatAmPm(hour)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => adjustHour(-12)}
                      hitSlop={8}
                      style={({ pressed }) => ({
                        padding: theme.spacing.xs,
                        opacity: pressed ? 0.5 : 1,
                      })}
                    >
                      <SymbolView name={CHEVRON_DOWN} size={20} tintColor={theme.color.text2} />
                    </Pressable>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingTop: theme.spacing.xs }}>
                {hasTime && (
                  <Pressable
                    onPress={() => setHasTime(false)}
                    style={({ pressed }) => ({
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.xs,
                      borderRadius: theme.radius.full,
                      backgroundColor: theme.color.surfaceSoft,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ ...typography.meta, color: theme.color.text2 }}>Remove time</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  )
}
