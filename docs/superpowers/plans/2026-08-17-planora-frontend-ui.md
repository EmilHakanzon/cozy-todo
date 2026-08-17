# Planora Frontend UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core frontend UI for Planora — tab navigation with glass-effect bottom bar, Today screen, Lists overview, and List Detail — matching the approved design mockups.

**Architecture:** Expo Router tab navigation with a custom glass TabBar + FAB, Manrope typography, and reusable components (TodoItem, SegmentedControl, ScreenHeader). All state is in existing Zustand stores; screens compose selectors with components. New cross-list selectors bridge the gap between per-list backend and the Today view.

**Tech Stack:** Expo SDK 57, expo-router (Tabs + Stack), expo-glass-effect, expo-symbols (SymbolView), @expo-google-fonts/manrope, Zustand, React Native

**Spec:** Design approved in conversation (6 ChatGPT design images in `assets/images/`)

## Global Constraints

- Expo SDK 57 — read versioned docs at https://docs.expo.dev/versions/v57.0.0/
- Font: Manrope (400 Regular, 500 Medium, 600 SemiBold)
- Spacing: 4px grid via existing `spacing.ts` tokens (micro:4, xs:8, sm:12, md:16, lg:24, xl:32, 2xl:48, 3xl:64)
- Radius: existing `radius.ts` tokens (sm:8, md:12, lg:18, xl:24, full:999)
- Colors: existing `colors.ts` light/dark palettes, `list-color.ts` for list accents
- Path aliases: `@/*` → `./src/*`, `@/assets/*` → `./assets/*`
- Icons: `SymbolView` from `expo-symbols` (SF Symbols on iOS, Material Symbols on Android)
- Glass effect: `GlassView` from `expo-glass-effect` (iOS only; falls back to plain View on Android)
- All new files use the existing `useAppTheme()` hook for theme access
- No `any` types. No comments unless WHY is non-obvious.

---

### Task 1: Typography + Root Layout Foundation

**Files:**
- Create: `src/themes/typography.ts`
- Modify: `src/app/_layout.tsx`
- Modify: `package.json` (install dependency)

**Interfaces:**
- Consumes: `useAppTheme()` from `@/hooks/use-app-theme`, `useListStore` from `@/stores/list-store`, `bootstrapApp()` from `@/lib/bootstrap-app`
- Produces: `typography` object exported from `@/themes/typography` with keys `screenTitle`, `sectionTitle`, `taskTitle`, `body`, `meta` — each a `TextStyle`

- [ ] **Step 1: Install Manrope font**

```bash
npx expo install @expo-google-fonts/manrope
```

- [ ] **Step 2: Create typography tokens**

Create `src/themes/typography.ts`:

```typescript
import { TextStyle } from 'react-native'

export const typography = {
  screenTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 32,
    lineHeight: 38,
  },
  sectionTitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  taskTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
  },
  body: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
} as const satisfies Record<string, TextStyle>
```

- [ ] **Step 3: Update root layout with font loading + SplashScreen**

Replace `src/app/_layout.tsx`:

```tsx
import { useFonts } from 'expo-font'
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
} from '@expo-google-fonts/manrope'
import * as SplashScreen from 'expo-splash-screen'
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import { useEffect } from 'react'

import { useAppTheme } from '@/hooks/use-app-theme'
import { bootstrapApp } from '@/lib/bootstrap-app'
import { useListStore } from '@/stores/list-store'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
  })

  const hasHydrated = useListStore((state) => state.hasHydrated)
  const { resolvedTheme } = useAppTheme()

  useEffect(() => {
    if (!hasHydrated) return
    bootstrapApp()
  }, [hasHydrated])

  useEffect(() => {
    if ((fontsLoaded || fontError) && hasHydrated) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError, hasHydrated])

  if (!fontsLoaded && !fontError) return null

  return (
    <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  )
}
```

- [ ] **Step 4: Verify fonts load**

Run `npx expo start --dev-client` and confirm the app launches without errors. The splash screen should show while fonts load, then dismiss.

- [ ] **Step 5: Commit**

```bash
git add src/themes/typography.ts src/app/_layout.tsx package.json package-lock.json
git commit -m "feat: add Manrope typography tokens and font loading"
```

---

### Task 2: Cross-List Todo Selectors

**Files:**
- Modify: `src/features/todos/selectors.ts`
- Modify: `src/features/todos/selectors.test.ts`

