# Android Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Android home screen widget (4×3 large) that shows today's todos and provides Quick Add / Smart Add buttons via deep links.

**Architecture:** Widget UI built with `react-native-android-widget` primitives (FlexWidget, TextWidget, ListWidget). Data flows from AsyncStorage (Zustand-persisted stores) through a widget task handler that reads and filters todos. Click actions use `OPEN_URI` with `cozytodo://` deep links handled by expo-router.

**Tech Stack:** react-native-android-widget, expo-router (deep links), AsyncStorage, Zustand (persist), Manrope font (ttf)

**Spec:** `docs/superpowers/specs/2026-09-05-android-widget-design.md`

## Global Constraints

- Expo SDK 57, expo-router ~57
- `reactCompiler: true` — widget files MUST start with `'use no memo'`
- No hooks in widget components — pure functions only
- Widget JS context is separate from app — no store subscriptions, only AsyncStorage reads
- Dev build required (EAS Build) — no Expo Go
- Test runner: `vitest` (not jest)
- AsyncStorage keys: `"todo"` (todosById), `"lists"` (listsById), `"tags"` (tagsById)
- Deep link scheme: `cozytodo://`
- Android only (iOS widget out of scope)

---

### Task 1: Install and configure react-native-android-widget

**Files:**
- Modify: `package.json:2` — change `main` field
- Create: `index.ts` — custom entry point
- Create: `assets/fonts/Manrope_400Regular.ttf` — copy from node_modules
- Create: `assets/fonts/Manrope_600SemiBold.ttf` — copy from node_modules
- Modify: `app.json:25-45` — add plugin config

**Interfaces:**
- Consumes: nothing
- Produces: `index.ts` entry point with `registerWidgetTaskHandler()` call; `widgetTaskHandler` name registered for Task 3

- [ ] **Step 1: Install the package**

Run:
```bash
npx expo install react-native-android-widget
```

- [ ] **Step 2: Copy font files to assets/fonts**

```bash
mkdir -p assets/fonts
cp node_modules/@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf assets/fonts/
cp node_modules/@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf assets/fonts/
```

- [ ] **Step 3: Add plugin config to app.json**

Add to the `plugins` array in `app.json`:

```json
["react-native-android-widget", {
  "fonts": [
    "./assets/fonts/Manrope_400Regular.ttf",
    "./assets/fonts/Manrope_600SemiBold.ttf"
  ],
  "widgets": [
    {
      "name": "TodoToday",
      "label": "Planora — Today",
      "description": "Shows today's tasks with quick add actions",
      "minWidth": "250dp",
      "minHeight": "180dp",
      "targetCellWidth": 4,
      "targetCellHeight": 3,
      "updatePeriodMillis": 1800000
    }
  ]
}]
```

- [ ] **Step 4: Create custom entry point**

Create `index.ts` at project root:

```ts
import { registerWidgetTaskHandler } from 'react-native-android-widget'
import { widgetTaskHandler } from './src/widgets/widget-task-handler'

registerWidgetTaskHandler(widgetTaskHandler)

import 'expo-router/entry'
```

- [ ] **Step 5: Update package.json main field**

Change `"main"` from `"expo-router/entry"` to `"./index.ts"`.

- [ ] **Step 6: Verify config compiles**

Run:
```bash
npx expo prebuild --platform android --clean
```

Check there are no errors. Then discard the generated `android/` directory:
```bash
rm -rf android
```

- [ ] **Step 7: Commit**

```bash
git add index.ts assets/fonts/ app.json package.json
git commit -m "feat(widget): install react-native-android-widget and configure entry point"
```

---

### Task 2: Widget data utilities (read + filter from AsyncStorage)

**Files:**
- Create: `src/widgets/widget-data.ts`
- Create: `src/widgets/widget-data.test.ts`

**Interfaces:**
- Consumes: AsyncStorage keys `"todo"`, `"lists"`, `"tags"` (Zustand persist format: `{ state: { todosById }, version }`)
- Produces:
  - `readWidgetData(): Promise<WidgetData>` — reads and returns filtered today todos with list/tag info
  - `WidgetData` type: `{ todos: WidgetTodo[], totalCount: number }`
  - `WidgetTodo` type: `{ id: string, title: string, completed: boolean, tagColor: TagColor | null, listColor: TodoListColor }`

