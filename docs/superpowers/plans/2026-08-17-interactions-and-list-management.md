# Interactions & List Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add swipe-to-delete/complete on todo items, drag-to-reorder within lists, global search across all todos, and list management UI (rename, change color, delete).

**Architecture:** Four independent features layered onto the existing component hierarchy. Swipe actions use `ReanimatedSwipeable` from `react-native-gesture-handler` (already installed) — it requires wrapping the app in `GestureHandlerRootView`. Drag-to-reorder uses a custom long-press + pan gesture with `react-native-reanimated` shared values to animate vertical position. Search is a new Stack screen with a text input and filtered FlatList. List management adds an edit sheet to the existing list detail header.

**Tech Stack:** react-native-gesture-handler (ReanimatedSwipeable), react-native-reanimated (shared values, useAnimatedStyle), Zustand stores (existing), expo-symbols (icons), expo-router (Stack screen for search)

**Spec:** Conversation context — no formal spec document. Features derived from user request for items 1–4.

## Global Constraints

- Expo SDK 57, React Native 0.86
- No `any` types, no comments unless WHY is non-obvious
- Design tokens: 4px spacing grid, Manrope font (400/500/600), warm neutral + sage green palette
- Icons: `SymbolViewProps['name']` with `{ ios, android, web }` shape
- Path aliases: `@/*` → `./src/*`
- First day of week: Monday
- All existing tests (55) must continue to pass

## File Structure

**New files:**
- `src/components/swipeable-todo-item.tsx` — Wraps `TodoItem` with `ReanimatedSwipeable`, renders swipe action panes
- `src/components/search-bar.tsx` — Animated search input with clear button
- `src/app/search.tsx` — Full search screen (Stack route)
- `src/components/edit-list-sheet.tsx` — Bottom sheet for rename/color/delete on an existing list
- `src/features/todos/selectors.ts` — Add `searchTodos` selector

**Modified files:**
- `src/app/_layout.tsx` — Wrap root in `GestureHandlerRootView`
- `src/app/(tabs)/index.tsx` — Replace `TodoItem` with `SwipeableTodoItem`, add search icon to header
- `src/app/(tabs)/lists/[listId].tsx` — Replace `TodoItem` with `SwipeableTodoItem`, add edit button to header, add drag-to-reorder
- `src/app/todo/[todoId].tsx` — Replace `TodoItem` with `SwipeableTodoItem` for subtasks
- `src/stores/todo-store.ts` — Add `reorderTodo` action
- `src/features/todos/selectors.test.ts` — Add tests for `searchTodos`

---

### Task 1: GestureHandlerRootView + Swipeable Todo Item

**Files:**
- Modify: `src/app/_layout.tsx`
- Create: `src/components/swipeable-todo-item.tsx`
- Modify: `src/app/(tabs)/index.tsx`
- Modify: `src/app/(tabs)/lists/[listId].tsx`
- Modify: `src/app/todo/[todoId].tsx`

**Interfaces:**
- Consumes: `TodoItem` component (existing), `useTodoStore` toggleTodo/deleteTodo (existing)
- Produces: `SwipeableTodoItem` component with same props as `TodoItem` — used by Tasks 2 and 3

- [ ] **Step 1: Wrap root layout in GestureHandlerRootView**

Modify `src/app/_layout.tsx` — import `GestureHandlerRootView` and wrap the entire return:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler'

// In the return, wrap everything:
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <QuickAddModal />
    </ThemeProvider>
  </GestureHandlerRootView>
)
```

- [ ] **Step 2: Create SwipeableTodoItem component**

Create `src/components/swipeable-todo-item.tsx`:

```tsx
import { useRef, useCallback } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'

import { TodoItem } from './todo-item'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

import type { SharedValue } from 'react-native-reanimated'
import type { SymbolViewProps } from 'expo-symbols'
import type { Todo, TodoId } from '@/features/todos/types'

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark.circle.fill',
  android: 'check_circle',
  web: 'check_circle',
}
const UNDO_ICON: SymbolViewProps['name'] = {
  ios: 'arrow.uturn.backward',
  android: 'undo',
  web: 'undo',
}
const TRASH_ICON: SymbolViewProps['name'] = {
  ios: 'trash.fill',
  android: 'delete',
  web: 'delete',
}