**Interfaces:**
- Consumes: `TodoById`, `Todo`, `TodoListId` from `@/features/todos/types`, `sortByPosition` from `@/features/todos/todo-tree`
- Produces: `getAllRootTodos(todosById)` → `Todo[]`, `getTodayTodos(todos)` → `Todo[]`, `getUpcomingTodos(todos)` → `Todo[]`, `getActiveCountForList(todosById, listId)` → `number`

- [ ] **Step 1: Write tests for new selectors**

Add to `src/features/todos/selectors.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  getAllRootTodos,
  getTodayTodos,
  getUpcomingTodos,
  getActiveCountForList,
} from './selectors'
import type { Todo, TodoById } from './types'

function makeTodo(overrides: Partial<Todo> & { id: string }): Todo {
  return {
    listId: 'list-1',
    parentId: null,
    title: 'Test',
    notes: '',
    dueAt: null,
    completedAt: null,
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('getAllRootTodos', () => {
  it('returns only root todos sorted by position', () => {
    const todosById: TodoById = {
      a: makeTodo({ id: 'a', position: 1 }),
      b: makeTodo({ id: 'b', position: 0 }),
      c: makeTodo({ id: 'c', parentId: 'a', position: 0 }),
    }
    const result = getAllRootTodos(todosById)
    expect(result.map((t) => t.id)).toEqual(['b', 'a'])
  })
})

describe('getTodayTodos', () => {
  it('returns todos due today', () => {
    const today = new Date().toISOString().split('T')[0]
    const todos = [
      makeTodo({ id: 'a', dueAt: `${today}T18:00:00.000Z` }),
      makeTodo({ id: 'b', dueAt: '2099-12-31T00:00:00.000Z' }),
      makeTodo({ id: 'c', dueAt: null }),
    ]
    const result = getTodayTodos(todos)
    expect(result.map((t) => t.id)).toEqual(['a'])
  })
})

describe('getUpcomingTodos', () => {
  it('returns todos due after today', () => {
    const today = new Date().toISOString().split('T')[0]
    const todos = [
      makeTodo({ id: 'a', dueAt: `${today}T18:00:00.000Z` }),
      makeTodo({ id: 'b', dueAt: '2099-12-31T00:00:00.000Z' }),
      makeTodo({ id: 'c', dueAt: null }),
    ]
    const result = getUpcomingTodos(todos)
    expect(result.map((t) => t.id)).toEqual(['b'])
  })
})

describe('getActiveCountForList', () => {
  it('counts only active root todos in a list', () => {
    const todosById: TodoById = {
      a: makeTodo({ id: 'a', listId: 'list-1' }),
      b: makeTodo({ id: 'b', listId: 'list-1', completedAt: '2026-01-01T00:00:00.000Z' }),
      c: makeTodo({ id: 'c', listId: 'list-1', parentId: 'a' }),
      d: makeTodo({ id: 'd', listId: 'list-2' }),
    }
    expect(getActiveCountForList(todosById, 'list-1')).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/features/todos/selectors.test.ts
```

Expected: failures for undefined functions.

- [ ] **Step 3: Implement the selectors**

Add to `src/features/todos/selectors.ts`:

```typescript
export function getAllRootTodos(todosById: TodoById): Todo[] {
  return sortByPosition(
    Object.values(todosById).filter((todo) => todo.parentId === null)
  )
}

export function getTodayTodos(todos: Todo[]): Todo[] {
  const today = new Date().toISOString().split('T')[0]
  return todos.filter((todo) => todo.dueAt?.startsWith(today))
}

export function getUpcomingTodos(todos: Todo[]): Todo[] {
  const todayStr = new Date().toISOString().split('T')[0]
  return todos.filter((todo) => {
    if (!todo.dueAt) return false
    return todo.dueAt.split('T')[0] > todayStr
  })
}

export function getActiveCountForList(
  todosById: TodoById,
  listId: TodoListId,
): number {
  return Object.values(todosById).filter(
    (todo) =>
      todo.listId === listId &&
      todo.parentId === null &&
      todo.completedAt === null,
  ).length
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/features/todos/selectors.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/todos/selectors.ts src/features/todos/selectors.test.ts
git commit -m "feat: add cross-list todo selectors for Today screen"
```

---

### Task 3: Tab Navigation + Custom Glass TabBar

