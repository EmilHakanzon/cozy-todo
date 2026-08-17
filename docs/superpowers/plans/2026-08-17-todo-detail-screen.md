# Todo Detail/Edit Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the todo detail/edit screen so users can tap a todo to view and edit its title, due date, list, notes, and subtasks — matching the Create/Edit Todo design mockup (image 2).

**Architecture:** A Stack screen at `app/todo/[todoId].tsx` receives the todoId via route params. All editing is done inline with auto-save on changes (no explicit Save button needed for field-by-field edits — matches the progressive-disclosure design). Date/time and list selection use bottom sheet modals. Subtasks render inline with add/toggle. TodoItem gets an `onPress` prop so all screens can navigate here.

**Tech Stack:** Expo SDK 57, expo-router, expo-symbols (SymbolView), Zustand, React Native

**Spec:** Design mockup image 2 (`assets/images/ChatGPT Image 14 aug. 2026 15_13_47.png`)

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
- Store: `useTodoStore` has `createTodo`, `updateTodo` (title/notes/dueAt), `toggleTodo`, `deleteTodo`
- `UpdateTodoInput = Partial<Pick<Todo, 'title' | 'notes' | 'dueAt'>>`

---

### Task 1: Add `changeList` to Todo Store

**Files:**
- Modify: `src/stores/todo-store.ts`
- Modify: `src/features/todos/todo-tree.test.ts` (or `selectors.test.ts` if store tests live there)

**Interfaces:**
- Consumes: `getDescendantIds` from `@/features/todos/todo-tree`
- Produces: `changeList(id: TodoId, newListId: TodoListId)` — moves a todo and all its descendants to a new list

- [ ] **Step 1: Add `changeList` to the store**

In `src/stores/todo-store.ts`, add to the `TodoState` type:

```typescript
changeList: (id: TodoId, newListId: TodoListId) => void
```

Add the implementation after `moveTodo`:

```typescript
changeList: (id, newListId) => {
  const todosById = get().todosById
  const todo = todosById[id]

  if (!todo) throw new Error('Todo does not exist')

  const now = new Date().toISOString()
  const descendantIds = getDescendantIds(todosById, id)

  set((state) => {
    const next = { ...state.todosById }

    next[id] = { ...todo, listId: newListId, parentId: null, updatedAt: now }

    for (const descId of descendantIds) {
      next[descId] = { ...next[descId], listId: newListId, updatedAt: now }
    }

    return { todosById: next }
  })
},
```

Note: `parentId: null` because when changing list, the todo becomes a root todo in the new list.

- [ ] **Step 2: Commit**

```bash
git add src/stores/todo-store.ts
git commit -m "feat: add changeList to todo store"
```

---

### Task 2: Make TodoItem Tappable

**Files:**
- Modify: `src/components/todo-item.tsx`
- Modify: `src/app/(tabs)/index.tsx`
- Modify: `src/app/(tabs)/lists/[listId].tsx`

**Interfaces:**
- Consumes: `router` from `expo-router`
- Produces: `TodoItem` gains an `onPress` prop; all screens wire it to navigate to `/todo/[todoId]`

- [ ] **Step 1: Add `onPress` to TodoItem**

In `src/components/todo-item.tsx`:

Add `Pressable` to the imports from `react-native`.

Add `onPress` to the props type:

```typescript
type TodoItemProps = {
  todo: Todo
  onToggle: (id: TodoId) => void
  onPress?: (id: TodoId) => void
  showListName?: boolean
}
```

Wrap the outer `<View>` in a `<Pressable>`:

```tsx
export function TodoItem({ todo, onToggle, onPress, showListName = false }: TodoItemProps) {
  // ... existing logic ...

  return (
    <Pressable
      onPress={() => onPress?.(todo.id)}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <TodoCheckbox checked={isCompleted} onToggle={() => onToggle(todo.id)} />
      {/* ... rest unchanged ... */}
    </Pressable>
  )
}
```

Replace the outer `<View>` with the `<Pressable>`. Keep all children the same.

- [ ] **Step 2: Wire navigation in Today screen**

In `src/app/(tabs)/index.tsx`, the `TodoItem` render already has `onToggle`. Add an `onPress` handler:

```tsx
// Add at top of component:
const handleTodoPress = useCallback(
  (id: string) => router.push({ pathname: '/todo/[todoId]', params: { todoId: id } }),
  [],
)

// Update the renderItem:
return <TodoItem todo={item.todo} onToggle={toggleTodo} onPress={handleTodoPress} showListName />
```

