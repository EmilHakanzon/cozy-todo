# Accent Color, Subtask Connectors, Task Reminders & GCal Placeholder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accent color personalization, visual subtask connector lines, local push notifications for task reminders, and a Google Calendar "coming soon" placeholder.

**Architecture:** The accent color flows through the existing theme system — `settings-store` holds the choice, `use-app-theme` resolves the accent pair from the list color palette, and every component already reading `theme.color.accent` gets it for free. Subtask connectors are a pure visual wrapper component. Task reminders use `expo-notifications` with fire-and-forget side effects in the todo store. The GCal placeholder is a single informational screen.

**Tech Stack:** Expo SDK 57, expo-router, expo-symbols, expo-notifications, Zustand, React Native

**Spec:** `docs/superpowers/specs/2026-08-17-accent-connectors-reminders-gcal-design.md`

## Global Constraints

- Expo SDK 57 — read versioned docs at https://docs.expo.dev/versions/v57.0.0/
- Font: Manrope (400 Regular, 500 Medium, 600 SemiBold)
- Spacing: 4px grid via existing `spacing.ts` tokens
- Radius: existing `radius.ts` tokens
- Colors: existing `colors.ts` light/dark palettes, `list-color.ts` for list accents
- Path aliases: `@/*` → `./src/*`
- Icons: `SymbolView` from `expo-symbols` with `SymbolViewProps['name']` type
- No `any` types. No comments unless WHY is non-obvious.
- Stores use Zustand with AsyncStorage persistence
- Tests use vitest — run with `npx vitest run`
- TypeScript check: `npx tsc --noEmit` (filter out `example/` errors)
- Git commits use PowerShell (paths with parentheses break in Bash)

---

### Task 1: Accent Color — Theme System

**Files:**
- Modify: `src/stores/settings-store.ts`
- Modify: `src/themes/list-color.ts`
- Modify: `src/themes/theme.ts`
- Modify: `src/hooks/use-app-theme.ts`

**Interfaces:**
- Consumes: `TodoListColor` from `@/features/lists/types`, `lightListColors`/`darkListColors` from `@/themes/list-color`, `lightColors`/`darkColors` from `@/themes/colors`
- Produces: `accentColor` setting in `useSettingsStore`, `buildAccentColors(color, mode)` in `list-color.ts`, `buildTheme(resolvedTheme, accentColor)` in `theme.ts`, updated `useAppTheme()` that reads accent from settings

- [ ] **Step 1: Add `accentColor` to settings store**

In `src/stores/settings-store.ts`, add the import and new state:

```typescript
import type { TodoListColor } from '@/features/lists/types'
```

Add to the `SettingsState` type:

```typescript
accentColor: TodoListColor
setAccentColor: (value: TodoListColor) => void
```

Add to the store defaults:

```typescript
accentColor: 'sage',
setAccentColor: (value) => set({ accentColor: value }),
```

Add `accentColor` to the `partialize` object.

- [ ] **Step 2: Add `buildAccentColors` to list-color.ts**

In `src/themes/list-color.ts`, add the builder function after the existing `listColorsFor` function. This lives here (not in `colors.ts`) to avoid a circular import — `list-color.ts` already has the palette data:

```typescript
export function buildAccentColors(color: TodoListColor, mode: 'light' | 'dark') {
  const palette = mode === 'dark' ? darkListColors : lightListColors
  return {
    accent: palette[color].accent,
    accentSoft: palette[color].background,
  }
}
```

- [ ] **Step 3: Parameterize theme construction**

In `src/themes/theme.ts`, replace the static theme constants with a builder:

```typescript
import { lightColors, darkColors } from './colors'
import { buildAccentColors } from './list-color'
import { radius } from './radius'
import { spacing } from './spacing'

import type { TodoListColor } from '@/features/lists/types'

export type ResolvedTheme = 'light' | 'dark'

export function buildTheme(resolvedTheme: ResolvedTheme, accentColor: TodoListColor) {
  const baseColors = resolvedTheme === 'dark' ? darkColors : lightColors
  const accentPair = buildAccentColors(accentColor, resolvedTheme)

  return {
    color: {
      ...baseColors,
      accent: accentPair.accent,
      accentSoft: accentPair.accentSoft,
    },
    spacing,
    radius,
  } as const
}

export const lightTheme = buildTheme('light', 'sage')
export const darkTheme = buildTheme('dark', 'sage')
```