**Files:**
- Create: `src/app/(tabs)/_layout.tsx`
- Create: `src/app/(tabs)/index.tsx` (temporary placeholder)
- Create: `src/app/(tabs)/upcoming.tsx` (placeholder)
- Create: `src/app/(tabs)/lists/_layout.tsx`
- Create: `src/app/(tabs)/lists/index.tsx` (temporary placeholder)
- Create: `src/app/(tabs)/lists/[listId].tsx` (temporary placeholder)
- Create: `src/components/tab-bar.tsx`
- Create: `src/stores/quick-add-store.ts`
- Delete: `src/app/index.tsx`
- Delete: `src/app/list/index.tsx`
- Delete: `src/app/list/[listId].tsx`
- Delete: `src/screen/list-screen.tsx`

**Interfaces:**
- Consumes: `useAppTheme()`, `GlassView` from `expo-glass-effect`, `SymbolView` from `expo-symbols`, `useSafeAreaInsets` from `react-native-safe-area-context`, `typography` from `@/themes/typography`
- Produces: `TabBar` component (receives `BottomTabBarProps`), `useQuickAddStore` with `isOpen`, `open()`, `close()`, tab navigation routing for Today/Upcoming/Lists

- [ ] **Step 1: Create quick-add store**

Create `src/stores/quick-add-store.ts`:

```typescript
import { create } from 'zustand'

type QuickAddState = {
  isOpen: boolean
  defaultListId: string | null
  open: (listId?: string) => void
  close: () => void
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  isOpen: false,
  defaultListId: null,
  open: (listId) => set({ isOpen: true, defaultListId: listId ?? null }),
  close: () => set({ isOpen: false, defaultListId: null }),
}))
```

- [ ] **Step 2: Build the custom TabBar component**

Create `src/components/tab-bar.tsx`:

```tsx
import { GlassView } from 'expo-glass-effect'
import { SymbolView } from 'expo-symbols'
import { Pressable, Text, View, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useQuickAddStore } from '@/stores/quick-add-store'
import { typography } from '@/themes/typography'

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'

const TAB_CONFIG: Record<string, {
  label: string
  icon: { ios: string; android: string; web: string }
}> = {
  index: {
    label: 'Today',
    icon: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  },
  upcoming: {
    label: 'Upcoming',
    icon: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  },
  lists: {
    label: 'Lists',
    icon: { ios: 'square.stack.3d.up', android: 'stacks', web: 'stacks' },
  },
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const openQuickAdd = useQuickAddStore((s) => s.open)

  const Wrapper = Platform.OS === 'ios' ? GlassView : View
  const wrapperProps = Platform.OS === 'ios'
    ? { glassEffectStyle: 'regular' as const, colorScheme: resolvedTheme as 'light' | 'dark' }
    : {}

  return (
    <View
      style={{
        position: 'absolute',
        bottom: insets.bottom + theme.spacing.xs,
        left: theme.spacing.md,
        right: theme.spacing.md,
      }}
    >
      <Wrapper
        {...wrapperProps}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.xl,
          ...(Platform.OS !== 'ios' && {
            backgroundColor: resolvedTheme === 'dark'
              ? 'rgba(33, 35, 31, 0.92)'
              : 'rgba(252, 251, 248, 0.92)',
            borderWidth: 1,
            borderColor: theme.color.border,
          }),
        }}
      >
        {state.routes.map((route, index) => {
          const config = TAB_CONFIG[route.name]
          if (!config) return null

          const isFocused = state.index === index

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params)
            }
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={config.label}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: theme.spacing.micro,
                gap: theme.spacing.micro,
              }}
            >
              <SymbolView
                name={config.icon as any}
                size={22}
                tintColor={isFocused ? theme.color.accent : theme.color.text2}
              />
              <Text
                style={{
                  ...typography.meta,
                  fontSize: 11,
                  color: isFocused ? theme.color.accent : theme.color.text2,
                }}
              >
                {config.label}
              </Text>
            </Pressable>
          )
        })}

        <Pressable
          onPress={() => openQuickAdd()}
          accessibilityRole="button"
          accessibilityLabel="Add task"
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: theme.radius.full,
            backgroundColor: theme.color.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: theme.spacing.xs,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <SymbolView
            name={{ ios: 'plus', android: 'add', web: 'add' } as any}
            size={24}
            tintColor="#ffffff"
          />
        </Pressable>
      </Wrapper>
    </View>
  )
}
```

- [ ] **Step 3: Delete old route files**

Remove these files:
- `src/app/index.tsx`
- `src/app/list/index.tsx`
- `src/app/list/[listId].tsx`
- `src/screen/list-screen.tsx`

- [ ] **Step 4: Create (tabs) layout**

Create `src/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router'

import { TabBar } from '@/components/tab-bar'

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="upcoming" options={{ title: 'Upcoming' }} />
      <Tabs.Screen name="lists" options={{ title: 'Lists' }} />
    </Tabs>
  )
}
```

