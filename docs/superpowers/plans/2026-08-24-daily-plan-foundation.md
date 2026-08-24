# Daily Plan Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unblock Smart Add's broken API call, split the 912-line `daily-plan.tsx` into focused files, and move chat state into a persisted store so conversations survive tab switches, app restarts, and can be reopened from a history sheet.

**Architecture:** Every chat — including the one in progress — is a record in one persisted zustand store keyed by id, with `activeChatId` pointing at the current one. The route file becomes pure composition; presentational pieces live in `src/components/daily-plan/`, orchestration in a `use-daily-plan-chat` hook, and pure logic in `src/features/daily-plan/`.

**Tech Stack:** Expo SDK 57, React Native 0.86.2, React 19.2.3, TypeScript 6.0.3, zustand 5 with `persist` + AsyncStorage, expo-router, vitest 4.

**Spec:** `docs/superpowers/specs/2026-08-24-daily-plan-tags-history-design.md`

**Covers:** Spec phases 0–3. Phase 4 (tags + local-first parsing) is a separate plan: `2026-08-24-daily-plan-tags-and-parser.md`.

## Global Constraints

- **Expo docs are versioned.** Per `AGENTS.md`, read `https://docs.expo.dev/versions/v57.0.0/` before writing any Expo-facing code. Do not rely on memory of older SDKs.
- **Typecheck command:** `npx tsc --noEmit 2>&1 | grep -v "^example/"` — output must be empty. The `example/` directory has ~40 pre-existing unrelated errors; they are expected and must be filtered, never "fixed".
- **Test command:** `npm test` (vitest, `environment: 'node'`, include pattern `src/**/*.test.ts`). Tests are colocated as `<name>.test.ts` next to the source file.
- **Pure logic only in tests.** The repo has zero React Native component tests and no RN testing library installed. Do not add one. UI tasks are verified by typecheck plus the explicit manual smoke check listed in the task.
- **AsyncStorage is already mocked** for vitest via an alias to `src/test/async-storage-mock.ts`, so zustand `persist` stores are directly testable.
- **Path alias:** `@/` maps to `src/`. Use it for cross-directory imports; use relative imports within the same directory (this matches `tag-pill.tsx` importing `./list-color-picker` style siblings).
- **Code style, matching the existing codebase:** no semicolons, single quotes, 2-space indent, `type` not `interface`, `export function` for helpers (not arrow consts), `import type { ... }` for type-only imports placed in a trailing import group.
- **Store conventions:** stores live in `src/stores/`, use `create<T>()(persist(...))` with `createJSONStorage(() => AsyncStorage)`, a `partialize` that excludes functions and transient flags, and an `onRehydrateStorage` that flips `hasHydrated`. Copy the shape from `src/stores/list-store.ts:143-148`.
- **THE REPO HAS SUBSTANTIAL UNRELATED UNCOMMITTED WORK** (a Google Calendar feature, weather, settings screens). Every commit step in this plan lists exact paths. `git add <exact paths>` only — **never** `git add -A`, `git add .`, or `git commit -a`.
- **Branch first.** The repo is on `master`, which is the default branch. Task 1 Step 1 creates a feature branch. Do not commit any task to `master`.
- **Commit message prefixes** follow existing history: `feat:`, `fix:`, `refactor:`, `chore:`.
- **Do not regress the keyboard fix.** `src/app/daily-plan.tsx` currently contains `behavior="padding"` on `KeyboardAvoidingView`, a `Keyboard` show/hide listener effect, `onContentSizeChange` scroll-to-end, and a `paddingBottom` that collapses when the keyboard is visible. These are a recent bug fix. They move between files in this plan but their behavior must not change.

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/features/daily-plan/types.ts` | `PlanChatId`, `PendingTag`, `PlanTask`, `PlanChatMessage`, `PlanChat`. Types only, no logic. |
| `src/features/daily-plan/chat-history.ts` | Pure helpers: title derivation, recency sort, retention pruning. |
| `src/features/daily-plan/chat-history.test.ts` | Tests for the above. |
| `src/features/daily-plan/ai-history.ts` | Maps `PlanChatMessage[]` → `smart-add`'s `ChatMessage[]`, keeping app types out of the API layer. |
| `src/stores/daily-plan-store.ts` | Persisted chat state and lifecycle actions. |
| `src/stores/daily-plan-store.test.ts` | Tests for the above. |
| `src/hooks/use-daily-plan-chat.ts` | Orchestration: send, receive, create todos, archive. The only place the route talks to the store. |
| `src/components/daily-plan/plan-section-label.tsx` | Uppercase section heading with count. |
| `src/components/daily-plan/plan-todo-row.tsx` | A real todo row with checkbox. |
| `src/components/daily-plan/plan-backlog-row.tsx` | A backlog row with an "add to today" plus button. |
| `src/components/daily-plan/plan-hero.tsx` | Greeting card: greeting, date, live clock, weather, task count. |
| `src/components/daily-plan/chat-empty-state.tsx` | Smart Add intro plus tappable example prompts. |
| `src/components/daily-plan/task-preview-card.tsx` | Card rendering proposed tasks. |
| `src/components/daily-plan/chat-message-bubble.tsx` | One user or AI bubble; renders the preview card for AI messages. |
| `src/components/daily-plan/chat-input-bar.tsx` | Pinned bottom input, send button, keyboard-aware padding. |
| `src/components/daily-plan/chat-history-sheet.tsx` | Modal list of past chats. |
| `src/lib/smart-add.test.ts` | Tests for the error formatter. |

**Modified:**

| File | Change |
|---|---|
| `src/lib/smart-add.ts` | Model constant, `formatGeminiError`, readable throw. |
| `src/app/daily-plan.tsx` | Shrinks from 912 lines to ~130 lines of composition. |

---

### Task 1: Gemini model constant and readable API errors

Fixes the live bug: `gemini-2.5-flash` returns HTTP 429 (free-tier limit, 20 requests/day) and the app rethrows Google's entire JSON error body into the chat, which renders as an unreadable wall of text. Verified working replacement: `gemini-3.5-flash`.

**Files:**
- Modify: `src/lib/smart-add.ts:70-71` (model in URL), `src/lib/smart-add.ts:86-89` (error throw)
- Test: `src/lib/smart-add.test.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export function formatGeminiError(status: number, body: string): string` — used by nothing else in this plan, but Task 8's hook surfaces its output verbatim as the chat error string.

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feat/daily-plan-foundation
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/smart-add.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { formatGeminiError } from './smart-add'

const quotaBody = JSON.stringify({
  error: {
    code: 429,
    message: 'You exceeded your current quota, please check your plan.',
    status: 'RESOURCE_EXHAUSTED',
  },
})

describe('formatGeminiError', () => {
  it('maps 429 to a daily-limit sentence instead of the raw body', () => {
    expect(formatGeminiError(429, quotaBody)).toBe(
      'Smart Add has reached its daily limit. It resets tomorrow.',
    )
  })

  it('maps 400 to an invalid-key sentence', () => {
    expect(formatGeminiError(400, '{"error":{"message":"API key not valid"}}')).toBe(
      'The Smart Add API key looks invalid. Check your configuration.',
    )
  })

  it('maps 403 to an invalid-key sentence', () => {
    expect(formatGeminiError(403, '{"error":{"message":"Forbidden"}}')).toBe(
      'The Smart Add API key looks invalid. Check your configuration.',
    )
  })

  it('uses the API message for other statuses', () => {
    expect(
      formatGeminiError(404, '{"error":{"message":"Model not found"}}'),
    ).toBe('Model not found')
  })

  it('falls back to a generic sentence when the body is not JSON', () => {
    expect(formatGeminiError(500, '<html>Gateway error</html>')).toBe(
      'Smart Add is unavailable right now.',
    )
  })

  it('falls back to a generic sentence when JSON has no error message', () => {
    expect(formatGeminiError(500, '{"ok":false}')).toBe(
      'Smart Add is unavailable right now.',
    )
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/smart-add.test.ts`
Expected: FAIL — `formatGeminiError is not a function` / no matching export.