Keep `lightTheme`/`darkTheme` as exports so existing imports don't break — but they become the default-sage versions (used only in non-hook contexts if any).

- [ ] **Step 4: Update `useAppTheme` to use accent color**

In `src/hooks/use-app-theme.ts`:

```typescript
import { useSettingsStore } from '@/stores/settings-store'
import { useThemeStore } from '@/stores/theme-store'
import { buildTheme } from '@/themes/theme'
import { useColorScheme } from 'react-native'

import type { ResolvedTheme } from '@/themes/theme'

export function useAppTheme() {
  const systemColorScheme = useColorScheme()
  const preference = useThemeStore((state) => state.preference)
  const accentColor = useSettingsStore((state) => state.accentColor)

  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : preference

  const theme = buildTheme(resolvedTheme, accentColor)

  return {
    theme,
    resolvedTheme,
    preference,
  }
}
```

- [ ] **Step 5: Run TypeScript check and tests**

```
npx tsc --noEmit 2>&1 | Select-String -NotMatch "^example/"
npx vitest run
```

Expected: no new errors, all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/stores/settings-store.ts src/themes/list-color.ts src/themes/theme.ts src/hooks/use-app-theme.ts
git commit -m "feat: parameterize theme accent color from settings"
```

---

### Task 2: Accent Color — Picker Screen

**Files:**
- Create: `src/app/settings/accent-color.tsx`
- Modify: `src/app/settings/index.tsx`

**Interfaces:**
- Consumes: `useSettingsStore` (`accentColor`, `setAccentColor`), `useAppTheme()`, `TODO_LIST_COLORS` from `@/features/lists/types`, `listColorsFor` from `@/themes/list-color`, `typography`
- Produces: Settings screen where users tap a color circle to change the app accent

- [ ] **Step 1: Create the accent color picker screen**

Create `src/app/settings/accent-color.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { TODO_LIST_COLORS } from '@/features/lists/types'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useSettingsStore } from '@/stores/settings-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { TodoListColor } from '@/features/lists/types'
import type { SymbolViewProps } from 'expo-symbols'

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
}

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
}

const COLOR_LABELS: Record<TodoListColor, string> = {
  sage: 'Sage',
  terracotta: 'Terracotta',
  ochre: 'Ochre',
  dustyBlue: 'Dusty Blue',
  lavender: 'Lavender',
  taupe: 'Taupe',
}