- [ ] **Step 5: Create placeholder tab screens**

Create `src/app/(tabs)/index.tsx`:

```tsx
import { Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

export default function TodayScreen() {
  const { theme } = useAppTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background, padding: theme.spacing.lg }}>
      <Text style={{ ...typography.screenTitle, color: theme.color.text }}>Today</Text>
    </View>
  )
}
```

Create `src/app/(tabs)/upcoming.tsx`:

```tsx
import { Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

export default function UpcomingScreen() {
  const { theme } = useAppTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background, padding: theme.spacing.lg }}>
      <Text style={{ ...typography.screenTitle, color: theme.color.text }}>Upcoming</Text>
      <Text style={{ ...typography.meta, color: theme.color.text2, marginTop: theme.spacing.xs }}>
        Coming soon
      </Text>
    </View>
  )
}
```

Create `src/app/(tabs)/lists/_layout.tsx`:

```tsx
import { Stack } from 'expo-router'

export default function ListsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

Create `src/app/(tabs)/lists/index.tsx`:

```tsx
import { Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

export default function ListsScreen() {
  const { theme } = useAppTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background, padding: theme.spacing.lg }}>
      <Text style={{ ...typography.screenTitle, color: theme.color.text }}>Lists</Text>
    </View>
  )
}
```

Create `src/app/(tabs)/lists/[listId].tsx`:

```tsx
import { Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>()
  const { theme } = useAppTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background, padding: theme.spacing.lg }}>
      <Text style={{ ...typography.screenTitle, color: theme.color.text }}>List Detail</Text>
    </View>
  )
}
```

- [ ] **Step 6: Verify tab navigation works**

Run the app. Confirm:
- Three tabs appear with correct icons and labels
- Tab switching works
- Green FAB is visible on the right
- Glass effect on iOS (semi-transparent background on Android)
- Manrope font renders in tab labels

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: tab navigation with custom glass tab bar and FAB"
```

---

### Task 4: Core UI Components

**Files:**
- Create: `src/components/screen-header.tsx`
- Create: `src/components/segmented-control.tsx`
- Create: `src/components/todo-checkbox.tsx`
- Create: `src/components/todo-item.tsx`
- Create: `src/components/quick-add.tsx`

**Interfaces:**
- Consumes: `useAppTheme()`, `typography`, `spacing`, `radius`, `Todo` type, `useQuickAddStore`, `useTodoStore`, `useListStore`, `listColorsFor()`
- Produces:
  - `ScreenHeader`: `({ title: string, subtitle?: string, rightAction?: ReactNode }) => JSX.Element`
  - `SegmentedControl<T>`: `({ segments: { key: T, label: string }[], value: T, onChange: (key: T) => void }) => JSX.Element`
  - `TodoCheckbox`: `({ checked: boolean, onToggle: () => void }) => JSX.Element`
  - `TodoItem`: `({ todo: Todo, onToggle: (id: TodoId) => void, showListName?: boolean }) => JSX.Element`
  - `QuickAdd`: `({ listId: string, placeholder?: string }) => JSX.Element`

- [ ] **Step 1: Build ScreenHeader**

Create `src/components/screen-header.tsx`:

```tsx
import { type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

type ScreenHeaderProps = {
  title: string
  subtitle?: string
  rightAction?: ReactNode
}

export function ScreenHeader({ title, subtitle, rightAction }: ScreenHeaderProps) {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        paddingTop: insets.top + theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        backgroundColor: theme.color.background,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ ...typography.screenTitle, color: theme.color.text }}>{title}</Text>
        {rightAction}
      </View>
      {subtitle ? (
        <Text style={{ ...typography.meta, color: theme.color.text2, marginTop: theme.spacing.micro }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}
```

- [ ] **Step 2: Build SegmentedControl**

Create `src/components/segmented-control.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

type Segment<T extends string> = {
  key: T
  label: string
}

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[]
  value: T
  onChange: (key: T) => void
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.color.surfaceSoft,
        borderRadius: theme.radius.full,
        padding: theme.spacing.micro,
      }}
    >
      {segments.map((segment) => {
        const isActive = segment.key === value
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={{
              flex: 1,
              paddingVertical: theme.spacing.xs,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: theme.radius.full,
              alignItems: 'center',
              backgroundColor: isActive ? theme.color.accent : 'transparent',
            }}
          >
            <Text
              style={{
                ...typography.meta,
                fontFamily: 'Manrope_500Medium',
                color: isActive ? '#ffffff' : theme.color.text2,
              }}
            >
              {segment.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
```