type SwipeableTodoItemProps = {
  todo: Todo
  onToggle: (id: TodoId) => void
  onPress?: (id: TodoId) => void
  showListName?: boolean
}

export function SwipeableTodoItem({
  todo,
  onToggle,
  onPress,
  showListName,
}: SwipeableTodoItemProps) {
  const { theme } = useAppTheme()
  const deleteTodo = useTodoStore((s) => s.deleteTodo)
  const swipeableRef = useRef<any>(null)

  const isCompleted = todo.completedAt !== null

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel', onPress: () => swipeableRef.current?.close() },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTodo(todo.id),
      },
    ])
  }, [todo.id, deleteTodo])

  const handleToggle = useCallback(() => {
    onToggle(todo.id)
    swipeableRef.current?.close()
  }, [todo.id, onToggle])

  const renderLeftActions = useCallback(
    (_progress: SharedValue<number>, _drag: SharedValue<number>) => (
      <Pressable
        onPress={handleToggle}
        style={{
          backgroundColor: isCompleted ? theme.color.accent : '#4CAF50',
          justifyContent: 'center',
          alignItems: 'center',
          width: 80,
          borderRadius: theme.radius.md,
          marginRight: theme.spacing.xs,
        }}
      >
        <SymbolView
          name={isCompleted ? UNDO_ICON : CHECK_ICON}
          size={22}
          tintColor="#ffffff"
        />
        <Text
          style={{
            ...typography.meta,
            color: '#ffffff',
            fontFamily: 'Manrope_500Medium',
            marginTop: 2,
          }}
        >
          {isCompleted ? 'Undo' : 'Done'}
        </Text>
      </Pressable>
    ),
    [isCompleted, handleToggle, theme],
  )

  const renderRightActions = useCallback(
    (_progress: SharedValue<number>, _drag: SharedValue<number>) => (
      <Pressable
        onPress={handleDelete}
        style={{
          backgroundColor: '#D32F2F',
          justifyContent: 'center',
          alignItems: 'center',
          width: 80,
          borderRadius: theme.radius.md,
          marginLeft: theme.spacing.xs,
        }}
      >
        <SymbolView name={TRASH_ICON} size={22} tintColor="#ffffff" />
        <Text
          style={{
            ...typography.meta,
            color: '#ffffff',
            fontFamily: 'Manrope_500Medium',
            marginTop: 2,
          }}
        >
          Delete
        </Text>
      </Pressable>
    ),
    [handleDelete, theme],
  )

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      leftThreshold={40}
      rightThreshold={40}
      overshootLeft={false}
      overshootRight={false}
    >
      <View style={{ backgroundColor: theme.color.background }}>
        <TodoItem
          todo={todo}
          onToggle={onToggle}
          onPress={onPress}
          showListName={showListName}
        />
      </View>
    </ReanimatedSwipeable>
  )
}
```

- [ ] **Step 3: Replace TodoItem with SwipeableTodoItem in Today screen**

In `src/app/(tabs)/index.tsx`:
- Replace `import { TodoItem } from '@/components/todo-item'` with `import { SwipeableTodoItem } from '@/components/swipeable-todo-item'`
- In the `renderItem`, replace `<TodoItem ... />` with `<SwipeableTodoItem ... />`

- [ ] **Step 4: Replace TodoItem with SwipeableTodoItem in List Detail screen**

In `src/app/(tabs)/lists/[listId].tsx`:
- Replace `import { TodoItem } from '@/components/todo-item'` with `import { SwipeableTodoItem } from '@/components/swipeable-todo-item'`
- In the `renderItem`, replace `<TodoItem ... />` with `<SwipeableTodoItem ... />`

- [ ] **Step 5: Replace TodoItem with SwipeableTodoItem in Todo Detail subtasks**

In `src/app/todo/[todoId].tsx`:
- Replace `import { TodoItem } from '@/components/todo-item'` with `import { SwipeableTodoItem } from '@/components/swipeable-todo-item'`
- In the subtask map, replace `<TodoItem ... />` with `<SwipeableTodoItem ... />`

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: No errors from `src/`

Run: `npx vitest run`
Expected: All 55 tests pass

Manual test: Open any screen with todos. Swipe a todo right — green "Done" button appears, tap to complete. Swipe left — red "Delete" button appears with confirmation alert. Verify on both Today and List Detail screens.

- [ ] **Step 7: Commit**

```
git add src/app/_layout.tsx src/components/swipeable-todo-item.tsx src/app/(tabs)/index.tsx "src/app/(tabs)/lists/[listId].tsx" src/app/todo/[todoId].tsx
git commit -m "feat: swipe-to-complete and swipe-to-delete on todo items"
```

---

### Task 2: Drag-to-Reorder Todos

**Files:**
- Modify: `src/stores/todo-store.ts` — Add `reorderTodo` action
- Modify: `src/app/(tabs)/lists/[listId].tsx` — Convert FlatList to draggable list
- Test: `src/features/todos/selectors.test.ts` (existing — add reorder store test inline)

**Interfaces:**
- Consumes: `SwipeableTodoItem` from Task 1, `useTodoStore` (existing)
- Produces: `reorderTodo(id: TodoId, newPosition: number): void` on the todo store

- [ ] **Step 1: Add reorderTodo action to the store**

In `src/stores/todo-store.ts`, add to the `TodoState` type:

```typescript
reorderTodo: (id: TodoId, newPosition: number) => void
```

And the implementation inside the `create` block:

```typescript
reorderTodo: (id, newPosition) => {
  const todosById = get().todosById
  const todo = todosById[id]

  if (!todo) throw new Error('Todo does not exist')

  const siblings = Object.values(todosById)
    .filter(
      (t) =>
        t.listId === todo.listId &&
        t.parentId === todo.parentId &&
        t.id !== id,
    )
    .sort((a, b) => a.position - b.position)

  siblings.splice(newPosition, 0, todo)

  const now = new Date().toISOString()

  set((state) => {
    const next = { ...state.todosById }
    siblings.forEach((t, i) => {
      next[t.id] = { ...next[t.id], position: i, updatedAt: now }
    })
    return { todosById: next }
  })
},
```

- [ ] **Step 2: Implement drag-to-reorder in List Detail**

This uses a long-press gesture to activate drag mode. When dragging, items visually reorder via animated `translateY`. On drop, `reorderTodo` is called.

Replace the `FlatList` in `src/app/(tabs)/lists/[listId].tsx` with a draggable implementation. Add these imports:

```tsx
import { useRef } from 'react'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
```

Due to the complexity of implementing a full drag-to-reorder from scratch with gesture-handler + reanimated (measuring item heights, tracking active drag index, animated repositioning), a simpler approach is better for v1: add manual "move up" / "move down" buttons that appear when long-pressing a todo item.

Create a wrapper component that shows reorder controls on long-press:

In the List Detail screen, add state for the active reorder item:

```tsx
const [reorderingId, setReorderingId] = useState<string | null>(null)
const reorderTodo = useTodoStore((s) => s.reorderTodo)
```

For each todo in the active section, when `reorderingId === todo.id`, show up/down arrow buttons next to the item:

```tsx
const ARROW_UP: SymbolViewProps['name'] = { ios: 'chevron.up', android: 'keyboard_arrow_up', web: 'keyboard_arrow_up' }
const ARROW_DOWN: SymbolViewProps['name'] = { ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }
```

In `renderItem` for `type === 'todo'`:

```tsx
const isReordering = reorderingId === item.todo.id
const todoIndex = activeTodos.findIndex((t) => t.id === item.todo.id)