- [ ] **Step 4: Add the model constant**

In `src/lib/smart-add.ts`, directly below the `GEMINI_API_KEY` line, add:

```ts
const GEMINI_MODEL = 'gemini-3.5-flash'
```

Then change the fetch URL at line 71 from the hardcoded model to the constant:

```ts
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
```

- [ ] **Step 5: Implement the error formatter**

Add to `src/lib/smart-add.ts`, above `smartAddChat`:

```ts
export function formatGeminiError(status: number, body: string): string {
  if (status === 429) {
    return 'Smart Add has reached its daily limit. It resets tomorrow.'
  }

  if (status === 400 || status === 403) {
    return 'The Smart Add API key looks invalid. Check your configuration.'
  }

  let message = ''
  try {
    message = JSON.parse(body)?.error?.message ?? ''
  } catch {
    message = ''
  }

  return message !== '' ? message : 'Smart Add is unavailable right now.'
}
```

- [ ] **Step 6: Use it at the throw site**

Replace `src/lib/smart-add.ts:86-89`:

```ts
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatGeminiError(res.status, body))
  }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, including the 6 new cases. No previously passing test breaks.

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add src/lib/smart-add.ts src/lib/smart-add.test.ts
git commit -m "fix: move Smart Add to gemini-3.5-flash and surface readable API errors"
```

---

### Task 2: Extract the three leaf row components

Pure move, no behavior change. These three are already standalone functions at the bottom of `daily-plan.tsx`; one of them (`TodoRow`) is duplicated in spirit by an inline backlog row that also gets extracted.