- [ ] **Step 3: Build TodoCheckbox**

Create `src/components/todo-checkbox.tsx`:

```tsx
import { Pressable, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'

type TodoCheckboxProps = {
  checked: boolean
  onToggle: () => void
}

const SIZE = 24
const BORDER_WIDTH = 2

export function TodoCheckbox({ checked, onToggle }: TodoCheckboxProps) {
  const { theme } = useAppTheme()

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {checked ? (
        <View
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: theme.color.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' } as any}
            size={14}
            tintColor="#ffffff"
          />
        </View>
      ) : (
        <View
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: BORDER_WIDTH,
            borderColor: theme.color.border,
            backgroundColor: 'transparent',
          }}
        />
      )}
    </Pressable>
  )
}
```

- [ ] **Step 4: Build TodoItem**

Create `src/components/todo-item.tsx`:

```tsx
import { Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'
import { TodoCheckbox } from './todo-checkbox'
import { getTodoProgress } from '@/features/todos/selectors'
import { useTodoStore } from '@/stores/todo-store'
import { getChildren } from '@/features/todos/todo-tree'

import type { Todo, TodoId } from '@/features/todos/types'

type TodoItemProps = {
  todo: Todo
  onToggle: (id: TodoId) => void
  showListName?: boolean
}

export function TodoItem({ todo, onToggle, showListName = false }: TodoItemProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const list = useListStore((s) => s.listsById[todo.listId])
  const todosById = useTodoStore((s) => s.todosById)
  const children = getChildren(todosById, todo.id)
  const isCompleted = todo.completedAt !== null
  const hasChildren = children.length > 0

  const listColors = listColorsFor(resolvedTheme)
  const listColor = list ? listColors[list.color] : null

  const metaParts: string[] = []
  if (showListName && list) metaParts.push(list.name)
  if (todo.dueAt) {
    const date = new Date(todo.dueAt)
    const today = new Date()
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    metaParts.push(isToday ? `Today · ${timeStr}` : date.toLocaleDateString())
  }
  if (hasChildren) {
    const progress = getTodoProgress(todosById, todo.id)
    metaParts.push(`${progress.completed} of ${progress.total}`)
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: theme.spacing.sm,
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
        {metaParts.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.micro, marginTop: 2 }}>
            {showListName && listColor && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: listColor.accent,
                }}
              />
            )}
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              {metaParts.join(' · ')}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}
```

- [ ] **Step 5: Build QuickAdd**

Create `src/components/quick-add.tsx`:

```tsx
import { useState } from 'react'
import { Pressable, Text, TextInput, View, Modal, KeyboardAvoidingView, Platform } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { useQuickAddStore } from '@/stores/quick-add-store'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

export function QuickAddModal() {
  const { theme } = useAppTheme()
  const { isOpen, defaultListId, close } = useQuickAddStore()
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
    createTodo({ listId, title: trimmed })
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
}

export function InlineQuickAdd({ listId }: InlineQuickAddProps) {
  const { theme } = useAppTheme()
  const open = useQuickAddStore((s) => s.open)

  return (
    <Pressable
      onPress={() => open(listId)}
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
```

- [ ] **Step 6: Wire QuickAddModal into root layout**

Add the modal to `src/app/_layout.tsx` — import `QuickAddModal` from `@/components/quick-add` and render it alongside `<Stack>`:

```tsx
// Add import at top:
import { QuickAddModal } from '@/components/quick-add'

// In the return, wrap Stack + QuickAddModal in a fragment:
return (
  <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
    <Stack screenOptions={{ headerShown: false }} />
    <QuickAddModal />
  </ThemeProvider>
)
```

- [ ] **Step 7: Verify components render**

Run the app. Press the FAB — the QuickAdd modal should appear with keyboard. Type a task title and press Add — it should create a todo and dismiss.

- [ ] **Step 8: Commit**

```bash
git add src/components/screen-header.tsx src/components/segmented-control.tsx \
  src/components/todo-checkbox.tsx src/components/todo-item.tsx src/components/quick-add.tsx \
  src/app/_layout.tsx
git commit -m "feat: core UI components — ScreenHeader, SegmentedControl, TodoItem, QuickAdd"
```

---

### Task 5: Today Screen