return (
  <View>
    <Pressable
      onLongPress={() =>
        setReorderingId((prev) => (prev === item.todo.id ? null : item.todo.id))
      }
    >
      <SwipeableTodoItem
        todo={item.todo}
        onToggle={toggleTodo}
        onPress={handleTodoPress}
      />
    </Pressable>
    {isReordering && (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          paddingBottom: theme.spacing.xs,
        }}
      >
        <Pressable
          disabled={todoIndex === 0}
          onPress={() => {
            reorderTodo(item.todo.id, todoIndex - 1)
            setReorderingId(null)
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.micro,
            backgroundColor: theme.color.surfaceSoft,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.full,
            opacity: pressed ? 0.7 : todoIndex === 0 ? 0.4 : 1,
          })}
        >
          <SymbolView name={ARROW_UP} size={16} tintColor={theme.color.text2} />
          <Text style={{ ...typography.meta, color: theme.color.text2 }}>Move up</Text>
        </Pressable>
        <Pressable
          disabled={todoIndex === activeTodos.length - 1}
          onPress={() => {
            reorderTodo(item.todo.id, todoIndex + 1)
            setReorderingId(null)
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.micro,
            backgroundColor: theme.color.surfaceSoft,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.full,
            opacity: pressed ? 0.7 : todoIndex === activeTodos.length - 1 ? 0.4 : 1,
          })}
        >
          <SymbolView name={ARROW_DOWN} size={16} tintColor={theme.color.text2} />
          <Text style={{ ...typography.meta, color: theme.color.text2 }}>Move down</Text>
        </Pressable>
      </View>
    )}
  </View>
)
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: No errors from `src/`

