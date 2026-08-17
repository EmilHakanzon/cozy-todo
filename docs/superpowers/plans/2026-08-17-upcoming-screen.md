# Upcoming Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Upcoming screen with 4 views — Agenda (default), Day, Week, and Month — matching the Calendar/Upcoming design mockup (image 4).

**Architecture:** Single `upcoming.tsx` screen with a SegmentedControl switching between 4 view components. All views share a `DateRangeNav` for week/month navigation and a date utilities module. Agenda uses a grouped FlatList with a new `AgendaItem` layout (time column + color bar). Day/Week use a shared `TimeGrid` to position tasks on a time axis. Month uses a `MonthCalendar` grid with task-count dots and a day-summary list below.

**Tech Stack:** Expo SDK 57, expo-router, expo-symbols (SymbolView), Zustand, React Native

**Spec:** Design mockup image 4 (`assets/images/ChatGPT Image 14 aug. 2026 15_14_01.png`)

## Global Constraints

- Expo SDK 57 — read versioned docs at https://docs.expo.dev/versions/v57.0.0/
- Font: Manrope (400 Regular, 500 Medium, 600 SemiBold)
- Spacing: 4px grid via existing `spacing.ts` tokens
- Radius: existing `radius.ts` tokens
- Colors: existing `colors.ts` light/dark palettes, `list-color.ts` for list accents
- Path aliases: `@/*` → `./src/*`
- Icons: `SymbolView` from `expo-symbols` — use `SymbolViewProps['name']` type, no `any`
- All new files use the existing `useAppTheme()` hook
- No `any` types. No comments unless WHY is non-obvious.
- First day of week: Monday (matches design; settings can change later)
- Todos have `dueAt: string | null` (ISO timestamp). No duration field — tasks render as fixed-height blocks on time grids.

---

### Task 1: Date Utilities + Selectors

**Files:**
- Create: `src/lib/date-utils.ts`
- Create: `src/lib/date-utils.test.ts`
- Modify: `src/features/todos/selectors.ts`
- Modify: `src/features/todos/selectors.test.ts`

**Interfaces:**
- Consumes: `Todo`, `TodoById` from `@/features/todos/types`, `sortByPosition` from `@/features/todos/todo-tree`
- Produces:
  - `startOfDay(date)`, `addDays(date, n)`, `startOfWeek(date)`, `endOfWeek(date)`, `startOfMonth(date)`, `endOfMonth(date)`, `isSameDay(a, b)`, `isToday(date)`, `isTomorrow(date)`, `toDateString(date)`, `getWeekDays(weekStart)`, `formatWeekRange(start, end)`, `formatDayHeader(date)`, `formatMonthYear(date)`, `formatTime(dateStr)`
  - `getTodosInDateRange(todosById, startDate, endDate)` → `Todo[]`
  - `groupTodosByDate(todos)` → `Map<string, Todo[]>`
  - `getTodosForDate(todosById, dateStr)` → `Todo[]`

- [ ] **Step 1: Write tests for date utilities**