**Files:**
- Modify: `src/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `ScreenHeader`, `SegmentedControl`, `TodoItem`, `InlineQuickAdd`, `useTodoStore`, selectors `getAllRootTodos`, `getTodayTodos`, `getUpcomingTodos`, `getActiveTodos`, `getCompletedTodos`
- Produces: Full Today screen with date header, segmented filter (My Day / Upcoming / All), todo list

- [ ] **Step 1: Implement Today screen**

Replace `src/app/(tabs)/index.tsx`:

```tsx
import { useState, useMemo } from 'react'
import { FlatList, Text, View } from 'react-native'

import { InlineQuickAdd } from '@/components/quick-add'
import { ScreenHeader } from '@/components/screen-header'
import { SegmentedControl } from '@/components/segmented-control'
import { TodoItem } from '@/components/todo-item'
import {
  getAllRootTodos,
  getActiveTodos,
  getCompletedTodos,
  getTodayTodos,
  getUpcomingTodos,
} from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

type Filter = 'today' | 'upcoming' | 'all'

const SEGMENTS = [
  { key: 'today' as const, label: 'My Day' },
  { key: 'upcoming' as const, label: 'Upcoming' },
  { key: 'all' as const, label: 'All' },
]

export default function TodayScreen() {
  const { theme } = useAppTheme()
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const [filter, setFilter] = useState<Filter>('today')

  const allRootTodos = useMemo(() => getAllRootTodos(todosById), [todosById])

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'today':
        return getTodayTodos(allRootTodos)
      case 'upcoming':
        return getUpcomingTodos(allRootTodos)
      case 'all':
        return allRootTodos
    }
  }, [filter, allRootTodos])

  const activeTodos = useMemo(() => getActiveTodos(filteredTodos), [filteredTodos])
  const completedTodos = useMemo(() => getCompletedTodos(filteredTodos), [filteredTodos])

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const sections = [
    ...(activeTodos.length > 0
      ? [{ type: 'header' as const, label: filter === 'today' ? 'MY DAY' : filter === 'upcoming' ? 'UPCOMING' : 'ALL TASKS', count: `${completedTodos.length} / ${filteredTodos.length}` }]
      : []),
    ...activeTodos.map((todo) => ({ type: 'todo' as const, todo })),
    ...(completedTodos.length > 0
      ? [{ type: 'header' as const, label: 'COMPLETED', count: String(completedTodos.length) }]
      : []),
    ...completedTodos.map((todo) => ({ type: 'todo' as const, todo })),
  ]

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <ScreenHeader title="Today" subtitle={dateStr} />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
        <SegmentedControl segments={SEGMENTS} value={filter} onChange={setFilter} />
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item, index) => (item.type === 'todo' ? item.todo.id : `header-${index}`)}
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
                  paddingTop: theme.spacing.lg,
                  paddingBottom: theme.spacing.xs,
                }}
              >
                <Text style={{ ...typography.sectionTitle, color: theme.color.text2 }}>
                  {item.label}
                </Text>
                <Text style={{ ...typography.meta, color: theme.color.text2 }}>{item.count}</Text>
              </View>
            )
          }
          return <TodoItem todo={item.todo} onToggle={toggleTodo} showListName />
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>
              {filter === 'today' ? 'No tasks for today' : filter === 'upcoming' ? 'No upcoming tasks' : 'No tasks yet'}
            </Text>
          </View>
        }
        ListFooterComponent={<InlineQuickAdd />}
      />
    </View>
  )
}
```

- [ ] **Step 2: Verify Today screen**

Run the app. Confirm:
- Header shows "Today" + today's date
- Segmented control switches between My Day / Upcoming / All
- Todos appear with checkboxes (toggle works)
- List names and dates show in meta
- Empty states display correctly
- "+ Add task" inline button opens QuickAdd modal
- Bottom padding avoids TabBar overlap

- [ ] **Step 3: Commit**

```bash
git add src/app/\(tabs\)/index.tsx
git commit -m "feat: Today screen with filters, task list, and empty states"
```

---

### Task 6: Lists Overview Screen

**Files:**
- Create: `src/components/list-card.tsx`
- Modify: `src/app/(tabs)/lists/index.tsx`

**Interfaces:**
- Consumes: `ScreenHeader`, `useListStore`, `useTodoStore`, `getTodoCountForList`, `getActiveCountForList`, `listColorsFor()`, `typography`, `CreateListSheet`
- Produces: `ListCard` component: `({ list: TodoList, todoCount: number, activeCount: number, onPress: () => void }) => JSX.Element`

- [ ] **Step 1: Build ListCard component**

Create `src/components/list-card.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { TodoList } from '@/features/lists/types'