**Files:**
- Create: `src/components/daily-plan/plan-section-label.tsx`, `src/components/daily-plan/plan-todo-row.tsx`, `src/components/daily-plan/plan-backlog-row.tsx`
- Modify: `src/app/daily-plan.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces, imported by Task 8's rewritten route:
  - `PlanSectionLabel({ label: string, count: number, color: string })`
  - `PlanTodoRow({ todo: Todo, onToggle: (id: string) => void, onPress: (id: string) => void, showBorder: boolean })`
  - `PlanBacklogRow({ todo: Todo, onPress: (id: string) => void, onAddToToday: (id: string) => void, showBorder: boolean })`

- [ ] **Step 1: Create `plan-section-label.tsx`**

Move the body of `SectionLabel` from `src/app/daily-plan.tsx:851-868` verbatim. Rename the component to `PlanSectionLabel`, export it, and add its own imports:

```tsx
import { Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

type PlanSectionLabelProps = {
  label: string
  count: number
  color: string
}

export function PlanSectionLabel({ label, count, color }: PlanSectionLabelProps) {
  // body moved verbatim from daily-plan.tsx:851-868
}
```

- [ ] **Step 2: Create `plan-todo-row.tsx`**

Move the body of `TodoRow` from `src/app/daily-plan.tsx:870-912` verbatim. Rename to `PlanTodoRow`. Replace the inline `import('@/features/todos/types').Todo` type with a proper trailing type import — that inline form is a smell and this is the moment to fix it:

```tsx
import { Pressable, Text, View } from 'react-native'

import { TodoCheckbox } from '@/components/todo-checkbox'
import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { Todo } from '@/features/todos/types'

type PlanTodoRowProps = {
  todo: Todo
  onToggle: (id: string) => void
  onPress: (id: string) => void
  showBorder: boolean
}

export function PlanTodoRow({ todo, onToggle, onPress, showBorder }: PlanTodoRowProps) {
  // body moved verbatim from daily-plan.tsx:870-912
}
```

- [ ] **Step 3: Create `plan-backlog-row.tsx`**

This one is currently inline JSX inside the backlog `.map()` at `src/app/daily-plan.tsx:632-681`. Move that row's JSX (the outer `View` with the title `Pressable` and the plus `Pressable`) into a component. The `PLUS_ICON` constant moves with it — delete it from the route file.

```tsx
import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'
import type { Todo } from '@/features/todos/types'

const PLUS_ICON: SymbolViewProps['name'] = {
  ios: 'plus.circle.fill',
  android: 'add_circle',
  web: 'add_circle',
}

type PlanBacklogRowProps = {
  todo: Todo
  onPress: (id: string) => void
  onAddToToday: (id: string) => void
  showBorder: boolean
}

export function PlanBacklogRow({ todo, onPress, onAddToToday, showBorder }: PlanBacklogRowProps) {
  // JSX moved from daily-plan.tsx:632-681, with borderBottomWidth driven by showBorder
}
```

- [ ] **Step 4: Update the route to use them**

In `src/app/daily-plan.tsx`: delete the three local component definitions and the inline backlog row JSX, import the three new components, and replace the call sites. Delete the now-unused `PLUS_ICON` constant.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output. In particular there must be no "declared but never used" leftovers.

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS (unchanged — no test touches these).

- [ ] **Step 7: Manual smoke check**

Start the app (`npm run dev`), open Daily Plan from the Today tab. Verify: OVERDUE / TODAY / ADD TO TODAY section headings still render with their counts; a todo row still toggles its checkbox; tapping a backlog row's plus button still moves it to today; row separators still appear between rows but not after the last one.

- [ ] **Step 8: Commit**

```bash
git add src/components/daily-plan/plan-section-label.tsx src/components/daily-plan/plan-todo-row.tsx src/components/daily-plan/plan-backlog-row.tsx src/app/daily-plan.tsx
git commit -m "refactor: extract daily plan row components"
```

---

### Task 3: Extract the hero card

**Files:**
- Create: `src/components/daily-plan/plan-hero.tsx`
- Modify: `src/app/daily-plan.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `PlanHero({ totalPlanned: number })`. It owns its own greeting, date string, live clock interval, and weather lookup internally — the route passes only the count.

- [ ] **Step 1: Create `plan-hero.tsx`**

Move into it, verbatim: `getGreeting()` (`daily-plan.tsx:66-71`), the `formatClock` / `clockTime` / `useEffect` interval block (`daily-plan.tsx:~104-115`), the `dateStr` and `weatherStr` derivations, and the hero card JSX (`daily-plan.tsx:287-359`). It calls `useWeather()` and `useSettingsStore((s) => s.timeFormat)` itself.

```tsx
type PlanHeroProps = {
  totalPlanned: number
}

export function PlanHero({ totalPlanned }: PlanHeroProps) {
  // greeting + date + clock interval + weather + count badge,
  // all moved verbatim from daily-plan.tsx
}
```

Moving the interval here is a real improvement, not just tidying: the clock re-render every 30 s currently re-renders the entire 912-line screen including the chat list. After this it re-renders only the hero.

- [ ] **Step 2: Update the route**

Delete `getGreeting`, the clock state and effect, `dateStr`, `weatherStr`, the `useWeather` import and call, and the hero JSX. Render `<PlanHero totalPlanned={totalPlanned} />`. Keep the `totalPlanned` computation in the route — Task 8 still needs it for nothing else, but it reads naturally beside the todo selectors.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 4: Manual smoke check**

Open Daily Plan. Verify: greeting matches time of day, date line reads correctly, the clock shows and still ticks (wait 30 s or change device time), weather line appears when weather is enabled and is absent when it is not, and the count pill shows the right number of tasks.

- [ ] **Step 5: Commit**

```bash
git add src/components/daily-plan/plan-hero.tsx src/app/daily-plan.tsx
git commit -m "refactor: extract daily plan hero card"
```

---

### Task 4: Extract the chat presentation components

**Files:**
- Create: `src/components/daily-plan/chat-empty-state.tsx`, `src/components/daily-plan/task-preview-card.tsx`, `src/components/daily-plan/chat-message-bubble.tsx`
- Modify: `src/app/daily-plan.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `ChatEmptyState({ onPickExample: (text: string) => void })`
  - `TaskPreviewCard({ tasks: ParsedTodo[], timeFormat: string })` — renders the whole bordered card including per-task rows. Task 8 of the *tags* plan replaces `ParsedTodo` with `PlanTask` here and adds an `onChangeTags` prop.
  - `ChatMessageBubble({ message: ChatMessage, timeFormat: string })` — `ChatMessage` from `@/lib/smart-add`. Task 8 below re-types this to `PlanChatMessage` once the store exists.

- [ ] **Step 1: Create `chat-empty-state.tsx`**

Move the empty-state block from `src/app/daily-plan.tsx:361-...` (the `chatMessages.length === 0 && !successMsg` branch) verbatim, including the `SPARKLE_ICON` constant and the three example strings. The route currently does `setChatInput(example.slice(1, -1))` plus `inputRef.current?.focus()`; the component takes `onPickExample` and calls it with the already-unquoted text, so the slicing lives with the strings it belongs to.

- [ ] **Step 2: Create `task-preview-card.tsx`**

Move `TaskPreviewRow` from `src/app/daily-plan.tsx:759-849` verbatim as an unexported local function, and add the exported wrapper that renders the bordered container currently inline in the route:

```tsx
type TaskPreviewCardProps = {
  tasks: ParsedTodo[]
  timeFormat: string
}

export function TaskPreviewCard({ tasks, timeFormat }: TaskPreviewCardProps) {
  // bordered View + tasks.map(TaskPreviewRow) with showBorder on all but last
}
```

- [ ] **Step 3: Create `chat-message-bubble.tsx`**

Move the body of the `chatMessages.map(...)` callback verbatim — the user bubble branch and the AI branch — and have the AI branch render `<TaskPreviewCard />`.

```tsx
type ChatMessageBubbleProps = {
  message: ChatMessage
  timeFormat: string
}

export function ChatMessageBubble({ message, timeFormat }: ChatMessageBubbleProps) {
  // user branch: right-aligned accent bubble
  // ai branch: surfaceSoft bubble + TaskPreviewCard when message.todos is non-empty
}
```

- [ ] **Step 4: Update the route**

Replace the three JSX regions with the components. The map becomes:

```tsx
{chatMessages.map((msg, i) => (
  <ChatMessageBubble key={i} message={msg} timeFormat={timeFormat} />
))}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 6: Manual smoke check**

Open Daily Plan with an empty chat. Verify the Smart Add intro and three example chips render, and tapping one fills the input and focuses it. Then send a message and verify: your bubble is right-aligned and accent-colored, the AI bubble is left-aligned, and the proposed-task card renders titles, due dates, notes, and subtask dots as before.

- [ ] **Step 7: Commit**

```bash
git add src/components/daily-plan/chat-empty-state.tsx src/components/daily-plan/task-preview-card.tsx src/components/daily-plan/chat-message-bubble.tsx src/app/daily-plan.tsx
git commit -m "refactor: extract daily plan chat presentation components"
```

---

### Task 5: Extract the chat input bar

The keyboard-sensitive one. Read the Global Constraints note about not regressing the keyboard fix before starting.

**Files:**
- Create: `src/components/daily-plan/chat-input-bar.tsx`
- Modify: `src/app/daily-plan.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:

```ts
type ChatInputBarProps = {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  isSending: boolean
  isKeyboardVisible: boolean
  placeholder: string
  inputRef: React.RefObject<TextInput | null>
}
```

- [ ] **Step 1: Create `chat-input-bar.tsx`**

Move the entire pinned bottom bar from `src/app/daily-plan.tsx:683-753` verbatim, including the `SPARKLE_ICON` and `SEND_ICON` constants and the `useSafeAreaInsets()` call. The keyboard-collapsing padding moves with it exactly as written:

```tsx
paddingBottom: isKeyboardVisible
  ? theme.spacing.xs
  : insets.bottom + theme.spacing.xs,
```

`isKeyboardVisible` becomes a prop rather than local state, because the route also needs it (see Step 2). The send button still only renders when `value.trim().length > 0`, and the `ActivityIndicator` still replaces it while `isSending`.

- [ ] **Step 2: Update the route**

Keep in the route: the `KeyboardAvoidingView` with `behavior="padding"` and `keyboardVerticalOffset={0}`, the `Keyboard` show/hide listener effect that sets `isKeyboardVisible` and scrolls to end, and the `ScrollView` with `keyboardDismissMode` and `onContentSizeChange`. Only the bar itself moves. Render:

```tsx
<ChatInputBar
  value={chatInput}
  onChangeText={(text) => {
    setChatInput(text)
    setChatError('')
  }}
  onSend={handleSend}
  isSending={isSending}
  isKeyboardVisible={isKeyboardVisible}
  placeholder={hasChatContent ? 'Refine or add more...' : 'Describe your tasks...'}
  inputRef={inputRef}
/>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 4: Manual smoke check — this is the regression-prone one**

On a physical Android device (edge-to-edge is mandatory in SDK 54+, so the emulator's behavior can differ), open Daily Plan and tap the input. Verify all four of:
1. The input bar sits directly above the keyboard, not behind it.
2. The chat scrolls so the latest message stays visible when the keyboard opens.
3. There is no dead gap between the bar and the keyboard.
4. Dragging the chat dismisses the keyboard.

If any fail, the extraction changed behavior — do not proceed.

- [ ] **Step 5: Commit**

```bash
git add src/components/daily-plan/chat-input-bar.tsx src/app/daily-plan.tsx
git commit -m "refactor: extract daily plan chat input bar"
```

---

### Task 6: Daily-plan types and pure chat-history helpers

First task of the store phase. Pure functions, full TDD.

**Files:**
- Create: `src/features/daily-plan/types.ts`, `src/features/daily-plan/chat-history.ts`, `src/features/daily-plan/chat-history.test.ts`

**Interfaces:**
- Consumes: `Tag`, `TagColor`, `TagId` from `@/features/tags/types`; `Recurrence` from `@/features/todos/types`.
- Produces, used by Tasks 7, 8, 9 and the whole tags plan:
  - types `PlanChatId`, `PendingTag`, `PlanTask`, `PlanChatMessage`, `PlanChat`
  - `deriveChatTitle(text: string): string`
  - `sortChatsByRecency(chatsById: Record<PlanChatId, PlanChat>): PlanChat[]`
  - `pruneChats(chatsById: Record<PlanChatId, PlanChat>, activeChatId: PlanChatId | null, max: number): Record<PlanChatId, PlanChat>`

- [ ] **Step 1: Create the types file**

`src/features/daily-plan/types.ts`:

```ts
import type { TagColor, TagId } from '@/features/tags/types'
import type { Recurrence } from '@/features/todos/types'

export type PlanChatId = string

/** A tag attached to a proposed task. tagId === null means "create it on confirm". */
export type PendingTag = {
  tagId: TagId | null
  name: string
  color: TagColor
}

export type PlanTask = {
  title: string
  notes: string
  dueAt: string | null
  subtasks: string[]
  tags: PendingTag[]
  recurrence: Recurrence | null
}

export type PlanChatMessage = {
  role: 'user' | 'ai'
  text: string
  tasks?: PlanTask[]
}

export type PlanChat = {
  id: PlanChatId
  title: string
  messages: PlanChatMessage[]
  createdTodoCount: number
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Write the failing tests**

`src/features/daily-plan/chat-history.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { deriveChatTitle, pruneChats, sortChatsByRecency } from './chat-history'

import type { PlanChat, PlanChatId } from './types'

function chat(id: string, updatedAt: string): PlanChat {
  return {
    id,
    title: id,
    messages: [],
    createdTodoCount: 0,
    createdAt: updatedAt,
    updatedAt,
  }
}

function byId(...chats: PlanChat[]): Record<PlanChatId, PlanChat> {
  return Object.fromEntries(chats.map((c) => [c.id, c]))
}

describe('deriveChatTitle', () => {
  it('uses the trimmed text', () => {
    expect(deriveChatTitle('  buy milk  ')).toBe('buy milk')
  })

  it('collapses internal whitespace', () => {
    expect(deriveChatTitle('plan   the\n\nparty')).toBe('plan the party')
  })

  it('truncates past 60 characters with an ellipsis', () => {
    const long = 'a'.repeat(80)
    const title = deriveChatTitle(long)
    expect(title).toHaveLength(61)
    expect(title.endsWith('…')).toBe(true)
  })

  it('keeps a 60 character title intact', () => {
    const exact = 'a'.repeat(60)
    expect(deriveChatTitle(exact)).toBe(exact)
  })

  it('falls back for empty and whitespace-only text', () => {
    expect(deriveChatTitle('')).toBe('Untitled plan')
    expect(deriveChatTitle('   \n ')).toBe('Untitled plan')
  })
})

describe('sortChatsByRecency', () => {
  it('returns most recently updated first', () => {
    const chats = byId(
      chat('old', '2026-08-01T10:00:00.000Z'),
      chat('new', '2026-08-24T10:00:00.000Z'),
      chat('mid', '2026-08-10T10:00:00.000Z'),
    )

    expect(sortChatsByRecency(chats).map((c) => c.id)).toEqual(['new', 'mid', 'old'])
  })

  it('returns an empty array for an empty map', () => {
    expect(sortChatsByRecency({})).toEqual([])
  })
})

describe('pruneChats', () => {
  it('leaves the map untouched when under the limit', () => {
    const chats = byId(chat('a', '2026-08-01T10:00:00.000Z'))
    expect(pruneChats(chats, null, 30)).toEqual(chats)
  })

  it('keeps only the most recent max chats', () => {
    const chats = byId(
      chat('a', '2026-08-01T10:00:00.000Z'),
      chat('b', '2026-08-02T10:00:00.000Z'),
      chat('c', '2026-08-03T10:00:00.000Z'),
    )

    expect(Object.keys(pruneChats(chats, null, 2)).sort()).toEqual(['b', 'c'])
  })

  it('never prunes the active chat even when it is the oldest', () => {
    const chats = byId(
      chat('a', '2026-08-01T10:00:00.000Z'),
      chat('b', '2026-08-02T10:00:00.000Z'),
      chat('c', '2026-08-03T10:00:00.000Z'),
    )

    expect(Object.keys(pruneChats(chats, 'a', 1)).sort()).toEqual(['a', 'c'])
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/features/daily-plan/chat-history.test.ts`
Expected: FAIL — cannot resolve `./chat-history`.

- [ ] **Step 4: Implement the helpers**

`src/features/daily-plan/chat-history.ts`:

```ts
import type { PlanChat, PlanChatId } from './types'

const MAX_TITLE_LENGTH = 60

export function deriveChatTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean === '') return 'Untitled plan'
  if (clean.length <= MAX_TITLE_LENGTH) return clean
  return `${clean.slice(0, MAX_TITLE_LENGTH)}…`
}

export function sortChatsByRecency(
  chatsById: Record<PlanChatId, PlanChat>,
): PlanChat[] {
  // ISO-8601 strings sort lexicographically, so no Date parsing is needed.
  return Object.values(chatsById).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
}

export function pruneChats(
  chatsById: Record<PlanChatId, PlanChat>,
  activeChatId: PlanChatId | null,
  max: number,
): Record<PlanChatId, PlanChat> {
  const sorted = sortChatsByRecency(chatsById)
  if (sorted.length <= max) return chatsById

  const keep = new Set(sorted.slice(0, max).map((c) => c.id))
  if (activeChatId !== null) keep.add(activeChatId)

  const next: Record<PlanChatId, PlanChat> = {}
  for (const chat of sorted) {
    if (keep.has(chat.id)) next[chat.id] = chat
  }
  return next
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 11 new cases.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/features/daily-plan/types.ts src/features/daily-plan/chat-history.ts src/features/daily-plan/chat-history.test.ts
git commit -m "feat: add daily plan chat types and history helpers"
```

---

### Task 7: The persisted daily-plan store

**Files:**
- Create: `src/stores/daily-plan-store.ts`, `src/stores/daily-plan-store.test.ts`

**Interfaces:**
- Consumes: types and helpers from Task 6; `createId` from `@/lib/create-id`.
- Produces: `useDailyPlanStore` with the state and actions listed below. Task 8's hook is its only consumer; Task 9's sheet reads `chatsById` and calls `resumeChat` / `deleteChat`.

```ts
type DailyPlanState = {
  chatsById: Record<PlanChatId, PlanChat>
  activeChatId: PlanChatId | null
  draft: string
  hasHydrated: boolean

  ensureActiveChat: () => PlanChatId
  setDraft: (text: string) => void
  appendMessage: (msg: PlanChatMessage) => void
  setTaskTags: (messageIndex: number, taskIndex: number, tags: PendingTag[]) => void
  finishActiveChat: (createdTodoCount: number) => void
  startNewChat: () => void
  resumeChat: (id: PlanChatId) => void
  deleteChat: (id: PlanChatId) => void
}
```

Note `draft` is a single string at the store root, not a field on `PlanChat`. There is only ever one input, and keeping the draft off the chat record is what allows chats to be created lazily — typing a half-sentence and navigating away preserves the text without conjuring an empty chat to hold it.

- [ ] **Step 1: Write the failing tests**

`src/stores/daily-plan-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'

import { useDailyPlanStore } from './daily-plan-store'

import type { PlanChatMessage } from '@/features/daily-plan/types'

const store = () => useDailyPlanStore.getState()
const chats = () => useDailyPlanStore.getState().chatsById

function userMsg(text: string): PlanChatMessage {
  return { role: 'user', text }
}

beforeEach(() => {
  useDailyPlanStore.setState({ chatsById: {}, activeChatId: null, draft: '' })
})

describe('ensureActiveChat', () => {
  it('creates a chat lazily and marks it active', () => {
    expect(store().activeChatId).toBeNull()

    const id = store().ensureActiveChat()

    expect(store().activeChatId).toBe(id)
    expect(chats()[id].messages).toEqual([])
    expect(chats()[id].createdTodoCount).toBe(0)
  })

  it('is idempotent while a chat is active', () => {
    const first = store().ensureActiveChat()
    const second = store().ensureActiveChat()

    expect(second).toBe(first)
    expect(Object.keys(chats())).toHaveLength(1)
  })
})

describe('appendMessage', () => {
  it('titles the chat from the first user message', () => {
    const id = store().ensureActiveChat()
    store().appendMessage(userMsg('  plan   the party  '))

    expect(chats()[id].title).toBe('plan the party')
    expect(chats()[id].messages).toHaveLength(1)
  })

  it('does not retitle on later messages', () => {
    const id = store().ensureActiveChat()
    store().appendMessage(userMsg('first'))
    store().appendMessage({ role: 'ai', text: 'ok' })
    store().appendMessage(userMsg('second'))

    expect(chats()[id].title).toBe('first')
    expect(chats()[id].messages).toHaveLength(3)
  })
})

describe('setDraft', () => {
  it('survives without an active chat', () => {
    store().setDraft('half a sentence')

    expect(store().draft).toBe('half a sentence')
    expect(Object.keys(chats())).toHaveLength(0)
  })
})

describe('finishActiveChat', () => {
  it('records the count and clears the active chat', () => {
    const id = store().ensureActiveChat()
    store().appendMessage(userMsg('groceries'))
    store().setDraft('leftover')

    store().finishActiveChat(4)

    expect(store().activeChatId).toBeNull()
    expect(store().draft).toBe('')
    expect(chats()[id].createdTodoCount).toBe(4)
  })
})

describe('startNewChat', () => {
  it('deletes the active chat when it has no messages', () => {
    const id = store().ensureActiveChat()

    store().startNewChat()

    expect(store().activeChatId).toBeNull()
    expect(chats()[id]).toBeUndefined()
  })

  it('keeps the active chat when it has messages', () => {
    const id = store().ensureActiveChat()
    store().appendMessage(userMsg('keep me'))

    store().startNewChat()

    expect(store().activeChatId).toBeNull()
    expect(chats()[id]).toBeDefined()
  })
})

describe('resumeChat', () => {
  it('makes an old chat active and clears the draft', () => {
    const old = store().ensureActiveChat()
    store().appendMessage(userMsg('old chat'))
    store().finishActiveChat(1)
    store().setDraft('stale')

    store().resumeChat(old)

    expect(store().activeChatId).toBe(old)
    expect(store().draft).toBe('')
  })

  it('discards an empty chat that was active', () => {
    const empty = store().ensureActiveChat()
    useDailyPlanStore.setState({ activeChatId: null })
    const target = store().ensureActiveChat()
    store().appendMessage(userMsg('real'))
    store().finishActiveChat(0)

    useDailyPlanStore.setState({ activeChatId: empty })
    store().resumeChat(target)

    expect(chats()[empty]).toBeUndefined()
    expect(store().activeChatId).toBe(target)
  })
})

describe('setTaskTags', () => {
  it('replaces the tags of one task in one message', () => {
    store().ensureActiveChat()
    store().appendMessage(userMsg('x'))
    store().appendMessage({
      role: 'ai',
      text: 'here you go',
      tasks: [
        { title: 'a', notes: '', dueAt: null, subtasks: [], tags: [], recurrence: null },
        { title: 'b', notes: '', dueAt: null, subtasks: [], tags: [], recurrence: null },
      ],
    })

    store().setTaskTags(1, 0, [{ tagId: null, name: 'work', color: 'blue' }])

    const id = store().activeChatId as string
    expect(chats()[id].messages[1].tasks?.[0].tags).toEqual([
      { tagId: null, name: 'work', color: 'blue' },
    ])
    expect(chats()[id].messages[1].tasks?.[1].tags).toEqual([])
  })
})

describe('deleteChat', () => {
  it('removes the chat and clears activeChatId when it was active', () => {
    const id = store().ensureActiveChat()
    store().appendMessage(userMsg('bye'))

    store().deleteChat(id)

    expect(chats()[id]).toBeUndefined()
    expect(store().activeChatId).toBeNull()
  })
})

describe('retention', () => {
  it('keeps at most 30 chats', () => {
    for (let i = 0; i < 33; i++) {
      const id = store().ensureActiveChat()
      store().appendMessage(userMsg(`chat ${i}`))
      // Stagger updatedAt so recency ordering is deterministic.
      useDailyPlanStore.setState((s) => ({
        chatsById: {
          ...s.chatsById,
          [id]: { ...s.chatsById[id], updatedAt: `2026-08-${String(i + 1).padStart(2, '0')}T10:00:00.000Z` },
        },
      }))
      store().finishActiveChat(0)
    }

    expect(Object.keys(chats())).toHaveLength(30)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/stores/daily-plan-store.test.ts`
Expected: FAIL — cannot resolve `./daily-plan-store`.

- [ ] **Step 3: Implement the store**

`src/stores/daily-plan-store.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { deriveChatTitle, pruneChats } from '@/features/daily-plan/chat-history'
import { createId } from '@/lib/create-id'

import type {
  PendingTag,
  PlanChat,
  PlanChatId,
  PlanChatMessage,
} from '@/features/daily-plan/types'

const MAX_CHATS = 30

type DailyPlanState = {
  chatsById: Record<PlanChatId, PlanChat>
  activeChatId: PlanChatId | null
  draft: string
  hasHydrated: boolean

  ensureActiveChat: () => PlanChatId
  setDraft: (text: string) => void
  appendMessage: (msg: PlanChatMessage) => void
  setTaskTags: (messageIndex: number, taskIndex: number, tags: PendingTag[]) => void
  finishActiveChat: (createdTodoCount: number) => void
  startNewChat: () => void
  resumeChat: (id: PlanChatId) => void
  deleteChat: (id: PlanChatId) => void
}

function withoutEmptyChat(
  chatsById: Record<PlanChatId, PlanChat>,
  id: PlanChatId | null,
): Record<PlanChatId, PlanChat> {
  if (id === null) return chatsById
  const chat = chatsById[id]
  if (!chat || chat.messages.length > 0) return chatsById
  const { [id]: _removed, ...rest } = chatsById
  return rest
}

export const useDailyPlanStore = create<DailyPlanState>()(
  persist(
    (set, get) => ({
      chatsById: {},
      activeChatId: null,
      draft: '',
      hasHydrated: false,

      ensureActiveChat: () => {
        const { activeChatId, chatsById } = get()
        if (activeChatId !== null && chatsById[activeChatId]) return activeChatId

        const id = createId()
        const now = new Date().toISOString()
        const chat: PlanChat = {
          id,
          title: 'Untitled plan',
          messages: [],
          createdTodoCount: 0,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          chatsById: { ...state.chatsById, [id]: chat },
          activeChatId: id,
        }))
        return id
      },

      setDraft: (text) => set({ draft: text }),

      appendMessage: (msg) => {
        const id = get().activeChatId
        if (id === null) return
        const chat = get().chatsById[id]
        if (!chat) return

        const isFirstUserMessage =
          msg.role === 'user' && !chat.messages.some((m) => m.role === 'user')

        set((state) => ({
          chatsById: {
            ...state.chatsById,
            [id]: {
              ...chat,
              title: isFirstUserMessage ? deriveChatTitle(msg.text) : chat.title,
              messages: [...chat.messages, msg],
              updatedAt: new Date().toISOString(),
            },
          },
        }))
      },

      setTaskTags: (messageIndex, taskIndex, tags) => {
        const id = get().activeChatId
        if (id === null) return
        const chat = get().chatsById[id]
        if (!chat) return

        const messages = chat.messages.map((msg, mi) => {
          if (mi !== messageIndex || !msg.tasks) return msg
          return {
            ...msg,
            tasks: msg.tasks.map((task, ti) =>
              ti === taskIndex ? { ...task, tags } : task,
            ),
          }
        })

        set((state) => ({
          chatsById: {
            ...state.chatsById,
            [id]: { ...chat, messages, updatedAt: new Date().toISOString() },
          },
        }))
      },

      finishActiveChat: (createdTodoCount) => {
        const id = get().activeChatId
        if (id === null) return
        const chat = get().chatsById[id]
        if (!chat) return

        const chatsById = {
          ...get().chatsById,
          [id]: {
            ...chat,
            createdTodoCount: chat.createdTodoCount + createdTodoCount,
            updatedAt: new Date().toISOString(),
          },
        }

        set({
          chatsById: pruneChats(chatsById, null, MAX_CHATS),
          activeChatId: null,
          draft: '',
        })
      },

      startNewChat: () => {
        const { chatsById, activeChatId } = get()
        set({
          chatsById: withoutEmptyChat(chatsById, activeChatId),
          activeChatId: null,
          draft: '',
        })
      },

      resumeChat: (id) => {
        const { chatsById, activeChatId } = get()
        if (!chatsById[id]) return
        const cleaned =
          activeChatId === id ? chatsById : withoutEmptyChat(chatsById, activeChatId)
        set({ chatsById: cleaned, activeChatId: id, draft: '' })
      },

      deleteChat: (id) => {
        set((state) => {
          const { [id]: _removed, ...rest } = state.chatsById
          return {
            chatsById: rest,
            activeChatId: state.activeChatId === id ? null : state.activeChatId,
          }
        })
      },
    }),
    {
      name: 'daily-plan',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        chatsById: state.chatsById,
        activeChatId: state.activeChatId,
        draft: state.draft,
      }),
      onRehydrateStorage: () => () => {
        useDailyPlanStore.setState({ hasHydrated: true })
      },
    },
  ),
)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all new cases green.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/stores/daily-plan-store.ts src/stores/daily-plan-store.test.ts
git commit -m "feat: add persisted daily plan chat store"
```

---

### Task 8: Wire the route to the store via a hook

This is the task that fixes the reported "I lose my context when I switch tabs" bug.

**Files:**
- Create: `src/features/daily-plan/ai-history.ts`, `src/hooks/use-daily-plan-chat.ts`
- Modify: `src/app/daily-plan.tsx`

**Interfaces:**
- Consumes: `useDailyPlanStore` (Task 7), `formatGeminiError` indirectly via `smartAddChat` (Task 1), `smartAddChat` and `ChatMessage` from `@/lib/smart-add`.
- Produces: `useDailyPlanChat()` returning exactly:

```ts
{
  messages: PlanChatMessage[]
  draft: string
  setDraft: (text: string) => void
  isSending: boolean
  error: string
  successMsg: string
  hasChatContent: boolean
  latestTasks: PlanTask[]
  send: () => Promise<void>
  createTasks: () => void
  startNewChat: () => void
}
```

- [ ] **Step 1: Create the AI history mapper**

`src/features/daily-plan/ai-history.ts`:

```ts
import type { PlanChatMessage } from './types'
import type { ChatMessage } from '@/lib/smart-add'

/**
 * Flattens app-side chat messages into the shape smart-add sends to the model.
 * PendingTag objects become plain names so smart-add never sees app types.
 */
export function toAiHistory(messages: PlanChatMessage[]): ChatMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    text: msg.text,
    todos: msg.tasks?.map((task) => ({
      title: task.title,
      dueAt: task.dueAt,
      notes: task.notes,
      subtasks: task.subtasks,
    })),
  }))
}
```

Note: `ParsedTodo` gains a `tags` field in the tags plan; this mapper gets a matching `tags: task.tags.map((t) => t.name)` line at that point. Leave it out now — the field does not exist yet.

- [ ] **Step 2: Create the hook**

`src/hooks/use-daily-plan-chat.ts`. It replaces every `useState` currently in the route except `isKeyboardVisible`. Behavior carried over verbatim from `daily-plan.tsx:145-200`:

```ts
export function useDailyPlanChat() {
  const chatsById = useDailyPlanStore((s) => s.chatsById)
  const activeChatId = useDailyPlanStore((s) => s.activeChatId)
  const draft = useDailyPlanStore((s) => s.draft)
  const setDraft = useDailyPlanStore((s) => s.setDraft)
  const ensureActiveChat = useDailyPlanStore((s) => s.ensureActiveChat)
  const appendMessage = useDailyPlanStore((s) => s.appendMessage)
  const finishActiveChat = useDailyPlanStore((s) => s.finishActiveChat)
  const startNewChat = useDailyPlanStore((s) => s.startNewChat)

  const createTodo = useTodoStore((s) => s.createTodo)
  const listsById = useListStore((s) => s.listsById)

  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const messages = useMemo(
    () => (activeChatId ? (chatsById[activeChatId]?.messages ?? []) : []),
    [chatsById, activeChatId],
  )

  const latestTasks = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === 'ai' && msg.tasks && msg.tasks.length > 0) return msg.tasks
    }
    return [] as PlanTask[]
  }, [messages])

  // send():
  //   1. trim draft; bail on empty or while isSending
  //   2. ensureActiveChat()
  //   3. appendMessage({ role: 'user', text: trimmed }); setDraft('')
  //   4. setIsSending(true); setError(''); setSuccessMsg('')
  //   5. const result = await smartAddChat(toAiHistory(messages), trimmed)
  //   6. appendMessage({ role: 'ai', text: result.message, tasks: <mapped> })
  //   7. catch -> setError(e.message); finally -> setIsSending(false)
  //
  // createTasks():
  //   1. bail when latestTasks is empty
  //   2. bail with setError('Create a list first.') when defaultListId is ''
  //   3. for each task: createTodo({ listId, title, notes, dueAt }) then its subtasks
  //   4. finishActiveChat(latestTasks.length)
  //   5. setSuccessMsg(`Created N tasks`); clear it after 3000ms
}
```

Map `SmartAddResult.todos` to `PlanTask` with `tags: []` and `recurrence: null` for now — both fields are populated in the tags plan.

- [ ] **Step 3: Rewrite the route to use the hook**

`src/app/daily-plan.tsx` keeps only: `insets`, `isKeyboardVisible` state plus its `Keyboard` effect, `chatScrollRef`, `inputRef`, the todo selectors (`allRootTodos`, `overdue`, `todayTodos`, `backlog`, `totalPlanned`), `handleTodoPress`, `handleAddToToday`, the `KeyboardAvoidingView` / `ScrollView` skeleton, and the composed children. Everything else comes from `useDailyPlanChat()`.

Re-type the two chat components to the store's message type while you are here — Task 4 typed them against `smart-add`'s `ChatMessage`, and the store now owns the shape:

- `chat-message-bubble.tsx`: `message: PlanChatMessage` (from `@/features/daily-plan/types`), reading `message.tasks` instead of `message.todos`.
- `task-preview-card.tsx`: `tasks: PlanTask[]`. The rendered fields are identical — `title`, `dueAt`, `notes`, `subtasks` — so only the type import and the two field names change. `tags` and `recurrence` are ignored here until the tags plan.

Gate the chat region on hydration so a restart does not flash an empty chat:

```tsx
const hasHydrated = useDailyPlanStore((s) => s.hasHydrated)
```

Render the empty state, message list, sending indicator, error, and create button only when `hasHydrated` is true.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Manual smoke check — the actual bug fix**

1. Open Daily Plan, send a message, wait for the AI reply.
2. Tap the Today tab, then navigate back to Daily Plan. **The conversation must still be there.** This is the reported bug.
3. Type half a sentence without sending, switch tabs, come back. The half-sentence must still be in the input.
4. Force-quit the app and reopen it. The conversation must still be there.
5. Press "Create N tasks". Verify the todos and their subtasks appear in the list, and the chat resets to the empty state.
6. Confirm the file is now roughly 130 lines: `wc -l src/app/daily-plan.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/features/daily-plan/ai-history.ts src/hooks/use-daily-plan-chat.ts src/app/daily-plan.tsx src/components/daily-plan/chat-message-bubble.tsx src/components/daily-plan/task-preview-card.tsx
git commit -m "feat: persist daily plan chat across navigation and restarts"
```

---

### Task 9: Chat history sheet

**Files:**
- Create: `src/components/daily-plan/chat-history-sheet.tsx`
- Modify: `src/app/daily-plan.tsx` (header button + sheet state)

**Interfaces:**
- Consumes: `useDailyPlanStore` (Task 7), `sortChatsByRecency` (Task 6).
- Produces: `ChatHistorySheet({ visible: boolean, onClose: () => void })`.

- [ ] **Step 1: Create the sheet**

Follow the `Modal` pattern from `src/components/edit-list-sheet.tsx` — same `visible` / `onClose` props, same backdrop and container styling, same `Alert.alert` confirm for destructive actions.

```tsx
type ChatHistorySheetProps = {
  visible: boolean
  onClose: () => void
}