Create `src/lib/date-utils.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  startOfDay,
  addDays,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isToday,
  isTomorrow,
  toDateString,
  getWeekDays,
  formatWeekRange,
  formatDayHeader,
  formatTime,
} from './date-utils'

describe('startOfDay', () => {
  it('zeros out hours/minutes/seconds', () => {
    const d = startOfDay(new Date(2026, 7, 17, 14, 30, 45))
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
  })
})

describe('addDays', () => {
  it('adds positive days', () => {
    const d = addDays(new Date(2026, 7, 17), 3)
    expect(d.getDate()).toBe(20)
  })

  it('adds negative days', () => {
    const d = addDays(new Date(2026, 7, 17), -2)
    expect(d.getDate()).toBe(15)
  })
})

describe('startOfWeek', () => {
  it('returns Monday for a Wednesday', () => {
    const wed = new Date(2026, 7, 19) // Wednesday Aug 19
    const mon = startOfWeek(wed)
    expect(mon.getDay()).toBe(1) // Monday
    expect(mon.getDate()).toBe(17)
  })

  it('returns Monday for a Sunday', () => {
    const sun = new Date(2026, 7, 23) // Sunday Aug 23
    const mon = startOfWeek(sun)
    expect(mon.getDay()).toBe(1)
    expect(mon.getDate()).toBe(17)
  })

  it('returns same day for a Monday', () => {
    const mon = new Date(2026, 7, 17)
    expect(startOfWeek(mon).getDate()).toBe(17)
  })
})

describe('endOfWeek', () => {
  it('returns Sunday for a Wednesday', () => {
    const wed = new Date(2026, 7, 19)
    const sun = endOfWeek(wed)
    expect(sun.getDay()).toBe(0) // Sunday
    expect(sun.getDate()).toBe(23)
  })
})

describe('isSameDay', () => {
  it('matches same calendar day', () => {
    expect(isSameDay(new Date(2026, 7, 17, 9, 0), new Date(2026, 7, 17, 18, 0))).toBe(true)
  })

  it('rejects different days', () => {
    expect(isSameDay(new Date(2026, 7, 17), new Date(2026, 7, 18))).toBe(false)
  })
})

describe('toDateString', () => {
  it('returns YYYY-MM-DD', () => {
    expect(toDateString(new Date(2026, 7, 17))).toBe('2026-08-17')
  })
})

describe('getWeekDays', () => {
  it('returns 7 days starting from given date', () => {
    const mon = new Date(2026, 7, 17)
    const days = getWeekDays(mon)
    expect(days).toHaveLength(7)
    expect(days[0].getDate()).toBe(17)
    expect(days[6].getDate()).toBe(23)
  })
})

describe('formatWeekRange', () => {
  it('formats same-month range', () => {
    const start = new Date(2026, 7, 17)
    const end = new Date(2026, 7, 23)
    expect(formatWeekRange(start, end)).toBe('Aug 17 – 23, 2026')
  })

  it('formats cross-month range', () => {
    const start = new Date(2026, 7, 31)
    const end = new Date(2026, 8, 6)
    expect(formatWeekRange(start, end)).toBe('Aug 31 – Sep 6, 2026')
  })
})

describe('formatDayHeader', () => {
  it('formats a regular date', () => {
    const date = new Date(2026, 7, 20) // Thursday
    const result = formatDayHeader(date)
    expect(result).toBe('THURSDAY, AUGUST 20')
  })
})

describe('formatTime', () => {
  it('formats an ISO string to HH:mm', () => {
    expect(formatTime('2026-08-17T14:30:00.000Z')).toMatch(/\d{2}:\d{2}/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/date-utils.test.ts
```

Expected: failures for undefined module.

- [ ] **Step 3: Implement date utilities**

Create `src/lib/date-utils.ts`:

```typescript
export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6)
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}

export function endOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function isTomorrow(date: Date): boolean {
  return isSameDay(date, addDays(new Date(), 1))
}

export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function formatWeekRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
  const year = end.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${year}`
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${year}`
}

export function formatDayHeader(date: Date): string {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const monthDay = date
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    .toUpperCase()

  if (isToday(date)) return `TODAY · ${dayName}, ${monthDay}`
  if (isTomorrow(date)) return `TOMORROW · ${dayName}, ${monthDay}`
  return `${dayName}, ${monthDay}`
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/date-utils.test.ts
```

Expected: all pass.

- [ ] **Step 5: Write tests for new selectors**

Add to `src/features/todos/selectors.test.ts`:

```typescript
import {
  getTodosInDateRange,
  groupTodosByDate,
  getTodosForDate,
} from './selectors'

describe('getTodosInDateRange', () => {
  it('returns root todos with dueAt in range', () => {
    const todosById: TodoById = {
      a: makeTodo({ id: 'a', dueAt: '2026-08-17T09:00:00.000Z' }),
      b: makeTodo({ id: 'b', dueAt: '2026-08-19T10:00:00.000Z' }),
      c: makeTodo({ id: 'c', dueAt: '2026-08-25T10:00:00.000Z' }),
      d: makeTodo({ id: 'd', dueAt: null }),
      e: makeTodo({ id: 'e', dueAt: '2026-08-18T08:00:00.000Z', parentId: 'a' }),
    }
    const result = getTodosInDateRange(todosById, '2026-08-17', '2026-08-23')
    expect(result.map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('groupTodosByDate', () => {
  it('groups todos by date string', () => {
    const todos = [
      makeTodo({ id: 'a', dueAt: '2026-08-17T09:00:00.000Z' }),
      makeTodo({ id: 'b', dueAt: '2026-08-17T14:00:00.000Z' }),
      makeTodo({ id: 'c', dueAt: '2026-08-18T10:00:00.000Z' }),
    ]
    const groups = groupTodosByDate(todos)
    expect(groups.get('2026-08-17')?.map((t) => t.id)).toEqual(['a', 'b'])
    expect(groups.get('2026-08-18')?.map((t) => t.id)).toEqual(['c'])
  })
})

describe('getTodosForDate', () => {
  it('returns root todos for a specific date', () => {
    const todosById: TodoById = {
      a: makeTodo({ id: 'a', dueAt: '2026-08-17T09:00:00.000Z' }),
      b: makeTodo({ id: 'b', dueAt: '2026-08-18T10:00:00.000Z' }),
      c: makeTodo({ id: 'c', dueAt: '2026-08-17T14:00:00.000Z', parentId: 'a' }),
    }
    const result = getTodosForDate(todosById, '2026-08-17')
    expect(result.map((t) => t.id)).toEqual(['a'])
  })
})
```

- [ ] **Step 6: Implement the selectors**

Add to `src/features/todos/selectors.ts`:

```typescript
export function getTodosInDateRange(
  todosById: TodoById,
  startDate: string,
  endDate: string,
): Todo[] {
  return sortByPosition(
    Object.values(todosById).filter((todo) => {
      if (!todo.dueAt || todo.parentId !== null) return false
      const dueDate = todo.dueAt.split('T')[0]
      return dueDate >= startDate && dueDate <= endDate
    }),
  )
}

export function groupTodosByDate(todos: Todo[]): Map<string, Todo[]> {
  const groups = new Map<string, Todo[]>()
  for (const todo of todos) {
    if (!todo.dueAt) continue
    const dateStr = todo.dueAt.split('T')[0]
    const existing = groups.get(dateStr) ?? []
    existing.push(todo)
    groups.set(dateStr, existing)
  }
  return groups
}

export function getTodosForDate(todosById: TodoById, dateStr: string): Todo[] {
  return sortByPosition(
    Object.values(todosById).filter(
      (todo) => todo.parentId === null && todo.dueAt?.startsWith(dateStr),
    ),
  )
}
```

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/date-utils.ts src/lib/date-utils.test.ts \
  src/features/todos/selectors.ts src/features/todos/selectors.test.ts
git commit -m "feat: date utilities and date-range selectors for Upcoming screen"
```

---

### Task 2: Agenda View + Upcoming Screen

**Files:**
- Create: `src/components/date-range-nav.tsx`
- Create: `src/components/agenda-item.tsx`
- Modify: `src/app/(tabs)/upcoming.tsx`

**Interfaces:**
- Consumes: `useAppTheme()`, `SymbolViewProps`, `typography`, `useTodoStore`, `useListStore`, `listColorsFor()`, `TodoCheckbox`, `InlineQuickAdd`, `ScreenHeader`, `SegmentedControl`, date-utils, selectors `getTodosInDateRange`, `groupTodosByDate`
- Produces:
  - `DateRangeNav`: `({ label, onPrev, onNext, onToday }) => JSX.Element`
  - `AgendaItem`: `({ todo, onToggle }) => JSX.Element`
  - Full Upcoming screen with Agenda as default view, other views showing "Coming soon"

- [ ] **Step 1: Build DateRangeNav component**

Create `src/components/date-range-nav.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

type DateRangeNavProps = {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

const CHEVRON_LEFT: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'chevron_left',
  web: 'chevron_left',
}
const CHEVRON_RIGHT: SymbolViewProps['name'] = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
}