type ListCardProps = {
  list: TodoList
  todoCount: number
  activeCount: number
  onPress: () => void
}

const ICON_SIZE = 40

export function ListCard({ list, todoCount, activeCount, onPress }: ListCardProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const listColors = listColorsFor(resolvedTheme)
  const palette = listColors[list.color]

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
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
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: theme.radius.md,
          backgroundColor: palette.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SymbolView
          name={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' } as any}
          size={20}
          tintColor={palette.accent}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.taskTitle, color: theme.color.text }}>{list.name}</Text>
        <Text style={{ ...typography.meta, color: theme.color.text2 }}>
          {todoCount} {todoCount === 1 ? 'task' : 'tasks'}
        </Text>
      </View>

      {activeCount > 0 && (
        <View
          style={{
            minWidth: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: palette.accent,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 6,
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: '#ffffff' }}>
            {activeCount}
          </Text>
        </View>
      )}
    </Pressable>
  )
}
```

- [ ] **Step 2: Implement Lists overview screen**

Replace `src/app/(tabs)/lists/index.tsx`:

```tsx
import { useState, useMemo } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'

import { ListCard } from '@/components/list-card'
import { CreateListSheet } from '@/components/create.list-sheet'
import { ScreenHeader } from '@/components/screen-header'
import { getTodoCountForList, getActiveCountForList } from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

export default function ListsScreen() {
  const { theme } = useAppTheme()
  const lists = useListStore((s) => Object.values(s.listsById))
  const todosById = useTodoStore((s) => s.todosById)
  const [showCreateSheet, setShowCreateSheet] = useState(false)

  const totalTasks = useMemo(
    () => lists.reduce((sum, list) => sum + getTodoCountForList(todosById, list.id), 0),
    [lists, todosById],
  )

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <ScreenHeader
        title="Lists"
        subtitle={`${lists.length} ${lists.length === 1 ? 'list' : 'lists'} · ${totalTasks} tasks`}
      />

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: 120,
        }}
        renderItem={({ item }) => (
          <ListCard
            list={item}
            todoCount={getTodoCountForList(todosById, item.id)}
            activeCount={getActiveCountForList(todosById, item.id)}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/lists/[listId]',
                params: { listId: item.id },
              })
            }
          />
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: theme.color.border }} />
        )}
        ListFooterComponent={
          <Pressable
            onPress={() => setShowCreateSheet(true)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: theme.spacing.md,
              gap: theme.spacing.xs,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ ...typography.body, color: theme.color.text2 }}>+ Create new list</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>No lists yet</Text>
          </View>
        }
      />

      <CreateListSheet visible={showCreateSheet} onClose={() => setShowCreateSheet(false)} />
    </View>
  )
}
```

- [ ] **Step 3: Verify Lists screen**

Run the app. Navigate to Lists tab. Confirm:
- Header shows "Lists" with list/task counts
- Default "Personal" list appears with colored icon and badge
- Tapping a list navigates to detail (placeholder for now)
- "+ Create new list" opens the CreateListSheet
- Creating a list adds it to the FlatList

- [ ] **Step 4: Commit**

```bash
git add src/components/list-card.tsx src/app/\(tabs\)/lists/index.tsx
git commit -m "feat: Lists overview with ListCard and create-list integration"
```

---

### Task 7: List Detail Screen

**Files:**
- Modify: `src/app/(tabs)/lists/[listId].tsx`

**Interfaces:**
- Consumes: `ScreenHeader`, `SegmentedControl`, `TodoItem`, `InlineQuickAdd`, `useListStore`, `useTodoStore`, `getRootTodos`, `getActiveTodos`, `getCompletedTodos`, `listColorsFor()`, `router` from `expo-router`
- Produces: Full list detail screen with back navigation, filter tabs, task list

- [ ] **Step 1: Implement List Detail screen**

Replace `src/app/(tabs)/lists/[listId].tsx`:

```tsx
import { useState, useMemo } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SymbolView } from 'expo-symbols'

import { InlineQuickAdd } from '@/components/quick-add'
import { SegmentedControl } from '@/components/segmented-control'
import { TodoItem } from '@/components/todo-item'
import { getActiveTodos, getCompletedTodos, getRootTodos } from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { useTodoStore } from '@/stores/todo-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

type ListFilter = 'all' | 'active' | 'completed'