export function ChatHistorySheet({ visible, onClose }: ChatHistorySheetProps) {
  // chats = sortChatsByRecency(chatsById), excluding activeChatId
  // each row: title (numberOfLines={1}), then a meta line of
  //   `${relativeDate} · ${chat.createdTodoCount > 0
  //       ? `${chat.createdTodoCount} ${chat.createdTodoCount === 1 ? 'task' : 'tasks'}`
  //       : 'Draft'}`
  // onPress: resumeChat(chat.id) then onClose()
  // onLongPress: Alert.alert confirm -> deleteChat(chat.id)
  // empty list: centered "No past chats yet" using typography.body / theme.color.text2
}
```

Relative date helper, local to this file — the repo has `formatDayHeader` in `date-utils.ts` but it is tuned for agenda headers, not history rows:

```ts
function formatChatDate(iso: string): string {
  const date = new Date(iso)
  if (isToday(date)) return 'Today'
  if (isSameDay(date, addDays(new Date(), -1))) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
```

`isToday`, `isSameDay`, and `addDays` are already exported from `@/lib/date-utils`.

- [ ] **Step 2: Add the header button**

In `src/app/daily-plan.tsx`, add a history icon to the header row, to the left of the existing close button:

```tsx
const HISTORY_ICON: SymbolViewProps['name'] = {
  ios: 'clock.arrow.circlepath',
  android: 'history',
  web: 'history',
}
```

Wire it to `const [historyVisible, setHistoryVisible] = useState(false)` and render `<ChatHistorySheet visible={historyVisible} onClose={() => setHistoryVisible(false)} />`. The existing "New chat" button now calls the hook's `startNewChat`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Manual smoke check**

1. Have at least two finished chats (send a message, press "Create tasks", repeat).
2. Tap the history icon. Both chats appear, newest first, with correct titles and task counts.
3. Tap one — it loads into the chat, and you can send a follow-up message that the AI answers with the earlier context in mind.
4. Long-press a row, confirm the alert, and verify the row disappears.
5. Open the sheet with no history at all and verify the empty message renders rather than a blank sheet.

- [ ] **Step 6: Commit**

```bash
git add src/components/daily-plan/chat-history-sheet.tsx src/app/daily-plan.tsx
git commit -m "feat: add daily plan chat history sheet"
```

---

## Done criteria for this plan

- `wc -l src/app/daily-plan.tsx` is under 150.
- `npm test` passes; `npx tsc --noEmit 2>&1 | grep -v "^example/"` is empty.
- Chat survives a tab switch, a navigation away and back, and a force-quit.
- Past chats are listed, resumable, and deletable.
- Smart Add returns a readable sentence on failure instead of a JSON blob.
- The four keyboard behaviors from Task 5 Step 4 still hold.

Phase 4 — tags with colors from Smart Add, and the local-first parser that makes the API key optional — continues in `docs/superpowers/plans/2026-08-24-daily-plan-tags-and-parser.md`.
