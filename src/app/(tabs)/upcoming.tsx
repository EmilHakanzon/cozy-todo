import { useState, useMemo, useCallback } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { AgendaItem } from '@/components/agenda-item'
import { DateRangeNav } from '@/components/date-range-nav'
import { DaySelector } from '@/components/day-selector'
import { InlineQuickAdd } from '@/components/quick-add'
import { MonthCalendar } from '@/components/month-calendar'
import { ScreenHeader } from '@/components/screen-header'
import { SegmentedControl } from '@/components/segmented-control'
import { TimeGrid } from '@/components/time-grid'
import {
  getTodosInDateRange,
  groupTodosByDate,
  getTodosForDate,
} from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import {
  addDays,
  endOfMonth,
  endOfWeek,
  formatMonthYear,
  formatWeekRange,
  formatDayHeader,
  getWeekDays,
  startOfMonth,
  startOfWeek,
  toDateString,
} from '@/lib/date-utils'
import { useListStore } from '@/stores/list-store'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'
import type { Todo } from '@/features/todos/types'

type UpcomingView = 'agenda' | 'day' | 'week' | 'month'

const VIEW_SEGMENTS = [
  { key: 'agenda' as const, label: 'Agenda' },
  { key: 'day' as const, label: 'Day' },
  { key: 'week' as const, label: 'Week' },
  { key: 'month' as const, label: 'Month' },
]

const CHEVRON_RIGHT: SymbolViewProps['name'] = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
}

type AgendaSection =
  | { type: 'header'; label: string; count: number }
  | { type: 'todo'; todo: Todo }