const SEGMENTS = [
  { key: 'all' as const, label: 'All' },
  { key: 'active' as const, label: 'Active' },
  { key: 'completed' as const, label: 'Completed' },
]

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>()
  const { theme, resolvedTheme } = useAppTheme()
  const list = useListStore((s) => s.listsById[listId])
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const [filter, setFilter] = useState<ListFilter>('all')

  const rootTodos = useMemo(() => getRootTodos(todosById, listId), [todosById, listId])
  const activeTodos = useMemo(() => getActiveTodos(rootTodos), [rootTodos])
  const completedTodos = useMemo(() => getCompletedTodos(rootTodos), [rootTodos])

  const displayedTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return activeTodos
      case 'completed':
        return completedTodos
      case 'all':
        return rootTodos
    }
  }, [filter, rootTodos, activeTodos, completedTodos])

  if (!list) return null

  const listColors = listColorsFor(resolvedTheme)
  const palette = listColors[list.color]

  const sections = (() => {
    if (filter !== 'all') {
      return displayedTodos.map((todo) => ({ type: 'todo' as const, todo }))
    }
    return [
      ...(activeTodos.length > 0
        ? [{ type: 'header' as const, label: `ACTIVE (${activeTodos.length})` }]
        : []),
      ...activeTodos.map((todo) => ({ type: 'todo' as const, todo })),
      ...(completedTodos.length > 0
        ? [{ type: 'header' as const, label: `COMPLETED (${completedTodos.length})` }]
        : []),
      ...completedTodos.map((todo) => ({ type: 'todo' as const, todo })),
    ]
  })()

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <View style={{ paddingTop: theme.spacing['2xl'], paddingBottom: theme.spacing.md }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.micro, marginBottom: theme.spacing.md }}
          >
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any}
              size={18}
              tintColor={theme.color.text2}
            />
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>Lists</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: theme.radius.md,
                backgroundColor: palette.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SymbolView
                name={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' } as any}
                size={18}
                tintColor={palette.accent}
              />
            </View>
            <View>
              <Text style={{ ...typography.screenTitle, fontSize: 24, color: theme.color.text }}>
                {list.name}
              </Text>
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                {rootTodos.length} {rootTodos.length === 1 ? 'task' : 'tasks'}
              </Text>
            </View>
          </View>
        </View>

        <SegmentedControl segments={SEGMENTS} value={filter} onChange={setFilter} />
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item, index) => (item.type === 'todo' ? item.todo.id : `header-${index}`)}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: 120,
        }}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <Text
                style={{
                  ...typography.sectionTitle,
                  color: theme.color.text2,
                  paddingTop: theme.spacing.lg,
                  paddingBottom: theme.spacing.xs,
                }}
              >
                {item.label}
              </Text>
            )
          }
          return <TodoItem todo={item.todo} onToggle={toggleTodo} />
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>
              {filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
            </Text>
          </View>
        }
        ListFooterComponent={
          filter !== 'completed' ? <InlineQuickAdd listId={listId} /> : null
        }
      />
    </View>
  )
}
```

- [ ] **Step 2: Verify List Detail screen**

Run the app. Navigate to Lists tab, tap a list. Confirm:
- Back button returns to Lists overview
- List icon and name display with correct color
- Segmented control filters between All / Active / Completed
- Todos toggle correctly (move between active/completed sections)
- "+ Add task" creates a todo in this specific list
- Empty states show for each filter

- [ ] **Step 3: Full integration test**

Walk through the golden path:
1. App launches → Today screen, empty state shows "No tasks for today"
2. Tap FAB → QuickAdd appears → type "Buy groceries" → tap Add
3. Switch to "All" filter → task appears
4. Tap checkbox → task moves to COMPLETED section
5. Switch to Lists tab → "Personal" list shows 1 task, 0 active badge
6. Tap "Personal" → List Detail shows the completed task
7. Tap "+ Create new list" → create "Work" list
8. Navigate back, switch to Today, tap FAB → add another task
9. Switch filters, verify counts update

- [ ] **Step 4: Commit**

```bash
git add src/app/\(tabs\)/lists/\[listId\].tsx
git commit -m "feat: List Detail screen with filters and task management"
```

---

### Cleanup: Delete stale files

After all tasks are complete, verify and clean up any stale files that were replaced:

- [ ] Delete `src/app/list/` directory if it still exists
- [ ] Delete `src/screen/list-screen.tsx` if it still exists
- [ ] Delete `src/components/list-item.tsx` (empty, replaced by `list-card.tsx`)
- [ ] Delete `src/components/create-list.tsx` (empty, unused)
- [ ] Delete `src/features/setting/index.tsx` only if it's empty (keep for future Settings screen)

```bash
git add -A
git commit -m "chore: remove stale placeholder files"
```