export function DateRangeNav({ label, onPrev, onNext, onToday }: DateRangeNavProps) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Pressable
          onPress={onPrev}
          hitSlop={8}
          accessibilityLabel="Previous"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <SymbolView name={CHEVRON_LEFT} size={18} tintColor={theme.color.text2} />
        </Pressable>
        <Text
          style={{
            ...typography.meta,
            fontFamily: 'Manrope_500Medium',
            color: theme.color.text,
          }}
        >
          {label}
        </Text>
        <Pressable
          onPress={onNext}
          hitSlop={8}
          accessibilityLabel="Next"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <SymbolView name={CHEVRON_RIGHT} size={18} tintColor={theme.color.text2} />
        </Pressable>
      </View>
      <Pressable
        onPress={onToday}
        style={({ pressed }) => ({
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.micro,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.color.surfaceSoft,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            ...typography.meta,
            fontFamily: 'Manrope_500Medium',
            color: theme.color.text,
          }}
        >
          Today
        </Text>
      </Pressable>
    </View>
  )
}
```

- [ ] **Step 2: Build AgendaItem component**

Create `src/components/agenda-item.tsx`:

```tsx
import { Text, View } from 'react-native'

import { TodoCheckbox } from './todo-checkbox'
import { getTodoProgress } from '@/features/todos/selectors'
import { getChildren } from '@/features/todos/todo-tree'
import { useAppTheme } from '@/hooks/use-app-theme'
import { formatTime } from '@/lib/date-utils'
import { useListStore } from '@/stores/list-store'
import { useTodoStore } from '@/stores/todo-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { Todo, TodoId } from '@/features/todos/types'

type AgendaItemProps = {
  todo: Todo
  onToggle: (id: TodoId) => void
}