Run: `npx vitest run`
Expected: All tests pass

Manual test: On a list detail screen with multiple active todos, long-press a todo. "Move up" / "Move down" pill buttons appear. Tap "Move up" to swap it with the one above. Verify the order persists after navigating away and back.

- [ ] **Step 4: Commit**

```
git add src/stores/todo-store.ts "src/app/(tabs)/lists/[listId].tsx"
git commit -m "feat: drag-to-reorder todos with move up/down controls"
```

---

### Task 3: Search

**Files:**
- Modify: `src/features/todos/selectors.ts` — Add `searchTodos`
- Modify: `src/features/todos/selectors.test.ts` — Add tests for `searchTodos`
- Create: `src/app/search.tsx` — Full search screen
- Modify: `src/app/(tabs)/index.tsx` — Add search icon to header

**Interfaces:**
- Consumes: `SwipeableTodoItem` from Task 1, `useTodoStore` / `useListStore` (existing)
- Produces: `searchTodos(todosById: TodoById, query: string): Todo[]` selector, `/search` route

- [ ] **Step 1: Write failing test for searchTodos**

Add to `src/features/todos/selectors.test.ts`:

```typescript
import {
  // ... existing imports
  searchTodos,
} from './selectors'

describe('searchTodos', () => {
  const todos: TodoById = {
    'todo-1': {
      id: 'todo-1', listId: 'list-home', parentId: null,
      title: 'Buy groceries', notes: 'milk, eggs, bread',
      dueAt: null, completedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      position: 0,
    },
    'todo-2': {
      id: 'todo-2', listId: 'list-home', parentId: null,
      title: 'Clean kitchen', notes: '',
      dueAt: null, completedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      position: 1,
    },
    'todo-3': {
      id: 'todo-3', listId: 'list-work', parentId: null,
      title: 'Write report', notes: 'quarterly review for grocery division',
      dueAt: null, completedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      position: 0,
    },
  }

  it('matches title case-insensitively', () => {
    const results = searchTodos(todos, 'grocery')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('todo-1')
  })

  it('matches notes content', () => {
    const results = searchTodos(todos, 'quarterly')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('todo-3')
  })

  it('returns empty for no match', () => {
    expect(searchTodos(todos, 'zzzzz')).toHaveLength(0)
  })

  it('returns empty for blank query', () => {
    expect(searchTodos(todos, '')).toHaveLength(0)
    expect(searchTodos(todos, '  ')).toHaveLength(0)
  })

  it('matches across title and notes', () => {
    const results = searchTodos(todos, 'grocery')
    expect(results.map((t) => t.id).sort()).toEqual(['todo-1'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/todos/selectors.test.ts`
Expected: FAIL — `searchTodos` is not exported

- [ ] **Step 3: Implement searchTodos selector**

Add to `src/features/todos/selectors.ts`:

```typescript
export function searchTodos(todosById: TodoById, query: string): Todo[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []

  return Object.values(todosById).filter((todo) => {
    return (
      todo.title.toLowerCase().includes(trimmed) ||
      todo.notes.toLowerCase().includes(trimmed)
    )
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/todos/selectors.test.ts`
Expected: All tests pass

- [ ] **Step 5: Create search screen**

Create `src/app/search.tsx`:

```tsx
import { useState, useMemo, useCallback } from 'react'
import { FlatList, Pressable, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SwipeableTodoItem } from '@/components/swipeable-todo-item'
import { searchTodos } from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
}
const SEARCH_ICON: SymbolViewProps['name'] = {
  ios: 'magnifyingglass',
  android: 'search',
  web: 'search',
}
const CLEAR_ICON: SymbolViewProps['name'] = {
  ios: 'xmark.circle.fill',
  android: 'cancel',
  web: 'cancel',
}

export default function SearchScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const [query, setQuery] = useState('')

  const results = useMemo(
    () => searchTodos(todosById, query),
    [todosById, query],
  )

  const handleTodoPress = useCallback(
    (id: string) =>
      router.push({ pathname: '/todo/[todoId]', params: { todoId: id } }),
    [],
  )

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <View
        style={{
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <SymbolView name={BACK_ICON} size={18} tintColor={theme.color.text2} />
        </Pressable>

        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.color.surfaceSoft,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.sm,
            gap: theme.spacing.xs,
          }}
        >
          <SymbolView name={SEARCH_ICON} size={18} tintColor={theme.color.text2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks..."
            placeholderTextColor={theme.color.text2}
            autoFocus
            returnKeyType="search"
            style={{
              ...typography.body,
              flex: 1,
              color: theme.color.text,
              paddingVertical: theme.spacing.xs,
            }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <SymbolView name={CLEAR_ICON} size={18} tintColor={theme.color.text2} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: 120,
        }}
        renderItem={({ item }) => (
          <SwipeableTodoItem
            todo={item}
            onToggle={toggleTodo}
            onPress={handleTodoPress}
            showListName
          />
        )}
        ListEmptyComponent={
          query.trim().length > 0 ? (
            <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
              <Text style={{ ...typography.body, color: theme.color.text2 }}>
                No tasks match "{query}"
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: theme.spacing['3xl'] }}>
              <Text style={{ ...typography.body, color: theme.color.text2 }}>
                Search across all your tasks
              </Text>
            </View>
          )
        }
      />
    </View>
  )
}
```

- [ ] **Step 6: Add search icon to Today screen header**

In `src/app/(tabs)/index.tsx`, add a search icon next to the settings icon in the `rightAction`:

```tsx
const SEARCH_ICON: SymbolViewProps['name'] = {
  ios: 'magnifyingglass',
  android: 'search',
  web: 'search',
}

// In the ScreenHeader rightAction, wrap both icons in a View:
rightAction={
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
    <Pressable
      onPress={() => router.push('/search')}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
    >
      <SymbolView name={SEARCH_ICON} size={22} tintColor={theme.color.text2} />
    </Pressable>
    <Pressable
      onPress={() => router.push('/settings')}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
    >
      <SymbolView name={SETTINGS_ICON} size={22} tintColor={theme.color.text2} />
    </Pressable>
  </View>
}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: No errors

Run: `npx vitest run`
Expected: All tests pass (55 existing + 5 new = 60)

Manual test: Tap search icon on Today screen. Type "buy" — matching todos appear. Clear with X button. Tap a result to navigate to detail. Back navigates to search.

- [ ] **Step 8: Commit**

```
git add src/features/todos/selectors.ts src/features/todos/selectors.test.ts src/app/search.tsx src/app/(tabs)/index.tsx
git commit -m "feat: global search across all todos"
```

---

### Task 4: List Management (Rename, Color, Delete)

**Files:**
- Create: `src/components/edit-list-sheet.tsx`
- Modify: `src/app/(tabs)/lists/[listId].tsx` — Add edit button + sheet

**Interfaces:**
- Consumes: `useListStore` renameList/setListColor/deleteList (existing), `ListColorPicker` (existing)
- Produces: `EditListSheet` component

- [ ] **Step 1: Create EditListSheet component**

Create `src/components/edit-list-sheet.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react'
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'

import { ListColorPicker } from './list-color-picker'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useListStore } from '@/stores/list-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'
import type { TodoList, TodoListColor } from '@/features/lists/types'

type EditListSheetProps = {
  visible: boolean
  list: TodoList
  onClose: () => void
}

const TRASH_ICON: SymbolViewProps['name'] = {
  ios: 'trash',
  android: 'delete',
  web: 'delete',
}