- [ ] **Step 1: Write the failing tests**

Create `src/widgets/widget-data.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { filterTodosForWidget, type WidgetTodo } from './widget-data'
import type { Todo, TodoById } from '@/features/todos/types'
import type { TodoList } from '@/features/lists/types'
import type { Tag } from '@/features/tags/types'

function makeTodo(overrides: Partial<Todo> & Pick<Todo, 'id'>): Todo {
  return {
    listId: 'list-1',
    parentId: null,
    title: overrides.id,
    notes: '',
    dueAt: null,
    completedAt: null,
    recurrence: null,
    tagIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    position: 0,
    ...overrides,
  }
}

const LIST: Record<string, TodoList> = {
  'list-1': { id: 'list-1', name: 'Personal', color: 'sage', createdAt: '', updatedAt: '' },
}

const TAGS: Record<string, Tag> = {
  'tag-1': { id: 'tag-1', name: 'urgent', color: 'red', createdAt: '' },
}

describe('filterTodosForWidget', () => {
  it('returns only today root todos sorted active-first then by position', () => {
    const today = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T00:00:00.000Z'

    const todosById: TodoById = {
      a: makeTodo({ id: 'a', title: 'Active 2', dueAt: today, position: 1 }),
      b: makeTodo({ id: 'b', title: 'Active 1', dueAt: today, position: 0 }),
      c: makeTodo({ id: 'c', title: 'Done', dueAt: today, completedAt: '2026-01-01T12:00:00.000Z', position: 2 }),
      d: makeTodo({ id: 'd', title: 'Tomorrow', dueAt: tomorrow, position: 0 }),
      e: makeTodo({ id: 'e', title: 'Child', dueAt: today, parentId: 'a', position: 0 }),
    }

    const result = filterTodosForWidget(todosById, LIST, TAGS)

    expect(result.totalCount).toBe(3)
    expect(result.todos).toHaveLength(3)
    expect(result.todos[0].title).toBe('Active 1')
    expect(result.todos[0].completed).toBe(false)
    expect(result.todos[1].title).toBe('Active 2')
    expect(result.todos[2].title).toBe('Done')
    expect(result.todos[2].completed).toBe(true)
  })

  it('resolves first tag color from tagIds', () => {
    const today = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'
    const todosById: TodoById = {
      a: makeTodo({ id: 'a', title: 'Tagged', dueAt: today, tagIds: ['tag-1'] }),
    }
    const result = filterTodosForWidget(todosById, LIST, TAGS)
    expect(result.todos[0].tagColor).toBe('red')
  })

  it('returns empty when no todos for today', () => {
    const result = filterTodosForWidget({}, LIST, TAGS)
    expect(result.todos).toEqual([])
    expect(result.totalCount).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/widgets/widget-data.test.ts`
Expected: FAIL — module `./widget-data` not found

- [ ] **Step 3: Write the implementation**

Create `src/widgets/widget-data.ts`:

```ts
'use no memo'

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Todo, TodoById } from '@/features/todos/types'
import type { TodoList, TodoListColor } from '@/features/lists/types'
import type { Tag, TagColor } from '@/features/tags/types'

export type WidgetTodo = {
  id: string
  title: string
  completed: boolean
  tagColor: TagColor | null
  listColor: TodoListColor
}

export type WidgetData = {
  todos: WidgetTodo[]
  totalCount: number
}

export function filterTodosForWidget(
  todosById: TodoById,
  listsById: Record<string, TodoList>,
  tagsById: Record<string, Tag>,
): WidgetData {
  const today = new Date().toISOString().split('T')[0]

  const todayRootTodos = Object.values(todosById).filter(
    (t) => t.parentId === null && t.dueAt?.startsWith(today),
  )

  const active = todayRootTodos
    .filter((t) => t.completedAt === null)
    .sort((a, b) => a.position - b.position)

  const completed = todayRootTodos
    .filter((t) => t.completedAt !== null)
    .sort((a, b) => a.position - b.position)

  const sorted = [...active, ...completed]

  const todos: WidgetTodo[] = sorted.map((todo) => {
    const firstTagId = todo.tagIds[0]
    const tag = firstTagId ? tagsById[firstTagId] : undefined
    const list = listsById[todo.listId]

    return {
      id: todo.id,
      title: todo.title,
      completed: todo.completedAt !== null,
      tagColor: tag?.color ?? null,
      listColor: list?.color ?? 'sage',
    }
  })

  return { todos, totalCount: sorted.length }
}

function parseZustandState<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed?.state ?? null
  } catch {
    return null
  }
}

export async function readWidgetData(): Promise<WidgetData> {
  const [rawTodos, rawLists, rawTags] = await Promise.all([
    AsyncStorage.getItem('todo'),
    AsyncStorage.getItem('lists'),
    AsyncStorage.getItem('tags'),
  ])

  const todoState = parseZustandState<{ todosById: TodoById }>(rawTodos)
  const listState = parseZustandState<{ listsById: Record<string, TodoList> }>(rawLists)
  const tagState = parseZustandState<{ tagsById: Record<string, Tag> }>(rawTags)

  return filterTodosForWidget(
    todoState?.todosById ?? {},
    listState?.listsById ?? {},
    tagState?.tagsById ?? {},
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/widgets/widget-data.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/widgets/widget-data.ts src/widgets/widget-data.test.ts
git commit -m "feat(widget): add widget data utilities for reading and filtering todos"
```

---

### Task 3: Widget task handler

**Files:**
- Create: `src/widgets/widget-task-handler.tsx`

**Interfaces:**
- Consumes: `readWidgetData()` from Task 2, `TodoTodayWidget` from Task 4
- Produces: `widgetTaskHandler` — the function registered in `index.ts` (Task 1)

Note: This file imports the widget component from Task 4. Implement them together — the handler is thin.

- [ ] **Step 1: Create the task handler**

Create `src/widgets/widget-task-handler.tsx`:

```tsx
'use no memo'

import React from 'react'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { readWidgetData } from './widget-data'
import { TodoTodayWidget } from './TodoTodayWidget'

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo
  const widgetName = widgetInfo.widgetName

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await readWidgetData()
      props.renderWidget(<TodoTodayWidget data={data} />)
      break
    }

    case 'WIDGET_DELETED':
      break

    case 'WIDGET_CLICK': {
      const data = await readWidgetData()
      props.renderWidget(<TodoTodayWidget data={data} />)
      break
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/widgets/widget-task-handler.tsx
git commit -m "feat(widget): add widget task handler"
```

---

### Task 4: TodoTodayWidget component

**Files:**
- Create: `src/widgets/TodoTodayWidget.tsx`

**Interfaces:**
- Consumes: `WidgetData` type from Task 2
- Produces: `TodoTodayWidget` component — used by Task 3's handler

- [ ] **Step 1: Create the widget component**

Create `src/widgets/TodoTodayWidget.tsx`:

```tsx
'use no memo'

import React from 'react'
import {
  FlexWidget,
  TextWidget,
  ListWidget,
} from 'react-native-android-widget'
import type { WidgetData, WidgetTodo } from './widget-data'

const COLORS = {
  bg: '#1e2119',
  surface: '#222520',
  text: '#e8e4da',
  textSecondary: '#9a9689',
  textDimmed: '#6a6558',
  accent: '#8bab7a',
  border: '#3a3f35',
  tagRed: '#c47a5a',
  tagOrange: '#c4935a',
  tagYellow: '#c4a85a',
  tagGreen: '#8bab7a',
  tagBlue: '#5a8ac4',
  tagPurple: '#9a7ab8',
  tagPink: '#b87a9a',
  tagGray: '#9a9689',
} as const

function tagColorToHex(color: string | null): string | null {
  if (!color) return null
  const map: Record<string, string> = {
    red: COLORS.tagRed,
    orange: COLORS.tagOrange,
    yellow: COLORS.tagYellow,
    green: COLORS.tagGreen,
    blue: COLORS.tagBlue,
    purple: COLORS.tagPurple,
    pink: COLORS.tagPink,
    gray: COLORS.tagGray,
  }
  return map[color] ?? null
}

function TodoRow({ todo }: { todo: WidgetTodo }) {
  const textColor = todo.completed ? COLORS.textDimmed : COLORS.text
  const hex = tagColorToHex(todo.tagColor)

  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 10,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `cozytodo://todo/${todo.id}` }}
    >
      <FlexWidget
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: todo.completed ? COLORS.accent : COLORS.textSecondary,
          backgroundColor: todo.completed ? COLORS.accent : 'transparent',
        }}
      />
      <TextWidget
        text={todo.title}
        style={{
          flex: 1,
          fontSize: 14,
          fontFamily: 'Manrope_400Regular',
          color: textColor,
          textDecorationLine: todo.completed ? 'line-through' : 'none',
        }}
        maxLines={1}
      />
      {hex ? (
        <FlexWidget
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: hex,
          }}
        />
      ) : null}
    </FlexWidget>
  )
}