export default function UpcomingScreen() {
  const { theme } = useAppTheme()
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const listsById = useListStore((s) => s.listsById)

  const [view, setView] = useState<UpcomingView>('agenda')

  // Week-based state (agenda, day, week views)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => new Date())

  const weekEnd = useMemo(() => endOfWeek(weekStart), [weekStart])
  const rangeLabel = useMemo(() => formatWeekRange(weekStart, weekEnd), [weekStart, weekEnd])
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

  const navigatePrev = useCallback(
    () => setWeekStart((prev) => addDays(prev, -7)),
    [],
  )
  const navigateNext = useCallback(
    () => setWeekStart((prev) => addDays(prev, 7)),
    [],
  )
  const navigateToday = useCallback(() => {
    setWeekStart(startOfWeek(new Date()))
    setSelectedDay(new Date())
  }, [])

  // Month-based state
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [selectedMonthDay, setSelectedMonthDay] = useState<Date | null>(null)

  const monthStart = useMemo(() => startOfMonth(monthDate), [monthDate])
  const monthEnd = useMemo(() => endOfMonth(monthDate), [monthDate])
  const monthLabel = useMemo(() => formatMonthYear(monthDate), [monthDate])

  const navigateMonthPrev = useCallback(() => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    setSelectedMonthDay(null)
  }, [])
  const navigateMonthNext = useCallback(() => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    setSelectedMonthDay(null)
  }, [])
  const navigateMonthToday = useCallback(() => {
    setMonthDate(new Date())
    setSelectedMonthDay(null)
  }, [])

  // Agenda data
  const weekTodos = useMemo(
    () => getTodosInDateRange(todosById, toDateString(weekStart), toDateString(weekEnd)),
    [todosById, weekStart, weekEnd],
  )

  const agendaSections = useMemo(() => {
    const grouped = groupTodosByDate(weekTodos)
    const sections: AgendaSection[] = []

    const sortedDates = [...grouped.keys()].sort()
    for (const dateStr of sortedDates) {
      const todos = grouped.get(dateStr)!
      const date = new Date(dateStr + 'T00:00:00')
      sections.push({
        type: 'header',
        label: formatDayHeader(date),
        count: todos.length,
      })
      const sorted = [...todos].sort((a, b) => {
        if (!a.dueAt || !b.dueAt) return 0
        return a.dueAt.localeCompare(b.dueAt)
      })
      for (const todo of sorted) {
        sections.push({ type: 'todo', todo })
      }
    }

    return sections
  }, [weekTodos])

  // Day data
  const dayTodos = useMemo(
    () => getTodosForDate(todosById, toDateString(selectedDay)),
    [todosById, selectedDay],
  )

  // Week data
  const weekColumns = useMemo(() => {
    return weekDays.map((day) => ({
      todos: getTodosForDate(todosById, toDateString(day)),
    }))
  }, [weekDays, todosById])

  const weekColumnHeaders = useMemo(() => {
    return weekDays.map((day) => {
      const abbr = day.toLocaleDateString('en-US', { weekday: 'short' })
      return `${abbr}\n${day.getDate()}`
    })
  }, [weekDays])

  // Month data
  const monthTodos = useMemo(
    () => getTodosInDateRange(todosById, toDateString(monthStart), toDateString(monthEnd)),
    [todosById, monthStart, monthEnd],
  )

  const monthTaskDots = useMemo(() => {
    const dots = new Map<string, number>()
    for (const todo of monthTodos) {
      if (!todo.dueAt) continue
      const dateStr = todo.dueAt.split('T')[0]
      dots.set(dateStr, (dots.get(dateStr) ?? 0) + 1)
    }
    return dots
  }, [monthTodos])

  const monthDaySummaries = useMemo(() => {
    const grouped = groupTodosByDate(monthTodos)
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, todos]) => {
        const date = new Date(dateStr + 'T00:00:00')
        return {
          dateStr,
          label: date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
          }),
          count: todos.length,
        }
      })
  }, [monthTodos])

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <ScreenHeader title="Upcoming" />

      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.xs,
          paddingBottom: theme.spacing.sm,
        }}
      >
        <SegmentedControl segments={VIEW_SEGMENTS} value={view} onChange={setView} />

        {(view === 'agenda' || view === 'day' || view === 'week') && (
          <DateRangeNav
            label={rangeLabel}
            onPrev={navigatePrev}
            onNext={navigateNext}
            onToday={navigateToday}
          />
        )}
      </View>

      {view === 'agenda' && (
        <FlatList
          data={agendaSections}
          keyExtractor={(item, index) =>
            item.type === 'todo' ? item.todo.id : `header-${index}`
          }
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: 120,
          }}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: theme.spacing.lg,
                    paddingBottom: theme.spacing.xs,
                  }}
                >
                  <Text style={{ ...typography.sectionTitle, color: theme.color.text2 }}>
                    {item.label}
                  </Text>
                  <View
                    style={{
                      minWidth: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: theme.color.accentSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: 'Manrope_600SemiBold',
                        color: theme.color.accent,
                      }}
                    >
                      {item.count}
                    </Text>
                  </View>
                </View>
              )
            }
            return <AgendaItem todo={item.todo} onToggle={toggleTodo} />
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
              <Text style={{ ...typography.body, color: theme.color.text2 }}>
                No upcoming tasks this week
              </Text>
            </View>
          }
          ListFooterComponent={<InlineQuickAdd />}
        />
      )}

      {view === 'day' && (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <DaySelector days={weekDays} selectedDate={selectedDay} onSelect={setSelectedDay} />
          </View>
          <TimeGrid
            columns={[{ todos: dayTodos }]}
            listsById={listsById}
            onToggle={toggleTodo}
          />
        </View>
      )}

      {view === 'week' && (
        <TimeGrid
          columns={weekColumns}
          columnHeaders={weekColumnHeaders}
          listsById={listsById}
          onToggle={toggleTodo}
          hourHeight={50}
        />
      )}

      {view === 'month' && (
        <FlatList
          data={monthDaySummaries}
          keyExtractor={(item) => item.dateStr}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: 120,
          }}
          ListHeaderComponent={
            <View>
              <DateRangeNav
                label={monthLabel}
                onPrev={navigateMonthPrev}
                onNext={navigateMonthNext}
                onToday={navigateMonthToday}
              />
              <MonthCalendar
                year={monthDate.getFullYear()}
                month={monthDate.getMonth()}
                selectedDate={selectedMonthDay}
                taskDots={monthTaskDots}
                onSelectDate={setSelectedMonthDay}
              />
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                const date = new Date(item.dateStr + 'T00:00:00')
                setSelectedMonthDay(date)
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: theme.color.border,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ ...typography.body, color: theme.color.text }}>
                {item.label}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                  {item.count} {item.count === 1 ? 'task' : 'tasks'}
                </Text>
                <SymbolView
                  name={CHEVRON_RIGHT}
                  size={14}
                  tintColor={theme.color.text2}
                />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: theme.spacing.lg }}>
              <Text style={{ ...typography.body, color: theme.color.text2 }}>
                No tasks this month
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}