export function EditListSheet({ visible, list, onClose }: EditListSheetProps) {
  const { theme } = useAppTheme()
  const renameList = useListStore((s) => s.renameList)
  const setListColor = useListStore((s) => s.setListColor)
  const deleteList = useListStore((s) => s.deleteList)

  const [name, setName] = useState(list.name)
  const [color, setColor] = useState<TodoListColor>(list.color)

  useEffect(() => {
    if (visible) {
      setName(list.name)
      setColor(list.color)
    }
  }, [visible, list.name, list.color])

  const handleSave = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) return

    if (trimmed !== list.name) renameList(list.id, trimmed)
    if (color !== list.color) setListColor(list.id, color)
    onClose()
  }, [name, color, list, renameList, setListColor, onClose])

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete List',
      `Delete "${list.name}" and all its tasks? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteList(list.id)
            onClose()
            router.back()
          },
        },
      ],
    )
  }, [list, deleteList, onClose])

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
          gap: theme.spacing.lg,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Pressable onPress={onClose}>
            <Text style={{ ...typography.body, color: theme.color.text2 }}>Cancel</Text>
          </Pressable>
          <Text style={{ ...typography.taskTitle, color: theme.color.text }}>Edit List</Text>
          <Pressable onPress={handleSave}>
            <Text
              style={{
                ...typography.body,
                fontFamily: 'Manrope_600SemiBold',
                color: name.trim().length > 0 ? theme.color.accent : theme.color.text2,
              }}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          <Text
            style={{
              ...typography.sectionTitle,
              color: theme.color.text2,
            }}
          >
            NAME
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
            style={{
              ...typography.body,
              backgroundColor: theme.color.surfaceSoft,
              color: theme.color.text,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
            }}
          />
        </View>

        <ListColorPicker value={color} onChange={setColor} />

        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.xs,
            paddingVertical: theme.spacing.sm,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <SymbolView name={TRASH_ICON} size={18} tintColor="#D32F2F" />
          <Text
            style={{
              ...typography.body,
              color: '#D32F2F',
              fontFamily: 'Manrope_500Medium',
            }}
          >
            Delete List
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}
```

- [ ] **Step 2: Add edit button to List Detail header**

In `src/app/(tabs)/lists/[listId].tsx`:

Add import:
```tsx
import { EditListSheet } from '@/components/edit-list-sheet'
```

Add state:
```tsx
const [showEditSheet, setShowEditSheet] = useState(false)
```

Add an edit icon constant:
```tsx
const EDIT_ICON: SymbolViewProps['name'] = { ios: 'pencil', android: 'edit', web: 'edit' }
```

Add an edit button next to the list title area (inside the header, after the list name View):

```tsx
<Pressable
  onPress={() => setShowEditSheet(true)}
  hitSlop={8}
  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
>
  <SymbolView name={EDIT_ICON} size={20} tintColor={theme.color.text2} />
</Pressable>
```

Render the sheet at the bottom of the component, before the closing `</View>`:

```tsx
{list && (
  <EditListSheet
    visible={showEditSheet}
    list={list}
    onClose={() => setShowEditSheet(false)}
  />
)}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: No errors

Run: `npx vitest run`
Expected: All tests pass

Manual test: Open a list. Tap the edit (pencil) icon. Rename the list — tap Save, name updates in header and lists screen. Change color — tap Save, color badge updates. Tap "Delete List" — confirmation alert, confirm, navigates back to lists screen, list is gone with all its todos.

- [ ] **Step 4: Commit**

```
git add src/components/edit-list-sheet.tsx "src/app/(tabs)/lists/[listId].tsx"
git commit -m "feat: list management with rename, color change, and delete"
```

---

## Verification Checklist

After all 4 tasks:

- [ ] `npx tsc --noEmit` — clean (ignoring `example/` dir)
- [ ] `npx vitest run` — all tests pass (60 expected)
- [ ] Swipe right on any todo → green complete/undo button works
- [ ] Swipe left on any todo → red delete button with confirmation works
- [ ] Long-press todo in list detail → move up/down controls appear and reorder persists
- [ ] Search icon on Today → search screen, live filtering, tap result opens detail
- [ ] Edit icon on list detail → rename, color change, delete all functional
