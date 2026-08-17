import { useState, useMemo } from 'react'
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
  buildAgendaSections,
  getTodosInDateRange,
  groupTodosByDate,
  getTodosForDate,
} from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useMonthNavigation } from '@/hooks/use-month-navigation'
import { useWeekNavigation } from '@/hooks/use-week-navigation'
import { toDateString } from '@/lib/date-utils'
import { useListStore } from '@/stores/list-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

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

export default function UpcomingScreen() {
  const { theme } = useAppTheme()
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const listsById = useListStore((s) => s.listsById)
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek)

  const [view, setView] = useState<UpcomingView>('agenda')

  const week = useWeekNavigation(firstDayOfWeek)
  const month = useMonthNavigation()

  const weekTodos = useMemo(
    () => getTodosInDateRange(todosById, toDateString(week.weekStart), toDateString(week.weekEnd)),
    [todosById, week.weekStart, week.weekEnd],
  )

  const agendaSections = useMemo(() => buildAgendaSections(weekTodos), [weekTodos])

  const dayTodos = useMemo(
    () => getTodosForDate(todosById, toDateString(week.selectedDay)),
    [todosById, week.selectedDay],
  )

  const weekColumns = useMemo(
    () => week.weekDays.map((day) => ({ todos: getTodosForDate(todosById, toDateString(day)) })),
    [week.weekDays, todosById],
  )

  const weekColumnHeaders = useMemo(
    () =>
      week.weekDays.map((day) => {
        const abbr = day.toLocaleDateString('en-US', { weekday: 'short' })
        return `${abbr}\n${day.getDate()}`
      }),
    [week.weekDays],
  )

  const monthTodos = useMemo(
    () => getTodosInDateRange(todosById, toDateString(month.monthStart), toDateString(month.monthEnd)),
    [todosById, month.monthStart, month.monthEnd],
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
            label={week.rangeLabel}
            onPrev={week.navigatePrev}
            onNext={week.navigateNext}
            onToday={week.navigateToday}
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
                <AgendaSectionHeader
                  label={item.label}
                  count={item.count}
                />
              )
            }
            return <AgendaItem todo={item.todo} onToggle={toggleTodo} />
          }}
          ListEmptyComponent={
            <EmptyState message="No upcoming tasks this week" large />
          }
          ListFooterComponent={<InlineQuickAdd />}
        />
      )}

      {view === 'day' && (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <DaySelector days={week.weekDays} selectedDate={week.selectedDay} onSelect={week.setSelectedDay} />
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
                label={month.monthLabel}
                onPrev={month.navigateMonthPrev}
                onNext={month.navigateMonthNext}
                onToday={month.navigateMonthToday}
              />
              <MonthCalendar
                year={month.monthDate.getFullYear()}
                month={month.monthDate.getMonth()}
                selectedDate={month.selectedMonthDay}
                taskDots={monthTaskDots}
                onSelectDate={month.setSelectedMonthDay}
                firstDayOfWeek={firstDayOfWeek}
              />
            </View>
          }
          renderItem={({ item }) => (
            <MonthDaySummaryRow
              label={item.label}
              count={item.count}
              onPress={() => {
                const date = new Date(item.dateStr + 'T00:00:00')
                month.setSelectedMonthDay(date)
              }}
            />
          )}
          ListEmptyComponent={<EmptyState message="No tasks this month" />}
        />
      )}
    </View>
  )
}

function AgendaSectionHeader({ label, count }: { label: string; count: number }) {
  const { theme } = useAppTheme()

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
        {label}
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
          {count}
        </Text>
      </View>
    </View>
  )
}

function MonthDaySummaryRow({
  label,
  count,
  onPress,
}: {
  label: string
  count: number
  onPress: () => void
}) {
  const { theme } = useAppTheme()

  return (
    <Pressable
      onPress={onPress}
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
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        <Text style={{ ...typography.meta, color: theme.color.text2 }}>
          {count} {count === 1 ? 'task' : 'tasks'}
        </Text>
        <SymbolView name={CHEVRON_RIGHT} size={14} tintColor={theme.color.text2} />
      </View>
    </Pressable>
  )
}

function EmptyState({ message, large }: { message: string; large?: boolean }) {
  const { theme } = useAppTheme()

  return (
    <View style={{ alignItems: 'center', paddingTop: large ? theme.spacing['3xl'] : theme.spacing.lg }}>
      <Text style={{ ...typography.body, color: theme.color.text2 }}>
        {message}
      </Text>
    </View>
  )
}