export function AgendaItem({ todo, onToggle }: AgendaItemProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const list = useListStore((s) => s.listsById[todo.listId])
  const todosById = useTodoStore((s) => s.todosById)
  const children = getChildren(todosById, todo.id)
  const isCompleted = todo.completedAt !== null
  const hasChildren = children.length > 0

  const listColors = listColorsFor(resolvedTheme)
  const listColor = list ? listColors[list.color] : null

  const timeStr = todo.dueAt ? formatTime(todo.dueAt) : ''

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: theme.spacing.sm,
      }}
    >
      <View style={{ width: 52, paddingTop: 2 }}>
        <Text
          style={{
            ...typography.meta,
            fontFamily: 'Manrope_500Medium',
            color: theme.color.text2,
          }}
        >
          {timeStr}
        </Text>
      </View>

      <View
        style={{
          width: 3,
          alignSelf: 'stretch',
          borderRadius: 1.5,
          backgroundColor: listColor?.accent ?? theme.color.border,
          marginRight: theme.spacing.sm,
        }}
      />

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: theme.spacing.sm,
        }}
      >
        <TodoCheckbox checked={isCompleted} onToggle={() => onToggle(todo.id)} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...typography.taskTitle,
              color: isCompleted ? theme.color.text2 : theme.color.text,
              textDecorationLine: isCompleted ? 'line-through' : 'none',
            }}
            numberOfLines={2}
          >
            {todo.title}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.micro,
              marginTop: 2,
            }}
          >
            {listColor && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: listColor.accent,
                }}
              />
            )}
            {list && (
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                {list.name}
              </Text>
            )}
          </View>
          {hasChildren && (
            <Text style={{ ...typography.meta, color: theme.color.text2, marginTop: 2 }}>
              {getTodoProgress(todosById, todo.id).completed} /{' '}
              {getTodoProgress(todosById, todo.id).total}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 3: Implement Upcoming screen with Agenda view**

Replace `src/app/(tabs)/upcoming.tsx`:

```tsx
import { useState, useMemo, useCallback } from 'react'
import { FlatList, Text, View } from 'react-native'

import { AgendaItem } from '@/components/agenda-item'
import { DateRangeNav } from '@/components/date-range-nav'
import { InlineQuickAdd } from '@/components/quick-add'
import { ScreenHeader } from '@/components/screen-header'
import { SegmentedControl } from '@/components/segmented-control'
import { getTodosInDateRange, groupTodosByDate } from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import {
  addDays,
  endOfWeek,
  formatDayHeader,
  formatWeekRange,
  startOfWeek,
  toDateString,
} from '@/lib/date-utils'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

import type { Todo } from '@/features/todos/types'

type UpcomingView = 'agenda' | 'day' | 'week' | 'month'

const VIEW_SEGMENTS = [
  { key: 'agenda' as const, label: 'Agenda' },
  { key: 'day' as const, label: 'Day' },
  { key: 'week' as const, label: 'Week' },
  { key: 'month' as const, label: 'Month' },
]

type AgendaSection =
  | { type: 'header'; label: string; count: number }
  | { type: 'todo'; todo: Todo }

export default function UpcomingScreen() {
  const { theme } = useAppTheme()
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)

  const [view, setView] = useState<UpcomingView>('agenda')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const weekEnd = useMemo(() => endOfWeek(weekStart), [weekStart])
  const rangeLabel = useMemo(() => formatWeekRange(weekStart, weekEnd), [weekStart, weekEnd])

  const navigatePrev = useCallback(
    () => setWeekStart((prev) => addDays(prev, -7)),
    [],
  )
  const navigateNext = useCallback(
    () => setWeekStart((prev) => addDays(prev, 7)),
    [],
  )
  const navigateToday = useCallback(
    () => setWeekStart(startOfWeek(new Date())),
    [],
  )

  const weekTodos = useMemo(
    () =>
      getTodosInDateRange(todosById, toDateString(weekStart), toDateString(weekEnd)),
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
        <DateRangeNav
          label={rangeLabel}
          onPrev={navigatePrev}
          onNext={navigateNext}
          onToday={navigateToday}
        />
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

      {view !== 'agenda' && (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: 120,
          }}
        >
          <Text style={{ ...typography.body, color: theme.color.text2 }}>
            {view.charAt(0).toUpperCase() + view.slice(1)} view — coming next
          </Text>
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 4: Verify Agenda view**

Run the app. Navigate to Upcoming tab. Confirm:
- "Upcoming" header displays
- Segmented control shows Agenda / Day / Week / Month
- Date range shows current week with nav arrows and Today button
- Prev/next arrows navigate by week
- Todos with `dueAt` in the current week appear grouped by date
- AgendaItem shows time, color bar, checkbox, title, list name
- Empty state shows "No upcoming tasks this week"
- Other views show "Coming next" placeholder

- [ ] **Step 5: Commit**

```bash
git add src/components/date-range-nav.tsx src/components/agenda-item.tsx \
  src/app/\(tabs\)/upcoming.tsx
git commit -m "feat: Upcoming screen with Agenda view and date navigation"
```

---

### Task 3: Day View

**Files:**
- Create: `src/components/day-selector.tsx`
- Create: `src/components/time-grid.tsx`
- Modify: `src/app/(tabs)/upcoming.tsx`

**Interfaces:**
- Consumes: `useAppTheme()`, `typography`, `isToday()`, `isSameDay()`, `getWeekDays()`, `toDateString()`, `getTodosForDate()`, `useListStore`, `useTodoStore`, `listColorsFor()`
- Produces:
  - `DaySelector`: `({ days, selectedDate, onSelect }) => JSX.Element`
  - `TimeGrid`: `({ todos, listsById, onToggle }) => JSX.Element`

- [ ] **Step 1: Build DaySelector component**

Create `src/components/day-selector.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { isSameDay, isToday } from '@/lib/date-utils'
import { typography } from '@/themes/typography'

type DaySelectorProps = {
  days: Date[]
  selectedDate: Date
  onSelect: (date: Date) => void
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DaySelector({ days, selectedDate, onSelect }: DaySelectorProps) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: theme.spacing.xs,
      }}
    >
      {days.map((day) => {
        const selected = isSameDay(day, selectedDate)
        const today = isToday(day)

        return (
          <Pressable
            key={day.toISOString()}
            onPress={() => onSelect(day)}
            style={{
              alignItems: 'center',
              gap: theme.spacing.micro,
              paddingVertical: theme.spacing.xs,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: theme.radius.md,
              backgroundColor: selected ? theme.color.accent : 'transparent',
            }}
          >
            <Text
              style={{
                ...typography.meta,
                fontSize: 11,
                color: selected ? '#ffffff' : theme.color.text2,
              }}
            >
              {DAY_ABBR[day.getDay()]}
            </Text>
            <Text
              style={{
                ...typography.taskTitle,
                fontSize: 16,
                color: selected
                  ? '#ffffff'
                  : today
                    ? theme.color.accent
                    : theme.color.text,
              }}
            >
              {day.getDate()}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
```

- [ ] **Step 2: Build TimeGrid component**

Create `src/components/time-grid.tsx`:

```tsx
import { ScrollView, Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { TodoList } from '@/features/lists/types'
import type { Todo, TodoId } from '@/features/todos/types'

type TimeGridProps = {
  columns: { todos: Todo[] }[]
  columnHeaders?: string[]
  listsById: Record<string, TodoList>
  startHour?: number
  endHour?: number
  hourHeight?: number
  onToggle: (id: TodoId) => void
}

const BLOCK_HEIGHT = 48

export function TimeGrid({
  columns,
  columnHeaders,
  listsById,
  startHour = 7,
  endHour = 21,
  hourHeight = 60,
  onToggle,
}: TimeGridProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const listColors = listColorsFor(resolvedTheme)
  const totalHeight = (endHour - startHour) * hourHeight
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {columnHeaders && (
        <View style={{ flexDirection: 'row', paddingLeft: 48 }}>
          {columnHeaders.map((header, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: theme.spacing.micro,
              }}
            >
              <Text
                style={{
                  ...typography.meta,
                  fontSize: 11,
                  fontFamily: 'Manrope_500Medium',
                  color: theme.color.text2,
                }}
              >
                {header}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', height: totalHeight }}>
        <View style={{ width: 48 }}>
          {hours.map((hour) => (
            <View
              key={hour}
              style={{ height: hourHeight, justifyContent: 'flex-start' }}
            >
              <Text
                style={{
                  ...typography.meta,
                  fontSize: 11,
                  color: theme.color.text2,
                  textAlign: 'right',
                  paddingRight: theme.spacing.xs,
                }}
              >
                {String(hour).padStart(2, '0')}:00
              </Text>
            </View>
          ))}
        </View>

        {columns.map((col, colIndex) => (
          <View
            key={colIndex}
            style={{
              flex: 1,
              position: 'relative',
              borderLeftWidth: 1,
              borderLeftColor: theme.color.border,
            }}
          >
            {hours.map((hour) => (
              <View
                key={hour}
                style={{
                  position: 'absolute',
                  top: (hour - startHour) * hourHeight,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: theme.color.border,
                }}
              />
            ))}

            {col.todos.map((todo) => {
              if (!todo.dueAt) return null
              const date = new Date(todo.dueAt)
              const todoHour = date.getHours() + date.getMinutes() / 60
              if (todoHour < startHour || todoHour >= endHour) return null

              const top = (todoHour - startHour) * hourHeight
              const list = listsById[todo.listId]
              const palette = list ? listColors[list.color] : null

              return (
                <View
                  key={todo.id}
                  style={{
                    position: 'absolute',
                    top,
                    left: 2,
                    right: 2,
                    height: BLOCK_HEIGHT,
                    backgroundColor: palette?.background ?? theme.color.surfaceSoft,
                    borderRadius: theme.radius.sm,
                    borderLeftWidth: 3,
                    borderLeftColor: palette?.accent ?? theme.color.accent,
                    paddingHorizontal: theme.spacing.xs,
                    paddingVertical: theme.spacing.micro,
                    overflow: 'hidden',
                  }}
                >
                  <Text
                    style={{
                      ...typography.meta,
                      fontFamily: 'Manrope_500Medium',
                      color: theme.color.text,
                    }}
                    numberOfLines={2}
                  >
                    {todo.title}
                  </Text>
                </View>
              )
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
```

- [ ] **Step 3: Wire Day view into Upcoming screen**

In `src/app/(tabs)/upcoming.tsx`, add imports and replace the `view !== 'agenda'` placeholder with the Day view:

```tsx
// Add imports at top:
import { DaySelector } from '@/components/day-selector'
import { TimeGrid } from '@/components/time-grid'
import { getTodosForDate } from '@/features/todos/selectors'
import { useListStore } from '@/stores/list-store'
import { getWeekDays, isSameDay, toDateString, formatDayHeader } from '@/lib/date-utils'

// Add to component body (after existing state):
const listsById = useListStore((s) => s.listsById)
const [selectedDay, setSelectedDay] = useState(() => new Date())
const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

const dayTodos = useMemo(
  () => getTodosForDate(todosById, toDateString(selectedDay)),
  [todosById, selectedDay],
)

const dayLabel = useMemo(() => {
  const d = selectedDay
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'long' })
}, [selectedDay])

// Replace the `{view !== 'agenda' && ...}` placeholder block with:

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

{(view === 'week' || view === 'month') && (
  <View
    style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 120,
    }}
  >
    <Text style={{ ...typography.body, color: theme.color.text2 }}>
      {view.charAt(0).toUpperCase() + view.slice(1)} view — coming next
    </Text>
  </View>
)}
```

- [ ] **Step 4: Verify Day view**

Run the app. Switch to "Day" in the segmented control. Confirm:
- Day selector row shows Mon–Sun with dates
- Tapping a day highlights it and shows that day's tasks
- Today is highlighted with accent color
- Time grid shows hour slots 07:00–21:00
- Tasks appear as colored blocks at their time
- Block color matches the list color
- Scrolling the time grid works smoothly

- [ ] **Step 5: Commit**

```bash
git add src/components/day-selector.tsx src/components/time-grid.tsx \
  src/app/\(tabs\)/upcoming.tsx
git commit -m "feat: Day view with time grid and day selector"
```

---

### Task 4: Week View

**Files:**
- Modify: `src/app/(tabs)/upcoming.tsx`

**Interfaces:**
- Consumes: `TimeGrid`, `getWeekDays()`, `toDateString()`, `getTodosForDate()`, `useListStore`, `useTodoStore`
- Produces: Week view with 7-column time grid

- [ ] **Step 1: Wire Week view into Upcoming screen**

In `src/app/(tabs)/upcoming.tsx`, replace the `view === 'week'` placeholder:

```tsx
// Add to component body (after weekDays):
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

// Replace the `view === 'week'` placeholder with:

{view === 'week' && (
  <TimeGrid
    columns={weekColumns}
    columnHeaders={weekColumnHeaders}
    listsById={listsById}
    onToggle={toggleTodo}
    hourHeight={50}
  />
)}

// Update the remaining placeholder for month only:
{view === 'month' && (
  <View
    style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 120,
    }}
  >
    <Text style={{ ...typography.body, color: theme.color.text2 }}>
      Month view — coming next
    </Text>
  </View>
)}
```

- [ ] **Step 2: Verify Week view**

Run the app. Switch to "Week" in the segmented control. Confirm:
- 7 columns with day abbreviation + date headers (Mon–Sun)
- Time grid shows hour slots
- Tasks appear in the correct day column at their time
- Navigating weeks with arrows updates all 7 columns
- Blocks are colored by list color
- Compact hourHeight (50) keeps the grid readable

- [ ] **Step 3: Commit**

```bash
git add src/app/\(tabs\)/upcoming.tsx
git commit -m "feat: Week view with 7-column time grid"
```

---

### Task 5: Month View

**Files:**
- Create: `src/components/month-calendar.tsx`
- Modify: `src/app/(tabs)/upcoming.tsx`

**Interfaces:**
- Consumes: `useAppTheme()`, `typography`, `isSameDay()`, `isToday()`, `toDateString()`, `startOfMonth()`, `endOfMonth()`, `formatMonthYear()`, `addDays()`, `getTodosInDateRange()`, `groupTodosByDate()`, `getTodosForDate()`
- Produces:
  - `MonthCalendar`: `({ year, month, selectedDate, taskDots, onSelectDate }) => JSX.Element`
  - Month view with calendar grid, task dots, and day summary list

- [ ] **Step 1: Build MonthCalendar component**

Create `src/components/month-calendar.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { isSameDay, isToday } from '@/lib/date-utils'
import { typography } from '@/themes/typography'

type MonthCalendarProps = {
  year: number
  month: number
  selectedDate: Date | null
  taskDots: Map<string, number>
  onSelectDate: (date: Date) => void
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthCalendar({
  year,
  month,
  selectedDate,
  taskDots,
  onSelectDate,
}: MonthCalendarProps) {
  const { theme } = useAppTheme()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const days: (number | null)[] = [
    ...new Array(startOffset).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ]
  while (days.length % 7 !== 0) days.push(null)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((day) => (
          <View
            key={day}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: theme.spacing.xs,
            }}
          >
            <Text
              style={{ ...typography.meta, fontSize: 11, color: theme.color.text2 }}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={di} style={{ flex: 1, height: 48 }} />
            }

            const date = new Date(year, month, day)
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const count = taskDots.get(dateStr) ?? 0
            const today = isToday(date)
            const selected = selectedDate ? isSameDay(date, selectedDate) : false

            return (
              <Pressable
                key={di}
                onPress={() => onSelectDate(date)}
                style={{
                  flex: 1,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: selected
                      ? theme.color.accent
                      : today
                        ? theme.color.accentSoft
                        : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      ...typography.meta,
                      fontFamily: 'Manrope_500Medium',
                      color: selected
                        ? '#ffffff'
                        : today
                          ? theme.color.accent
                          : theme.color.text,
                    }}
                  >
                    {day}
                  </Text>
                </View>
                {count > 0 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 2,
                      marginTop: 2,
                      position: 'absolute',
                      bottom: 2,
                    }}
                  >
                    {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                      <View
                        key={i}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: theme.color.accent,
                        }}
                      />
                    ))}
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}
```

- [ ] **Step 2: Wire Month view into Upcoming screen**

In `src/app/(tabs)/upcoming.tsx`, add imports and replace the month placeholder:

```tsx
// Add imports at top:
import { MonthCalendar } from '@/components/month-calendar'
import {
  startOfMonth,
  endOfMonth,
  formatMonthYear,
} from '@/lib/date-utils'

// Add to component body:
const [monthDate, setMonthDate] = useState(() => new Date())
const [selectedMonthDay, setSelectedMonthDay] = useState<Date | null>(null)

const monthStart = useMemo(() => startOfMonth(monthDate), [monthDate])
const monthEnd = useMemo(() => endOfMonth(monthDate), [monthDate])
const monthLabel = useMemo(() => formatMonthYear(monthDate), [monthDate])

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

// Replace the month placeholder with:

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
```

Note: `CHEVRON_RIGHT` and the `SymbolView` import for it need to be added. Import `SymbolView` from `expo-symbols` and define the constant at the module level:

```tsx
import { SymbolView } from 'expo-symbols'
import type { SymbolViewProps } from 'expo-symbols'

const CHEVRON_RIGHT: SymbolViewProps['name'] = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
}
```

Also import `Pressable` from `react-native` (it's already in the imports).

- [ ] **Step 3: Update DateRangeNav for Month view**

The Month view uses its own DateRangeNav (with month label instead of week range). The existing `DateRangeNav` component already supports this — the `label` prop is passed the month string instead of the week range. The month nav callbacks are separate from the week nav callbacks. No component changes needed — just different props in the month view's `ListHeaderComponent`.

Remove the shared `DateRangeNav` from the section between SegmentedControl and the views — it should only appear in Agenda/Day/Week views. Restructure:

```tsx
{/* Show week-based DateRangeNav only for agenda/day/week */}
{(view === 'agenda' || view === 'day' || view === 'week') && (
  <View style={{ paddingHorizontal: theme.spacing.lg }}>
    <DateRangeNav
      label={rangeLabel}
      onPrev={navigatePrev}
      onNext={navigateNext}
      onToday={navigateToday}
    />
  </View>
)}
```

The month view has its own DateRangeNav inside the FlatList's ListHeaderComponent.

- [ ] **Step 4: Verify Month view**

Run the app. Switch to "Month" in the segmented control. Confirm:
- Month name + year shows with nav arrows
- Calendar grid renders with correct day positions (Mon start)
- Today is highlighted with accent soft background
- Tapping a day highlights it
- Dots appear under days that have tasks
- Below the calendar, day summaries list shows "Aug 17, Sun — 2 tasks >"
- Navigating months updates calendar and summary list
- Empty months show "No tasks this month"

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "^example/"
```

Expected: no errors from our source files.

- [ ] **Step 6: Run tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/month-calendar.tsx src/app/\(tabs\)/upcoming.tsx
git commit -m "feat: Month view with calendar grid and day summaries"
```