Add `useCallback` to the imports from React.

- [ ] **Step 3: Wire navigation in List Detail screen**

In `src/app/(tabs)/lists/[listId].tsx`, same pattern:

```tsx
const handleTodoPress = useCallback(
  (id: string) => router.push({ pathname: '/todo/[todoId]', params: { todoId: id } }),
  [],
)

// Update renderItem:
return <TodoItem todo={item.todo} onToggle={toggleTodo} onPress={handleTodoPress} />
```

Add `useCallback` to the imports from React.

- [ ] **Step 4: Commit**

```bash
git add src/components/todo-item.tsx src/app/\(tabs\)/index.tsx src/app/\(tabs\)/lists/\[listId\].tsx
git commit -m "feat: make TodoItem tappable with navigation to detail"
```

---

### Task 3: Date & Time Picker Sheet

**Files:**
- Create: `src/components/date-time-picker.tsx`

**Interfaces:**
- Consumes: `MonthCalendar`, `useAppTheme()`, `typography`, `SegmentedControl`, `toDateString()`, `formatTime()`
- Produces: `DateTimePicker({ visible, initialDate, onConfirm, onCancel })` — a bottom sheet modal with calendar + time input

- [ ] **Step 1: Create the date-time picker**

Create `src/components/date-time-picker.tsx`:

```tsx
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
            <Text
              style={{
                ...typography.taskTitle,
                color: theme.color.text,
              }}
            >
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
                <Text style={{ ...typography.body, fontFamily: 'Manrope_500Medium', color: theme.color.text }}>
                  {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                  <Pressable
                    onPress={() =>
                      setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                    }
                  >
                    <Text style={{ ...typography.body, color: theme.color.text2 }}>{'<'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                    }
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/date-time-picker.tsx
git commit -m "feat: Date & Time picker sheet with calendar and time input"
```

---

### Task 4: List Picker Sheet

**Files:**
- Create: `src/components/list-picker.tsx`

**Interfaces:**
- Consumes: `useListStore`, `useAppTheme()`, `typography`, `listColorsFor()`, `SymbolView`
- Produces: `ListPicker({ visible, currentListId, onSelect, onCancel })` — a bottom sheet modal with list options

- [ ] **Step 1: Create the list picker**

Create `src/components/list-picker.tsx`:

```tsx
import { FlatList, Modal, Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { TodoListId } from '@/features/todos/types'
import type { SymbolViewProps } from 'expo-symbols'

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

export function ListPicker({
  visible,
  currentListId,
  onSelect,
  onCancel,
}: ListPickerProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const lists = useListStore((s) => Object.values(s.listsById))
  const listColors = listColorsFor(resolvedTheme)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1 }} onPress={onCancel} />
      <View
        style={{
          backgroundColor: theme.color.surface,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          paddingBottom: 40,
          maxHeight: '50%',
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
          <Text style={{ ...typography.taskTitle, color: theme.color.text }}>
            Choose list
          </Text>
          <Pressable onPress={onCancel}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>Cancel</Text>
          </Pressable>
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
                onPress={() => onSelect(item.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                  gap: theme.spacing.sm,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: palette.accent,
                  }}
                />
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/list-picker.tsx
git commit -m "feat: List picker bottom sheet"
```

---

### Task 5: Todo Detail Screen

**Files:**
- Create: `src/app/todo/[todoId].tsx`

**Interfaces:**
- Consumes: `useTodoStore` (updateTodo, toggleTodo, deleteTodo, createTodo, changeList), `useListStore`, `useAppTheme()`, `typography`, `TodoCheckbox`, `DateTimePicker`, `ListPicker`, `SymbolView`, `router`, `useLocalSearchParams`, `getChildren`, `getTodoProgress`, `listColorsFor`, `formatTime`, `toDateString`, `isSameDay`, `isToday`
- Produces: Full edit screen with title, date, list, notes, subtasks, delete

- [ ] **Step 1: Create the todo detail screen**

Create `src/app/todo/[todoId].tsx`:

```tsx
import { useState, useMemo, useCallback } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { DateTimePicker } from '@/components/date-time-picker'
import { ListPicker } from '@/components/list-picker'
import { TodoCheckbox } from '@/components/todo-checkbox'
import { getTodoProgress } from '@/features/todos/selectors'
import { getChildren } from '@/features/todos/todo-tree'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { useTodoStore } from '@/stores/todo-store'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const CLOSE_ICON: SymbolViewProps['name'] = { ios: 'xmark', android: 'close', web: 'close' }
const CALENDAR_ICON: SymbolViewProps['name'] = { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }
const LIST_ICON: SymbolViewProps['name'] = { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }
const CHEVRON: SymbolViewProps['name'] = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }
const CHEVRON_UP: SymbolViewProps['name'] = { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
const CHEVRON_DOWN: SymbolViewProps['name'] = { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }

function formatDueLabel(dueAt: string): string {
  const d = new Date(dueAt)
  const now = new Date()
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  const time = `${hours}:${mins}`
  if (isToday) return `Today · ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${time}`
}

export default function TodoDetailScreen() {
  const { todoId } = useLocalSearchParams<{ todoId: string }>()
  const { theme, resolvedTheme } = useAppTheme()
  const insets = useSafeAreaInsets()

  const todo = useTodoStore((s) => s.todosById[todoId])
  const todosById = useTodoStore((s) => s.todosById)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)
  const createTodo = useTodoStore((s) => s.createTodo)
  const changeList = useTodoStore((s) => s.changeList)
  const list = useListStore((s) => (todo ? s.listsById[todo.listId] : undefined))
  const listColors = listColorsFor(resolvedTheme)

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showListPicker, setShowListPicker] = useState(false)
  const [subtasksExpanded, setSubtasksExpanded] = useState(true)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const children = useMemo(
    () => (todo ? getChildren(todosById, todo.id) : []),
    [todosById, todo],
  )
  const progress = useMemo(
    () => (todo ? getTodoProgress(todosById, todo.id) : { total: 0, completed: 0 }),
    [todosById, todo],
  )

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete task',
      'This will also delete all subtasks. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTodo(todoId)
            router.back()
          },
        },
      ],
    )
  }, [todoId, deleteTodo])

  const handleAddSubtask = useCallback(() => {
    const trimmed = newSubtaskTitle.trim()
    if (!trimmed || !todo) return
    createTodo({ listId: todo.listId, parentId: todo.id, title: trimmed })
    setNewSubtaskTitle('')
  }, [newSubtaskTitle, todo, createTodo])

  if (!todo) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.color.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ ...typography.body, color: theme.color.text2 }}>Task not found</Text>
      </View>
    )
  }

  const isCompleted = todo.completedAt !== null
  const palette = list ? listColors[list.color] : null

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <SymbolView name={CLOSE_ICON} size={20} tintColor={theme.color.text2} />
          </Pressable>
          <View style={{ width: 20 }} />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: insets.bottom + 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: theme.spacing.sm,
              paddingBottom: theme.spacing.lg,
            }}
          >
            <View style={{ paddingTop: 4 }}>
              <TodoCheckbox checked={isCompleted} onToggle={() => toggleTodo(todo.id)} />
            </View>
            <TextInput
              value={todo.title}
              onChangeText={(text) => updateTodo(todo.id, { title: text })}
              placeholder="Task title"
              placeholderTextColor={theme.color.text2}
              multiline
              style={{
                ...typography.screenTitle,
                fontSize: 24,
                flex: 1,
                color: isCompleted ? theme.color.text2 : theme.color.text,
                textDecorationLine: isCompleted ? 'line-through' : 'none',
                paddingVertical: 0,
              }}
            />
          </View>

          {/* Date row */}
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: theme.spacing.md,
              gap: theme.spacing.sm,
              borderTopWidth: 1,
              borderTopColor: theme.color.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <SymbolView name={CALENDAR_ICON} size={20} tintColor={theme.color.text2} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>Date & time</Text>
              <Text style={{ ...typography.body, color: theme.color.text }}>
                {todo.dueAt ? formatDueLabel(todo.dueAt) : 'Not set'}
              </Text>
            </View>
            <SymbolView name={CHEVRON} size={14} tintColor={theme.color.text2} />
          </Pressable>

          {/* List row */}
          <Pressable
            onPress={() => setShowListPicker(true)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: theme.spacing.md,
              gap: theme.spacing.sm,
              borderTopWidth: 1,
              borderTopColor: theme.color.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <SymbolView name={LIST_ICON} size={20} tintColor={theme.color.text2} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>List</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.micro }}>
                {palette && (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: palette.accent,
                    }}
                  />
                )}
                <Text style={{ ...typography.body, color: theme.color.text }}>
                  {list?.name ?? 'Unknown'}
                </Text>
              </View>
            </View>
            <SymbolView name={CHEVRON} size={14} tintColor={theme.color.text2} />
          </Pressable>

          {/* Notes */}
          <View
            style={{
              paddingVertical: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.color.border,
            }}
          >
            <Text style={{ ...typography.taskTitle, color: theme.color.text, marginBottom: theme.spacing.xs }}>
              Notes
            </Text>
            <TextInput
              value={todo.notes}
              onChangeText={(text) => updateTodo(todo.id, { notes: text })}
              placeholder="Add notes..."
              placeholderTextColor={theme.color.text2}
              multiline
              textAlignVertical="top"
              style={{
                ...typography.body,
                color: theme.color.text,
                minHeight: 60,
                paddingVertical: 0,
              }}
            />
          </View>

          {/* Subtasks */}
          <View
            style={{
              paddingVertical: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.color.border,
            }}
          >
            <Pressable
              onPress={() => setSubtasksExpanded((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: subtasksExpanded ? theme.spacing.sm : 0,
              }}
            >
              <Text style={{ ...typography.taskTitle, color: theme.color.text }}>
                Subtasks
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                {children.length > 0 && (
                  <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                    {progress.completed} / {progress.total}
                  </Text>
                )}
                <SymbolView
                  name={subtasksExpanded ? CHEVRON_UP : CHEVRON_DOWN}
                  size={16}
                  tintColor={theme.color.text2}
                />
              </View>
            </Pressable>

            {subtasksExpanded && (
              <View style={{ gap: theme.spacing.xs }}>
                {children.map((child) => (
                  <View
                    key={child.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      paddingVertical: theme.spacing.micro,
                    }}
                  >
                    <TodoCheckbox
                      checked={child.completedAt !== null}
                      onToggle={() => toggleTodo(child.id)}
                    />
                    <Text
                      style={{
                        ...typography.body,
                        flex: 1,
                        color: child.completedAt ? theme.color.text2 : theme.color.text,
                        textDecorationLine: child.completedAt ? 'line-through' : 'none',
                      }}
                    >
                      {child.title}
                    </Text>
                  </View>
                ))}

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    paddingVertical: theme.spacing.micro,
                  }}
                >
                  <Text style={{ ...typography.body, color: theme.color.text2 }}>+</Text>
                  <TextInput
                    value={newSubtaskTitle}
                    onChangeText={setNewSubtaskTitle}
                    placeholder="Add subtask"
                    placeholderTextColor={theme.color.text2}
                    returnKeyType="done"
                    onSubmitEditing={handleAddSubtask}
                    style={{
                      ...typography.body,
                      flex: 1,
                      color: theme.color.text,
                      paddingVertical: 0,
                    }}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Delete */}
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => ({
              alignItems: 'center',
              paddingVertical: theme.spacing.md,
              marginTop: theme.spacing.lg,
              borderTopWidth: 1,
              borderTopColor: theme.color.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ ...typography.body, color: '#c44', fontFamily: 'Manrope_500Medium' }}>
              Delete task
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <DateTimePicker
        visible={showDatePicker}
        initialDate={todo.dueAt}
        onConfirm={(isoString) => {
          updateTodo(todo.id, { dueAt: isoString })
          setShowDatePicker(false)
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      <ListPicker
        visible={showListPicker}
        currentListId={todo.listId}
        onSelect={(listId) => {
          if (listId !== todo.listId) changeList(todo.id, listId)
          setShowListPicker(false)
        }}
        onCancel={() => setShowListPicker(false)}
      />
    </View>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "^example/"
```

Expected: no errors from source files.

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 4: Verify todo detail screen**

Run the app. Tap any todo on the Today screen. Confirm:
- Screen opens with X close button
- Title is editable (updates live)
- Checkbox toggles completion
- Date & time row shows current due date or "Not set"
- Tapping date opens the Date & Time picker sheet with calendar + time
- List row shows colored dot + list name
- Tapping list opens the list picker sheet
- Notes are editable (multiline)
- Subtasks section shows children with checkboxes
- Subtask toggle works
- "+ Add subtask" input creates new subtask
- Delete button shows confirmation alert
- Confirming delete removes todo and navigates back

- [ ] **Step 5: Commit**

```bash
git add src/app/todo/\[todoId\].tsx
git commit -m "feat: Todo detail screen with inline editing, date picker, list picker, subtasks"
```