export default function AccentColorScreen() {
  const { theme, resolvedTheme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const accentColor = useSettingsStore((s) => s.accentColor)
  const setAccentColor = useSettingsStore((s) => s.setAccentColor)
  const listColors = listColorsFor(resolvedTheme)

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <View
        style={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <SymbolView name={BACK_ICON} size={20} tintColor={theme.color.text2} />
        </Pressable>
        <Text style={{ ...typography.screenTitle, fontSize: 24, flex: 1, color: theme.color.text }}>
          Accent color
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.md,
          paddingTop: theme.spacing.md,
        }}
      >
        {TODO_LIST_COLORS.map((color) => {
          const palette = listColors[color]
          const isActive = accentColor === color

          return (
            <Pressable
              key={color}
              onPress={() => setAccentColor(color)}
              style={({ pressed }) => ({
                alignItems: 'center',
                gap: theme.spacing.xs,
                opacity: pressed ? 0.6 : 1,
                width: 72,
              })}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: palette.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isActive ? 3 : 0,
                  borderColor: theme.color.text,
                }}
              >
                {isActive && (
                  <SymbolView name={CHECK_ICON} size={20} tintColor="#ffffff" />
                )}
              </View>
              <Text
                style={{
                  ...typography.meta,
                  color: isActive ? theme.color.text : theme.color.text2,
                  textAlign: 'center',
                }}
              >
                {COLOR_LABELS[color]}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Enable accent color row in settings index**

In `src/app/settings/index.tsx`, update the accent color `SettingsRow`:

Replace:
```tsx
<SettingsRow
  icon={ICONS.accentColor}
  label="Accent color"
  disabled
/>
```

With:
```tsx
<SettingsRow
  icon={ICONS.accentColor}
  label="Accent color"
  onPress={() => router.push('/settings/accent-color')}
/>
```

Note: The `SettingsRow` component doesn't support a color swatch as `value` — using the chevron navigation indicator is sufficient. The current accent color is visible throughout the UI.

- [ ] **Step 3: Run TypeScript check**

```
npx tsc --noEmit 2>&1 | Select-String -NotMatch "^example/"
```

Expected: no new errors.

- [ ] **Step 4: Test manually**

Run the app. Go to Settings → Accent color. Confirm:
- 2x3 grid of color circles with labels
- Current accent (sage) has checkmark + border
- Tapping a different color immediately changes the accent throughout the app (checkboxes, active tab, badges)
- Setting persists after app restart

- [ ] **Step 5: Commit**

```powershell
git add "src/app/settings/accent-color.tsx" "src/app/settings/index.tsx"
git commit -m "feat: accent color picker in settings"
```

---

### Task 3: Subtask Connector Lines

**Files:**
- Create: `src/components/subtask-group.tsx`
- Modify: `src/app/todo/[todoId].tsx`

**Interfaces:**
- Consumes: `useAppTheme()`, `theme.color.border`, `theme.spacing`
- Produces: `SubtaskGroup` component that wraps subtask items with visual connector lines

- [ ] **Step 1: Create the SubtaskGroup component**

Create `src/components/subtask-group.tsx`:

```tsx
import { View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'

import type { ReactNode } from 'react'

type SubtaskGroupProps = {
  children: ReactNode[]
}

const LINE_WIDTH = 1
const CONNECTOR_LEFT = 10
const TICK_WIDTH = 10

export function SubtaskGroup({ children }: SubtaskGroupProps) {
  const { theme } = useAppTheme()
  const lineColor = theme.color.border

  if (children.length === 0) return null

  return (
    <View style={{ position: 'relative', marginLeft: CONNECTOR_LEFT }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: children.length === 1 ? '50%' : 0,
          width: LINE_WIDTH,
          backgroundColor: lineColor,
        }}
      />

      {children.map((child, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: TICK_WIDTH,
              height: LINE_WIDTH,
              backgroundColor: lineColor,
            }}
          />
          <View style={{ flex: 1 }}>{child}</View>
        </View>
      ))}
    </View>
  )
}
```

- [ ] **Step 2: Use SubtaskGroup in the todo detail screen**

In `src/app/todo/[todoId].tsx`, add the import:

```typescript
import { SubtaskGroup } from '@/components/subtask-group'
```

Find the subtasks section where children are mapped. Replace the direct map of children with `SubtaskGroup`. Currently, the children render looks like:

```tsx
{children.map((child) => (
  <SwipeableTodoItem
    key={child.id}
    todo={child}
    onToggle={toggleTodo}
    onPress={handleSubtaskPress}
  />
))}
```

Replace with:

```tsx
<SubtaskGroup>
  {children.map((child) => (
    <SwipeableTodoItem
      key={child.id}
      todo={child}
      onToggle={toggleTodo}
      onPress={handleSubtaskPress}
    />
  ))}
</SubtaskGroup>
```

- [ ] **Step 3: Run TypeScript check**

```
npx tsc --noEmit 2>&1 | Select-String -NotMatch "^example/"
```

Expected: no new errors.

- [ ] **Step 4: Test manually**

Run the app. Open a todo that has subtasks. Confirm:
- Vertical line runs down the left side of the subtask group
- Each subtask has a small horizontal tick connecting to the vertical line
- Lines use the theme border color
- Looks correct in both light and dark mode
- Empty subtask list (no children) shows no connector lines

- [ ] **Step 5: Commit**

```powershell
git add src/components/subtask-group.tsx "src/app/todo/[todoId].tsx"
git commit -m "feat: subtask connector lines in todo detail"
```

---

### Task 4: Task Reminders — Notification Service

**Files:**
- Create: `src/lib/notifications.ts`
- Create: `src/lib/notifications.test.ts`

**Interfaces:**
- Consumes: `Todo` type from `@/features/todos/types`
- Produces: `requestNotificationPermission()`, `scheduleTodoReminder(todo)`, `cancelTodoReminder(todoId)`, `cancelAllReminders()`, `rescheduleAllReminders(todosById, listsById)`

- [ ] **Step 1: Install expo-notifications**

```bash
npx expo install expo-notifications
```

- [ ] **Step 2: Create the notification service**

Create `src/lib/notifications.ts`:

```typescript
import * as Notifications from 'expo-notifications'

import type { Todo, TodoId } from '@/features/todos/types'

function notificationId(todoId: TodoId): string {
  return `todo-${todoId}`
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleTodoReminder(todo: Todo): Promise<void> {
  if (!todo.dueAt) return

  const triggerDate = new Date(todo.dueAt)
  if (triggerDate.getTime() <= Date.now()) return

  await Notifications.cancelScheduledNotificationAsync(notificationId(todo.id))

  await Notifications.scheduleNotificationAsync({
    identifier: notificationId(todo.id),
    content: {
      title: todo.title,
      body: 'Task due now',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  })
}

export async function cancelTodoReminder(todoId: TodoId): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId(todoId))
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

export async function rescheduleAllReminders(
  todosById: Record<TodoId, Todo>,
): Promise<void> {
  await cancelAllReminders()

  const now = Date.now()
  const promises = Object.values(todosById)
    .filter((todo) => !todo.completedAt && todo.dueAt && new Date(todo.dueAt).getTime() > now)
    .map((todo) => scheduleTodoReminder(todo))

  await Promise.all(promises)
}
```

- [ ] **Step 3: Run TypeScript check**

```
npx tsc --noEmit 2>&1 | Select-String -NotMatch "^example/"
```

Expected: no new errors. (Tests for notification scheduling would require mocking `expo-notifications` — skip for now since the service is thin wrapper over the SDK.)

- [ ] **Step 4: Commit**

```powershell
git add src/lib/notifications.ts
git commit -m "feat: notification service for task reminders"
```

---

### Task 5: Task Reminders — Store Integration

**Files:**
- Modify: `src/stores/settings-store.ts`
- Modify: `src/stores/todo-store.ts`
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: `scheduleTodoReminder`, `cancelTodoReminder`, `cancelAllReminders`, `rescheduleAllReminders` from `@/lib/notifications`, `useSettingsStore`
- Produces: `remindersEnabled` setting, notification side effects in todo CRUD actions, notification handler in root layout

- [ ] **Step 1: Add `remindersEnabled` to settings store**

In `src/stores/settings-store.ts`, add to the `SettingsState` type:

```typescript
remindersEnabled: boolean
setRemindersEnabled: (value: boolean) => void
```

Add to the store defaults:

```typescript
remindersEnabled: false,
setRemindersEnabled: (value) => set({ remindersEnabled: value }),
```

Add `remindersEnabled` to the `partialize` object.

- [ ] **Step 2: Add notification side effects to todo store**

In `src/stores/todo-store.ts`, add the imports at the top:

```typescript
import {
  scheduleTodoReminder,
  cancelTodoReminder,
} from '@/lib/notifications'
import { useSettingsStore } from '@/stores/settings-store'
```

Add a helper function before the store definition:

```typescript
function maybeScheduleReminder(todo: Todo) {
  if (useSettingsStore.getState().remindersEnabled) {
    scheduleTodoReminder(todo).catch(() => {})
  }
}

function maybeCancelReminder(todoId: TodoId) {
  if (useSettingsStore.getState().remindersEnabled) {
    cancelTodoReminder(todoId).catch(() => {})
  }
}
```

Add side effects in each action. In `createTodo`, after the `set()` call and before `return id`:

```typescript
const created = get().todosById[id]
if (created) maybeScheduleReminder(created)
```

In `updateTodo`, after the `set()` call:

```typescript
if (input.dueAt !== undefined) {
  const updated = get().todosById[id]
  if (updated) {
    if (updated.dueAt) {
      maybeScheduleReminder(updated)
    } else {
      maybeCancelReminder(id)
    }
  }
}
```

In `toggleTodo`, in the completion branch (where `completedAt` is set), after the `set()` call:

```typescript
if (!existing.completedAt) {
  maybeCancelReminder(id)
} else if (existing.dueAt) {
  maybeScheduleReminder({ ...existing, completedAt: null })
}
```

Note: for the recurring task branch (where `dueAt` is advanced), after the `set()` call add:

```typescript
const updated = get().todosById[id]
if (updated) maybeScheduleReminder(updated)
```

In `deleteTodo`, before the `set()` call:

```typescript
maybeCancelReminder(id)
```

- [ ] **Step 3: Set up notification handler in root layout**

In `src/app/_layout.tsx`, add the import and handler setup before the component:

```typescript
import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})
```

- [ ] **Step 4: Run TypeScript check and tests**

```
npx tsc --noEmit 2>&1 | Select-String -NotMatch "^example/"
npx vitest run
```

Expected: no new errors, all tests pass. (Existing store tests don't import expo-notifications — vitest may need a mock if the import fails. If so, create `src/__mocks__/expo-notifications.ts` that exports no-op stubs.)

- [ ] **Step 5: Commit**

```powershell
git add src/stores/settings-store.ts src/stores/todo-store.ts "src/app/_layout.tsx"
git commit -m "feat: integrate notification side effects into todo store"
```

---

### Task 6: Task Reminders — Settings Screen

**Files:**
- Create: `src/app/settings/reminders.tsx`
- Modify: `src/app/settings/index.tsx`

**Interfaces:**
- Consumes: `useSettingsStore` (`remindersEnabled`, `setRemindersEnabled`), `requestNotificationPermission`, `rescheduleAllReminders`, `cancelAllReminders` from `@/lib/notifications`, `useTodoStore`
- Produces: Settings screen with a toggle for enabling/disabling reminders

- [ ] **Step 1: Create the reminders settings screen**

Create `src/app/settings/reminders.tsx`:

```tsx
import { useCallback, useState } from 'react'
import { Alert, Pressable, Switch, Text, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '@/hooks/use-app-theme'
import {
  requestNotificationPermission,
  rescheduleAllReminders,
  cancelAllReminders,
} from '@/lib/notifications'
import { useSettingsStore } from '@/stores/settings-store'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
}

export default function RemindersScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const remindersEnabled = useSettingsStore((s) => s.remindersEnabled)
  const setRemindersEnabled = useSettingsStore((s) => s.setRemindersEnabled)
  const todosById = useTodoStore((s) => s.todosById)
  const [toggling, setToggling] = useState(false)

  const handleToggle = useCallback(
    async (value: boolean) => {
      if (toggling) return
      setToggling(true)

      if (value) {
        const granted = await requestNotificationPermission()
        if (!granted) {
          Alert.alert(
            'Notifications disabled',
            'Enable notifications in your device settings to receive task reminders.',
          )
          setToggling(false)
          return
        }
        setRemindersEnabled(true)
        await rescheduleAllReminders(todosById)
      } else {
        setRemindersEnabled(false)
        await cancelAllReminders()
      }

      setToggling(false)
    },
    [toggling, todosById, setRemindersEnabled],
  )

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <View
        style={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <SymbolView name={BACK_ICON} size={20} tintColor={theme.color.text2} />
        </Pressable>
        <Text style={{ ...typography.screenTitle, fontSize: 24, flex: 1, color: theme.color.text }}>
          Reminders
        </Text>
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: theme.spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.body, color: theme.color.text }}>
              Enable reminders
            </Text>
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              Get notified when tasks are due
            </Text>
          </View>
          <Switch
            value={remindersEnabled}
            onValueChange={handleToggle}
            disabled={toggling}
            trackColor={{ false: theme.color.border, true: theme.color.accent }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Enable reminders row in settings index**

In `src/app/settings/index.tsx`, update the Reminders `SettingsRow`:

Replace:
```tsx
<SettingsRow
  icon={ICONS.reminders}
  label="Reminders"
  value="Off"
  disabled
/>
```

With:
```tsx
<SettingsRow
  icon={ICONS.reminders}
  label="Reminders"
  value={remindersEnabled ? 'On' : 'Off'}
  onPress={() => router.push('/settings/reminders')}
/>
```

Add to the destructured values from `useSettingsStore()`:

```typescript
const { firstDayOfWeek, timeFormat, defaultView, remindersEnabled } = useSettingsStore()
```

(This replaces the existing destructure which only has `firstDayOfWeek, timeFormat, defaultView`.)

- [ ] **Step 3: Run TypeScript check**

```
npx tsc --noEmit 2>&1 | Select-String -NotMatch "^example/"
```

Expected: no new errors.

- [ ] **Step 4: Test manually**

Run the app. Go to Settings → Reminders. Confirm:
- Toggle switch shows on/off state
- Toggling on asks for notification permission (on first use)
- If permission denied, shows alert about system settings
- If permission granted, toggle turns on
- Settings index shows "On" or "Off" value
- Create a todo with a due date 1 minute in the future; confirm notification fires

- [ ] **Step 5: Commit**

```powershell
git add "src/app/settings/reminders.tsx" "src/app/settings/index.tsx"
git commit -m "feat: reminders settings screen with toggle"
```

---

### Task 7: Google Calendar Placeholder Screen

**Files:**
- Create: `src/app/settings/google-calendar.tsx`
- Modify: `src/app/settings/index.tsx`

**Interfaces:**
- Consumes: `useAppTheme()`, `typography`, `SymbolView`
- Produces: Informational "Coming soon" screen for Google Calendar

- [ ] **Step 1: Create the Google Calendar placeholder screen**

Create `src/app/settings/google-calendar.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
}

const CALENDAR_ICON: SymbolViewProps['name'] = {
  ios: 'calendar.badge.plus',
  android: 'event',
  web: 'event',
}

export default function GoogleCalendarScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <View
        style={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <SymbolView name={BACK_ICON} size={20} tintColor={theme.color.text2} />
        </Pressable>
        <Text style={{ ...typography.screenTitle, fontSize: 24, flex: 1, color: theme.color.text }}>
          Google Calendar
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.xl,
          paddingBottom: 120,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.color.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.lg,
          }}
        >
          <SymbolView name={CALENDAR_ICON} size={36} tintColor={theme.color.accent} />
        </View>
        <Text
          style={{
            ...typography.screenTitle,
            fontSize: 24,
            color: theme.color.text,
            textAlign: 'center',
            marginBottom: theme.spacing.sm,
          }}
        >
          Coming soon
        </Text>
        <Text
          style={{
            ...typography.body,
            color: theme.color.text2,
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          Connect your Google Calendar to see events alongside your tasks. We'll let you know when this feature is ready.
        </Text>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Enable Google Calendar row in settings index**

In `src/app/settings/index.tsx`, update the Google Calendar `SettingsRow`:

Replace:
```tsx
<SettingsRow
  icon={ICONS.calendar}
  label="Google Calendar"
  value="Not connected"
  disabled
/>
```

With:
```tsx
<SettingsRow
  icon={ICONS.calendar}
  label="Google Calendar"
  value="Not connected"
  onPress={() => router.push('/settings/google-calendar')}
/>
```

- [ ] **Step 3: Run TypeScript check and tests**

```
npx tsc --noEmit 2>&1 | Select-String -NotMatch "^example/"
npx vitest run
```

Expected: no new errors, all tests pass.

- [ ] **Step 4: Test manually**

Run the app. Go to Settings → Google Calendar. Confirm:
- Screen shows the calendar icon, "Coming soon" heading, and description
- Back button navigates back to settings
- Settings index shows "Not connected" value with chevron (no longer dimmed)

- [ ] **Step 5: Commit**

```powershell
git add "src/app/settings/google-calendar.tsx" "src/app/settings/index.tsx"
git commit -m "feat: Google Calendar coming soon placeholder screen"
```