function EmptyState() {
  return (
    <FlexWidget
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 24,
      }}
    >
      <TextWidget
        text="No tasks for today"
        style={{
          fontSize: 14,
          fontFamily: 'Manrope_400Regular',
          color: COLORS.textSecondary,
        }}
      />
      <TextWidget
        text="Enjoy your day!"
        style={{
          fontSize: 12,
          fontFamily: 'Manrope_400Regular',
          color: COLORS.textDimmed,
          marginTop: 4,
        }}
      />
    </FlexWidget>
  )
}

export function TodoTodayWidget({ data }: { data: WidgetData }) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        flexDirection: 'column',
        backgroundColor: COLORS.bg,
        borderRadius: 20,
      }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          gap: 8,
        }}
      >
        <TextWidget
          text="📋"
          style={{ fontSize: 16 }}
        />
        <TextWidget
          text="Today"
          style={{
            flex: 1,
            fontSize: 16,
            fontFamily: 'Manrope_600SemiBold',
            color: COLORS.text,
          }}
        />
        <FlexWidget
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: COLORS.accent,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'cozytodo://quick-add' }}
        >
          <TextWidget
            text="+"
            style={{
              fontSize: 20,
              color: '#ffffff',
              fontFamily: 'Manrope_600SemiBold',
            }}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: COLORS.surface,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'cozytodo://smart-add' }}
        >
          <TextWidget
            text="✨"
            style={{ fontSize: 14 }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Divider */}
      <FlexWidget
        style={{
          height: 1,
          backgroundColor: COLORS.border,
          marginHorizontal: 12,
        }}
      />

      {/* Body */}
      {data.todos.length === 0 ? (
        <EmptyState />
      ) : (
        <ListWidget
          style={{ flex: 1 }}
        >
          {data.todos.map((todo) => (
            <TodoRow key={todo.id} todo={todo} />
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to widget files

- [ ] **Step 3: Commit**

```bash
git add src/widgets/TodoTodayWidget.tsx
git commit -m "feat(widget): add TodoTodayWidget component with dark theme"
```

---

### Task 5: Deep link routes (quick-add + smart-add)

**Files:**
- Create: `src/app/quick-add.tsx`
- Create: `src/app/smart-add.tsx`

**Interfaces:**
- Consumes: `useQuickAddStore.open()` from `src/stores/quick-add-store.ts`, expo-router `router.replace()`
- Produces: Routes at `cozytodo://quick-add` and `cozytodo://smart-add`

- [ ] **Step 1: Create quick-add deep link route**

Create `src/app/quick-add.tsx`:

```tsx
import { useEffect } from 'react'
import { router } from 'expo-router'
import { useQuickAddStore } from '@/stores/quick-add-store'

export default function QuickAddDeepLink() {
  const open = useQuickAddStore((s) => s.open)

  useEffect(() => {
    router.replace('/(tabs)')
    open()
  }, [open])

  return null
}
```

- [ ] **Step 2: Create smart-add deep link route**

Create `src/app/smart-add.tsx`:

```tsx
import { useEffect } from 'react'
import { router } from 'expo-router'

export default function SmartAddDeepLink() {
  useEffect(() => {
    router.replace('/daily-plan')
  }, [])

  return null
}
```

- [ ] **Step 3: Test deep links manually**

Start the dev server on a dev build:
```bash
npx expo start
```

Then from another terminal:
```bash
adb shell am start -a android.intent.action.VIEW -d "cozytodo://quick-add"
adb shell am start -a android.intent.action.VIEW -d "cozytodo://smart-add"
```

Expected: Quick Add opens the modal over the Today tab. Smart Add navigates to the Daily Plan chat.

- [ ] **Step 4: Commit**

```bash
git add src/app/quick-add.tsx src/app/smart-add.tsx
git commit -m "feat(widget): add deep link routes for quick-add and smart-add"
```

---

### Task 6: Trigger widget updates from the app

**Files:**
- Create: `src/widgets/update-widget.ts`
- Modify: `src/stores/todo-store.ts:61-335` — add widget update calls after mutations

**Interfaces:**
- Consumes: `readWidgetData()` from Task 2, `TodoTodayWidget` from Task 4, `requestWidgetUpdate` from `react-native-android-widget`
- Produces: `triggerWidgetUpdate()` — fire-and-forget function called by todo store

- [ ] **Step 1: Create the update helper**

Create `src/widgets/update-widget.ts`:

```ts
'use no memo'

import React from 'react'
import { Platform } from 'react-native'
import { requestWidgetUpdate } from 'react-native-android-widget'
import { readWidgetData } from './widget-data'
import { TodoTodayWidget } from './TodoTodayWidget'

export function triggerWidgetUpdate() {
  if (Platform.OS !== 'android') return

  readWidgetData()
    .then((data) => {
      requestWidgetUpdate({
        widgetName: 'TodoToday',
        renderWidget: () => React.createElement(TodoTodayWidget, { data }),
      })
    })
    .catch(() => {})
}
```

- [ ] **Step 2: Add widget update calls to todo-store.ts**

Import `triggerWidgetUpdate` at the top of `src/stores/todo-store.ts`:

```ts
import { triggerWidgetUpdate } from '@/widgets/update-widget'
```

Add `triggerWidgetUpdate()` at the end of each mutation method:

- `createTodo`: after `maybeScheduleReminder`, add `triggerWidgetUpdate()`
- `updateTodo`: after the `if (input.dueAt !== undefined)` block, add `triggerWidgetUpdate()`
- `toggleTodo`: after each `set()` call block (there are two — the recurrence path and the normal toggle path), add `triggerWidgetUpdate()`
- `deleteTodo`: after the `set()` call, add `triggerWidgetUpdate()`
- `changeList`: after the `set()` call, add `triggerWidgetUpdate()`
- `reorderTodo`: after the `set()` call, add `triggerWidgetUpdate()`

Do NOT add to `moveTodo` — it changes parent/list but not dueAt, so it won't affect the "today" filter unless it also triggers a changeList.

- [ ] **Step 3: Run existing tests**

Run: `npm test`
Expected: All 145+ tests pass. The `triggerWidgetUpdate()` call is fire-and-forget and doesn't affect store behavior.

- [ ] **Step 4: Commit**

```bash
git add src/widgets/update-widget.ts src/stores/todo-store.ts
git commit -m "feat(widget): trigger widget updates when todos change"
```

---

### Task 7: End-to-end verification on device

**Files:** None — manual testing only

**Interfaces:**
- Consumes: Everything from Tasks 1–6

- [ ] **Step 1: Build a development APK**

```bash
eas build --profile development --platform android
```

- [ ] **Step 2: Install and add widget**

Install the APK on a device/emulator. Long-press home screen → Widgets → find "Planora — Today" → add it.

- [ ] **Step 3: Verify widget displays today's todos**

Open the app, create a todo with today's date. Go back to home screen — widget should show the todo.

- [ ] **Step 4: Verify "+" button opens Quick Add**

Tap the "+" button on the widget. App should open with the Quick Add modal visible.

- [ ] **Step 5: Verify "✨" button opens Smart Add**

Tap the "✨" button on the widget. App should navigate to the Daily Plan chat screen.

- [ ] **Step 6: Verify todo tap opens detail**

Tap a todo row in the widget. App should navigate to that todo's detail screen.

- [ ] **Step 7: Verify widget updates after changes**

In the app, toggle a todo as complete. Go back to home screen — widget should now show that todo with strikethrough/dimmed styling at the bottom of the list.

- [ ] **Step 8: Final commit and push**

```bash
git push origin HEAD
```
