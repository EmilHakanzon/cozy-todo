# Daily Plan Tags and Local-First Parser Implementation Plan

> **Superseded 2026-08-24:** the local parser was removed at the user's request in favour of an LLM-only Daily Plan; the tags work in this plan was kept.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Smart Add propose coloured tags that the user reviews before anything is written, and make a pure local parser the floor of Smart Add so the app keeps working with no API key, no network, and no quota.

**Architecture:** A pure `parseTaskInput` in `src/features/todos/input.ts` runs on every first message of a chat and returns either tasks or `null` meaning "escalate". Only on `null` — or on any follow-up message in an ongoing chat — is the hosted model called. Tag names from either path go through one pure `resolveTags`, which matches existing tags case-insensitively and marks unknown ones for creation with a deterministic colour. Nothing touches `tag-store` until the user presses Create.

**Tech Stack:** Expo SDK 57, React Native 0.86.2, React 19.2.3, TypeScript 6.0.3, zustand 5, vitest 4.

**Spec:** `docs/superpowers/specs/2026-08-24-daily-plan-tags-history-design.md`

**Depends on:** `docs/superpowers/plans/2026-08-24-daily-plan-foundation.md` must be complete. This plan assumes `PlanTask`, `PendingTag`, `useDailyPlanStore`, `useDailyPlanChat`, and the extracted components in `src/components/daily-plan/` all exist.

## Global Constraints

All constraints from the foundation plan carry over unchanged. Repeated here because tasks are read in isolation:

- **Expo docs are versioned.** Per `AGENTS.md`, read `https://docs.expo.dev/versions/v57.0.0/` before writing Expo-facing code.
- **Typecheck:** `npx tsc --noEmit 2>&1 | grep -v "^example/"` must produce no output. The `example/` directory's ~40 errors are pre-existing and unrelated — filter them, never fix them.
- **Tests:** `npm test` (vitest, node environment, `src/**/*.test.ts`, colocated).
- **Pure logic only in tests.** No React Native component tests, no RN testing library. UI tasks are verified by typecheck plus the manual smoke check written into the task.
- **Path alias** `@/` → `src/`.
- **Style:** no semicolons, single quotes, 2-space indent, `type` not `interface`, `export function` for helpers, `import type` in a trailing group.
- **THE REPO HAS SUBSTANTIAL UNRELATED UNCOMMITTED WORK.** Every commit step lists exact paths. `git add <exact paths>` only — never `git add -A`, `git add .`, or `git commit -a`.
- **Branch:** continue on `feat/daily-plan-foundation`, or branch from it. Never commit to `master`.
- **Determinism in date tests:** construct the injected `today` with the **local** constructor `new Date(2026, 7, 24)` — never an ISO `Z` string. `toDateString` in `src/lib/date-utils.ts:60` reads local date parts, so a UTC-constructed date makes tests fail in negative-offset timezones. `2026-08-24` is a **Monday**; every date expectation below depends on that.

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/features/daily-plan/resolve-tags.ts` | Pure: tag names → `PendingTag[]`. Match, dedupe, cap, deterministic colour. |
| `src/features/daily-plan/resolve-tags.test.ts` | Tests for the above. |
| `src/features/todos/input.ts` | Pure local parser. File exists in the repo but is empty. |
| `src/features/todos/input.test.ts` | Tests for the above. |
| `src/components/tag-color-swatches.tsx` | The eight-colour row, currently duplicated inline in two screens. |
| `src/components/daily-plan/pending-tag-pill.tsx` | A tag pill that renders differently when the tag does not exist yet. |
| `src/components/daily-plan/pending-tag-editor.tsx` | Modal: recolour or remove one pending tag. |

**Modified:**

| File | Change |
|---|---|
| `src/lib/smart-add.ts` | `tags` in the JSON contract, existing tag names in the prompt, defensive parse. |
| `src/features/daily-plan/ai-history.ts` | Send `tags` back as plain names. |
| `src/stores/todo-store.ts` | `CreateTodoInput.tagIds`. |
| `src/components/tag-picker.tsx` | Use the extracted swatches. |
| `src/app/settings/tags.tsx` | Use the extracted swatches. |
| `src/components/daily-plan/task-preview-card.tsx` | Render `PlanTask`, show tag pills, open the editor. |
| `src/hooks/use-daily-plan-chat.ts` | Local-first routing, tag resolution, tag creation on confirm, degradation. |

---

### Task 1: Pure tag resolution

**Files:**
- Create: `src/features/daily-plan/resolve-tags.ts`, `src/features/daily-plan/resolve-tags.test.ts`

**Interfaces:**
- Consumes: `PendingTag` from `@/features/daily-plan/types`; `Tag`, `TagId`, `TAG_COLORS` from `@/features/tags/types`.
- Produces: `resolveTags(names: string[], tagsById: Record<TagId, Tag>): PendingTag[]` — used by Task 8's preview mapping and Task 9's hook.

- [ ] **Step 1: Write the failing tests**

`src/features/daily-plan/resolve-tags.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { resolveTags } from './resolve-tags'

import type { Tag, TagId } from '@/features/tags/types'

const work: Tag = {
  id: 'tag-work',
  name: 'Work',
  color: 'purple',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const existing: Record<TagId, Tag> = { [work.id]: work }

describe('resolveTags', () => {
  it('matches an existing tag case-insensitively and reuses its id, name and colour', () => {
    expect(resolveTags(['WORK'], existing)).toEqual([
      { tagId: 'tag-work', name: 'Work', color: 'purple' },
    ])
  })

  it('marks an unknown name for creation', () => {
    const [tag] = resolveTags(['groceries'], existing)

    expect(tag.tagId).toBeNull()
    expect(tag.name).toBe('groceries')
  })

  it('gives the same unknown name the same colour every time', () => {
    const first = resolveTags(['groceries'], existing)[0]
    const second = resolveTags(['groceries'], {})[0]

    expect(first.color).toBe(second.color)
  })

  it('dedupes case-insensitively, keeping the first occurrence', () => {
    expect(resolveTags(['home', 'Home', 'HOME'], {})).toHaveLength(1)
  })

  it('caps at three tags', () => {
    expect(resolveTags(['a', 'b', 'c', 'd', 'e'], {})).toHaveLength(3)
  })

  it('drops empty and whitespace-only names', () => {
    expect(resolveTags(['', '   ', 'real'], {})).toEqual([
      { tagId: null, name: 'real', color: expect.any(String) },
    ])
  })

  it('trims and collapses whitespace inside a name', () => {
    expect(resolveTags(['  side   project  '], {})[0].name).toBe('side project')
  })

  it('returns an empty array for an empty input', () => {
    expect(resolveTags([], existing)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/daily-plan/resolve-tags.test.ts`
Expected: FAIL — cannot resolve `./resolve-tags`.

- [ ] **Step 3: Implement**

`src/features/daily-plan/resolve-tags.ts`:

```ts
import { TAG_COLORS } from '@/features/tags/types'

import type { PendingTag } from './types'
import type { Tag, TagId } from '@/features/tags/types'

const MAX_TAGS_PER_TASK = 3

/** Stable char-code sum so a given name always lands on the same colour. */
function colorForName(name: string) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return TAG_COLORS[sum % TAG_COLORS.length]
}

export function resolveTags(
  names: string[],
  tagsById: Record<TagId, Tag>,
): PendingTag[] {
  const existingByName = new Map<string, Tag>()
  for (const tag of Object.values(tagsById)) {
    existingByName.set(tag.name.trim().toLowerCase(), tag)
  }

  const seen = new Set<string>()
  const resolved: PendingTag[] = []

  for (const raw of names) {
    if (resolved.length >= MAX_TAGS_PER_TASK) break

    const name = raw.trim().replace(/\s+/g, ' ')
    if (name === '') continue

    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const match = existingByName.get(key)
    resolved.push(
      match
        ? { tagId: match.id, name: match.name, color: match.color }
        : { tagId: null, name, color: colorForName(key) },
    )
  }

  return resolved
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 8 new cases.

- [ ] **Step 5: Commit**

```bash
git add src/features/daily-plan/resolve-tags.ts src/features/daily-plan/resolve-tags.test.ts
git commit -m "feat: add pure tag resolution for daily plan"
```

---

### Task 2: Tags in the AI contract

**Files:**
- Modify: `src/lib/smart-add.ts`, `src/features/daily-plan/ai-history.ts`
- Test: `src/lib/smart-add.test.ts` (exists from foundation Task 1)

**Interfaces:**
- Consumes: nothing new.
- Produces: `ParsedTodo` gains `tags: string[]`; `smartAddChat(history, input, existingTagNames)` gains a third parameter.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/smart-add.test.ts`:

```ts
import { normalizeParsedTodos } from './smart-add'

describe('normalizeParsedTodos', () => {
  it('keeps well-formed tags', () => {
    const todos = normalizeParsedTodos([
      { title: 'a', dueAt: null, notes: '', subtasks: [], tags: ['work'] },
    ])
    expect(todos[0].tags).toEqual(['work'])
  })

  it('defaults a missing tags field to an empty array', () => {
    const todos = normalizeParsedTodos([{ title: 'a' }])
    expect(todos[0].tags).toEqual([])
    expect(todos[0].subtasks).toEqual([])
    expect(todos[0].notes).toBe('')
    expect(todos[0].dueAt).toBeNull()
  })

  it('discards a tags field that is not an array of strings', () => {
    const todos = normalizeParsedTodos([{ title: 'a', tags: 'work' }])
    expect(todos[0].tags).toEqual([])
  })

  it('drops non-string entries inside tags', () => {
    const todos = normalizeParsedTodos([{ title: 'a', tags: ['work', 7, null] }])
    expect(todos[0].tags).toEqual(['work'])
  })

  it('discards entries with no usable title', () => {
    expect(normalizeParsedTodos([{ notes: 'orphan' }, { title: 'ok' }])).toHaveLength(1)
  })

  it('returns an empty array for a non-array input', () => {
    expect(normalizeParsedTodos(undefined)).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/smart-add.test.ts`
Expected: FAIL — `normalizeParsedTodos` is not exported.

- [ ] **Step 3: Add `tags` to the type and extract the normalizer**

In `src/lib/smart-add.ts`:

```ts
export type ParsedTodo = {
  title: string
  dueAt: string | null
  notes: string
  subtasks: string[]
  tags: string[]
}

export function normalizeParsedTodos(raw: unknown): ParsedTodo[] {
  if (!Array.isArray(raw)) return []

  const todos: ParsedTodo[] = []
  for (const item of raw) {
    const title = typeof item?.title === 'string' ? item.title.trim() : ''
    if (title === '') continue

    todos.push({
      title,
      dueAt: typeof item.dueAt === 'string' ? item.dueAt : null,
      notes: typeof item.notes === 'string' ? item.notes : '',
      subtasks: Array.isArray(item.subtasks)
        ? item.subtasks.filter((s: unknown) => typeof s === 'string')
        : [],
      tags: Array.isArray(item.tags)
        ? item.tags.filter((t: unknown) => typeof t === 'string')
        : [],
    })
  }
  return todos
}
```

Replace the existing hand-rolled defaulting at the bottom of `smartAddChat` with `parsed.todos = normalizeParsedTodos(parsed.todos)`.

- [ ] **Step 4: Update the prompt**

In `SYSTEM_PROMPT`, change the JSON shape line to include tags, and add the tag rules plus a placeholder for the user's existing tags:

```
{
  "message": "Your conversational response to the user",
  "todos": [{"title":"string","dueAt":"string|null","notes":"string","subtasks":["string"],"tags":["string"]}]
}

Tags: add 0-3 short lowercase tags per task. Reuse one of the user's existing
tags whenever it fits rather than inventing a near-duplicate. If nothing fits,
omit tags rather than inventing one.
The user's existing tags: {{TAGS}}
```

- [ ] **Step 5: Accept and inject the tag names**

Change the signature to `smartAddChat(history, input, existingTagNames: string[] = [])` and, beside the existing `{{TODAY}}` replacement:

```ts
const systemPrompt = SYSTEM_PROMPT.replace('{{TODAY}}', today).replace(
  '{{TAGS}}',
  existingTagNames.length > 0 ? existingTagNames.join(', ') : '(none yet)',
)
```

- [ ] **Step 6: Send tags back in history**

In `src/features/daily-plan/ai-history.ts`, add the line the foundation plan left out:

```ts
    todos: msg.tasks?.map((task) => ({
      title: task.title,
      dueAt: task.dueAt,
      notes: task.notes,
      subtasks: task.subtasks,
      tags: task.tags.map((t) => t.name),
    })),
```

- [ ] **Step 7: Run tests and typecheck**

Run: `npm test`
Expected: PASS.
Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/lib/smart-add.ts src/lib/smart-add.test.ts src/features/daily-plan/ai-history.ts
git commit -m "feat: add tags to the Smart Add AI contract"
```

---

### Task 3: Extract the shared tag colour swatches

The eight-colour row is currently written twice — inline in `src/components/tag-picker.tsx:103` and again in `src/app/settings/tags.tsx`. Task 8 needs a third copy, so extract it now.

**Files:**
- Create: `src/components/tag-color-swatches.tsx`
- Modify: `src/components/tag-picker.tsx`, `src/app/settings/tags.tsx`

**Interfaces:**
- Produces: `TagColorSwatches({ selected: TagColor, onSelect: (color: TagColor) => void })`.

- [ ] **Step 1: Create the component**

Move the swatch row markup verbatim out of `src/components/tag-picker.tsx` (the `TAG_COLORS.map(...)` block starting at line 103) and generalise its state to props:

```tsx
import { Pressable, View } from 'react-native'

import { TAG_COLORS } from '@/features/tags/types'
import { useAppTheme } from '@/hooks/use-app-theme'
import { tagColorsFor } from '@/themes/tag-color'

import type { TagColor } from '@/features/tags/types'

type TagColorSwatchesProps = {
  selected: TagColor
  onSelect: (color: TagColor) => void
}

export function TagColorSwatches({ selected, onSelect }: TagColorSwatchesProps) {
  // row of TAG_COLORS.map, each a Pressable circle filled with
  // tagColorsFor(resolvedTheme)[color].background, with the selected one
  // ringed exactly as tag-picker does today
}
```

- [ ] **Step 2: Use it in `tag-picker.tsx`**

Replace the inline block with `<TagColorSwatches selected={newColor} onSelect={setNewColor} />`. Remove the now-unused `TAG_COLORS` import if nothing else in the file uses it.

- [ ] **Step 3: Use it in `settings/tags.tsx`**

Same replacement, bound to `editColor` / `setEditColor` (see `src/app/settings/tags.tsx:38`).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output, and no unused-import errors.

- [ ] **Step 5: Manual smoke check**

Open Settings → Tags: create a tag, pick each of the eight colours, confirm the selected ring follows your taps and the saved tag shows the chosen colour. Then open a todo's tag picker and confirm the same row behaves identically. Check both light and dark mode — the swatches read from `tagColorsFor(resolvedTheme)`.

- [ ] **Step 6: Commit**

```bash
git add src/components/tag-color-swatches.tsx src/components/tag-picker.tsx src/app/settings/tags.tsx
git commit -m "refactor: extract shared tag colour swatches"
```

---

### Task 4: `CreateTodoInput.tagIds`

**Files:**
- Modify: `src/stores/todo-store.ts:17-22` (the type), `src/stores/todo-store.ts:~103` (the `tagIds: []` literal)
- Test: `src/stores/todo-store.test.ts`

**Interfaces:**
- Produces: `createTodo({ ..., tagIds?: string[] })`, defaulting to `[]`.

- [ ] **Step 1: Write the failing test**

Append to `src/stores/todo-store.test.ts`:

```ts
describe('createTodo tagIds', () => {
  it('stores the given tag ids', () => {
    const id = store().createTodo({
      listId: HOME,
      title: 'Handla',
      tagIds: ['tag-a', 'tag-b'],
    })

    expect(todo(id).tagIds).toEqual(['tag-a', 'tag-b'])
  })

  it('defaults to an empty array when omitted', () => {
    const id = store().createTodo({ listId: HOME, title: 'Utan taggar' })

    expect(todo(id).tagIds).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/stores/todo-store.test.ts`
Expected: FAIL — `tagIds` is not assignable to `CreateTodoInput`.

- [ ] **Step 3: Implement**

Add `tagIds?: string[]` to `CreateTodoInput`, and change the `tagIds: []` line in the constructed `Todo` to:

```ts
      tagIds: input.tagIds ?? [],
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test`
Expected: PASS.
Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/stores/todo-store.ts src/stores/todo-store.test.ts
git commit -m "feat: allow createTodo to set tag ids"
```

---

### Task 5: Local parser — dates and times

The largest piece. Split across Tasks 5–7 so each has its own test cycle. `src/features/todos/input.ts` exists in the repo as an empty file.

**Files:**
- Create (fill in): `src/features/todos/input.ts`, `src/features/todos/input.test.ts`

**Interfaces:**
- Consumes: `startOfDay`, `addDays`, `startOfWeek`, `endOfMonth`, `toDateString` from `@/lib/date-utils`.
- Produces, used by Tasks 6, 7, 9:

```ts
export type ParsedInputTask = {
  title: string
  notes: string
  dueAt: string | null
  subtasks: string[]
  tagNames: string[]
  recurrence: Recurrence | null
}

export function parseTaskInput(
  text: string,
  today: Date,
  firstDay: 'monday' | 'sunday',
): ParsedInputTask[] | null
```

`tagNames` is deliberately `string[]`, not `PendingTag[]` — this file lives under `features/todos` and must not depend on daily-plan types. Task 9's hook runs the names through `resolveTags`.

The signature takes `today` rather than calling `new Date()` so tests are deterministic.

**Two semantic decisions made here, both tested below:**
- Bare `at H` (no minutes, no am/pm) with `H` between 1 and 7 means afternoon — `at 5` is 17:00. `H` of 8 or more is literal — `at 9` is 09:00. In a todo app "call mom at 5" never means 05:00.
- Only **full** weekday names are matched bare (`friday`). Abbreviations are accepted only after `next` (`next fri`). A bare `\bsun\b` would otherwise turn "sun cream" into a Sunday.

- [ ] **Step 1: Write the failing tests**

`src/features/todos/input.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { parseTaskInput } from './input'

// 2026-08-24 is a Monday. Built with the local constructor on purpose:
// toDateString() reads local date parts, so a UTC date would drift.
const TODAY = new Date(2026, 7, 24)

function one(text: string) {
  const tasks = parseTaskInput(text, TODAY, 'monday')
  if (tasks === null) throw new Error(`expected tasks, got escalation for: ${text}`)
  expect(tasks).toHaveLength(1)
  return tasks[0]
}

describe('date phrases', () => {
  it('parses today', () => {
    expect(one('pay rent today').dueAt).toBe('2026-08-24')
  })

  it('parses tomorrow', () => {
    expect(one('pay rent tomorrow').dueAt).toBe('2026-08-25')
  })

  it('parses a bare weekday as the next future occurrence', () => {
    expect(one('gym friday').dueAt).toBe('2026-08-28')
  })

  it('excludes today from a bare weekday', () => {
    expect(one('gym monday').dueAt).toBe('2026-08-31')
  })

  it('parses next weekday as a week later', () => {
    expect(one('gym next friday').dueAt).toBe('2026-09-04')
  })

  it('accepts an abbreviation after next', () => {
    expect(one('gym next fri').dueAt).toBe('2026-09-04')
  })

  it('parses next week as the start of next week', () => {
    expect(one('review next week').dueAt).toBe('2026-08-31')
  })

  it('parses this weekend as Saturday', () => {
    expect(one('clean this weekend').dueAt).toBe('2026-08-29')
  })

  it('parses next weekend as the Saturday after', () => {
    expect(one('clean next weekend').dueAt).toBe('2026-09-05')
  })

  it('parses in N days', () => {
    expect(one('call back in 3 days').dueAt).toBe('2026-08-27')
  })

  it('parses in N weeks', () => {
    expect(one('follow up in 2 weeks').dueAt).toBe('2026-09-07')
  })

  it('parses end of month', () => {
    expect(one('send invoice end of month').dueAt).toBe('2026-08-31')
  })

  it('parses an explicit ISO date', () => {
    expect(one('dentist 2026-12-01').dueAt).toBe('2026-12-01')
  })

  it('does not parse ambiguous numeric dates', () => {
    expect(one('dentist 3/4').dueAt).toBeNull()
  })

  it('strips the date phrase out of the title', () => {
    expect(one('pay rent tomorrow').title).toBe('pay rent')
  })

  it('strips a trailing preposition left behind by the date', () => {
    expect(one('call mom on friday').title).toBe('call mom')
  })
})

describe('time phrases', () => {
  it('parses at HH:mm onto the parsed date', () => {
    expect(one('standup tomorrow at 09:30').dueAt).toBe('2026-08-25T09:30:00')
  })

  it('parses a bare HH:mm', () => {
    expect(one('standup 14:00').dueAt).toBe('2026-08-24T14:00:00')
  })

  it('parses at H am', () => {
    expect(one('standup tomorrow at 8am').dueAt).toBe('2026-08-25T08:00:00')
  })

  it('parses at H pm', () => {
    expect(one('standup tomorrow at 8pm').dueAt).toBe('2026-08-25T20:00:00')
  })

  it('treats a bare low hour as afternoon', () => {
    expect(one('call mom tomorrow at 5').dueAt).toBe('2026-08-25T17:00:00')
  })

  it('treats a bare high hour literally', () => {
    expect(one('call mom tomorrow at 9').dueAt).toBe('2026-08-25T09:00:00')
  })

  it('applies a time with no date to today', () => {
    expect(one('standup at 09:30').dueAt).toBe('2026-08-24T09:30:00')
  })

  it('parses tonight as today at 20:00', () => {
    expect(one('dishes tonight').dueAt).toBe('2026-08-24T20:00:00')
  })

  it('strips the time out of the title', () => {
    expect(one('standup tomorrow at 09:30').title).toBe('standup')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/features/todos/input.test.ts`
Expected: FAIL — `parseTaskInput` is not exported from an empty file.

- [ ] **Step 3: Implement the date and time layer**

`src/features/todos/input.ts`:

```ts
import { addDays, endOfMonth, startOfDay, startOfWeek, toDateString } from '@/lib/date-utils'

import type { Recurrence } from './types'

export type ParsedInputTask = {
  title: string
  notes: string
  dueAt: string | null
  subtasks: string[]
  tagNames: string[]
  recurrence: Recurrence | null
}

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const SATURDAY = 6

function strip(text: string, match: string): string {
  return text.replace(match, ' ')
}

function tidy(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+(on|at|by)$/i, '')
    .trim()
}

/** Days forward to the next `target` weekday, never returning today. */
function nextWeekday(from: Date, target: number, extraWeeks: number): Date {
  const delta = (target - from.getDay() + 7) % 7
  return addDays(from, (delta === 0 ? 7 : delta) + extraWeeks * 7)
}

function weekdayIndex(word: string): number {
  const lower = word.toLowerCase()
  return WEEKDAYS.findIndex((day) => day.startsWith(lower))
}

type DateMatch = { date: Date | null; rest: string }

function matchDate(text: string, today: Date, firstDay: 'monday' | 'sunday'): DateMatch {
  const base = startOfDay(today)

  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    return { date, rest: strip(text, iso[0]) }
  }

  const inDays = text.match(/\bin (\d+) days?\b/i)
  if (inDays) return { date: addDays(base, Number(inDays[1])), rest: strip(text, inDays[0]) }

  const inWeeks = text.match(/\bin (\d+) weeks?\b/i)
  if (inWeeks) {
    return { date: addDays(base, 7 * Number(inWeeks[1])), rest: strip(text, inWeeks[0]) }
  }

  const nextWeekendM = text.match(/\bnext weekend\b/i)
  if (nextWeekendM) {
    return { date: nextWeekday(base, SATURDAY, 1), rest: strip(text, nextWeekendM[0]) }
  }

  const thisWeekendM = text.match(/\b(this )?weekend\b/i)
  if (thisWeekendM) {
    return { date: nextWeekday(base, SATURDAY, 0), rest: strip(text, thisWeekendM[0]) }
  }

  const nextWeekM = text.match(/\bnext week\b/i)
  if (nextWeekM) {
    return { date: startOfWeek(addDays(base, 7), firstDay), rest: strip(text, nextWeekM[0]) }
  }

  const endOfMonthM = text.match(/\bend of month\b/i)
  if (endOfMonthM) {
    return { date: startOfDay(endOfMonth(base)), rest: strip(text, endOfMonthM[0]) }
  }

  const nextDayM = text.match(/\bnext (sun|mon|tues?|wed(nes)?|thur?s?|fri|sat(ur)?)[a-z]*\b/i)
  if (nextDayM) {
    const index = weekdayIndex(nextDayM[1])
    if (index >= 0) {
      return { date: nextWeekday(base, index, 1), rest: strip(text, nextDayM[0]) }
    }
  }

  const tomorrowM = text.match(/\btomorrow\b/i)
  if (tomorrowM) return { date: addDays(base, 1), rest: strip(text, tomorrowM[0]) }

  const todayM = text.match(/\btoday\b/i)
  if (todayM) return { date: base, rest: strip(text, todayM[0]) }

  // Full names only — a bare \bsun\b would swallow "sun cream".
  const dayM = text.match(new RegExp(`\\b(${WEEKDAYS.join('|')})\\b`, 'i'))
  if (dayM) {
    const index = weekdayIndex(dayM[1])
    return { date: nextWeekday(base, index, 0), rest: strip(text, dayM[0]) }
  }

  return { date: null, rest: text }
}

type TimeMatch = { time: { hours: number; minutes: number } | null; rest: string }

function matchTime(text: string): TimeMatch {
  const tonight = text.match(/\btonight\b/i)
  if (tonight) {
    return { time: { hours: 20, minutes: 0 }, rest: strip(text, tonight[0]) }
  }

  const hhmm = text.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i)
  if (hhmm) {
    return {
      time: { hours: Number(hhmm[1]), minutes: Number(hhmm[2]) },
      rest: strip(text, hhmm[0]),
    }
  }

  const ampm = text.match(/\bat\s+(\d{1,2})\s*(am|pm)\b/i)
  if (ampm) {
    const raw = Number(ampm[1]) % 12
    const hours = ampm[2].toLowerCase() === 'pm' ? raw + 12 : raw
    return { time: { hours, minutes: 0 }, rest: strip(text, ampm[0]) }
  }

  const bare = text.match(/\bat\s+(\d{1,2})\b/i)
  if (bare) {
    const raw = Number(bare[1])
    if (raw >= 0 && raw <= 23) {
      // "call mom at 5" means 17:00 in a todo app; "at 9" means 09:00.
      const hours = raw >= 1 && raw <= 7 ? raw + 12 : raw
      return { time: { hours, minutes: 0 }, rest: strip(text, bare[0]) }
    }
  }

  return { time: null, rest: text }
}

function buildDueAt(
  date: Date | null,
  time: { hours: number; minutes: number } | null,
  today: Date,
): string | null {
  if (date === null && time === null) return null

  const day = toDateString(date ?? startOfDay(today))
  if (time === null) return day

  const hh = String(time.hours).padStart(2, '0')
  const mm = String(time.minutes).padStart(2, '0')
  return `${day}T${hh}:${mm}:00`
}
```

Then the segment parser and the exported entry point — note "tonight" is matched by `matchTime` before `matchDate` runs, and yields no date, so `buildDueAt` correctly falls back to today:

```ts
function parseSegment(
  segment: string,
  today: Date,
  firstDay: 'monday' | 'sunday',
): ParsedInputTask {
  const timeResult = matchTime(segment)
  const dateResult = matchDate(timeResult.rest, today, firstDay)

  return {
    title: tidy(dateResult.rest),
    notes: '',
    dueAt: buildDueAt(dateResult.date, timeResult.time, today),
    subtasks: [],
    tagNames: [],
    recurrence: null,
  }
}

export function parseTaskInput(
  text: string,
  today: Date,
  firstDay: 'monday' | 'sunday',
): ParsedInputTask[] | null {
  const trimmed = text.trim()
  if (trimmed === '') return null

  const tasks = [parseSegment(trimmed, today, firstDay)].filter((t) => t.title !== '')
  return tasks.length > 0 ? tasks : null
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/todos/input.test.ts`
Expected: PASS, 25 cases.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/features/todos/input.ts src/features/todos/input.test.ts
git commit -m "feat: parse dates and times locally in task input"
```

---

### Task 6: Local parser — splitting, subtasks, recurrence, tags

**Files:**
- Modify: `src/features/todos/input.ts`, `src/features/todos/input.test.ts`

**Interfaces:**
- Consumes: everything from Task 5.
- Produces: the same `parseTaskInput`, now populating `subtasks`, `tagNames`, `recurrence`, and returning more than one task.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/todos/input.test.ts`:

```ts
function many(text: string) {
  const tasks = parseTaskInput(text, TODAY, 'monday')
  if (tasks === null) throw new Error(`expected tasks, got escalation for: ${text}`)
  return tasks
}

describe('splitting', () => {
  it('splits on newlines', () => {
    expect(many('buy milk\nwalk dog').map((t) => t.title)).toEqual(['buy milk', 'walk dog'])
  })

  it('splits on semicolons', () => {
    expect(many('buy milk; walk dog').map((t) => t.title)).toEqual(['buy milk', 'walk dog'])
  })

  it('does not split on and', () => {
    expect(many('buy bread and butter')).toHaveLength(1)
  })

  it('parses a date per segment', () => {
    const [first, second] = many('buy milk today\nwalk dog tomorrow')
    expect(first.dueAt).toBe('2026-08-24')
    expect(second.dueAt).toBe('2026-08-25')
  })
})

describe('subtasks', () => {
  it('turns a colon list into subtasks', () => {
    const task = one('Groceries: milk, eggs, bread')
    expect(task.title).toBe('Groceries')
    expect(task.subtasks).toEqual(['milk', 'eggs', 'bread'])
  })

  it('does not split commas without a colon', () => {
    const task = one('milk, eggs, bread')
    expect(task.title).toBe('milk, eggs, bread')
    expect(task.subtasks).toEqual([])
  })

  it('needs at least two items after the colon', () => {
    const task = one('Groceries: milk')
    expect(task.subtasks).toEqual([])
  })

  it('keeps a date in the title part out of the subtasks', () => {
    const task = one('Groceries tomorrow: milk, eggs')
    expect(task.title).toBe('Groceries')
    expect(task.dueAt).toBe('2026-08-25')
    expect(task.subtasks).toEqual(['milk', 'eggs'])
  })
})

describe('recurrence', () => {
  it('parses daily', () => {
    expect(one('stretch daily').recurrence).toEqual({ frequency: 'daily', interval: 1 })
  })

  it('parses every week', () => {
    expect(one('water plants every week').recurrence).toEqual({
      frequency: 'weekly',
      interval: 1,
    })
  })

  it('parses every N days', () => {
    expect(one('water plants every 3 days').recurrence).toEqual({
      frequency: 'daily',
      interval: 3,
    })
  })

  it('parses monthly and yearly', () => {
    expect(one('rent monthly').recurrence?.frequency).toBe('monthly')
    expect(one('mot yearly').recurrence?.frequency).toBe('yearly')
  })

  it('parses every weekday as weekly with the first due date on that day', () => {
    const task = one('gym every monday')
    expect(task.recurrence).toEqual({ frequency: 'weekly', interval: 1 })
    expect(task.dueAt).toBe('2026-08-31')
    expect(task.title).toBe('gym')
  })
})

describe('tags', () => {
  it('extracts hash tags and strips them from the title', () => {
    const task = one('finish report #work #urgent')
    expect(task.tagNames).toEqual(['work', 'urgent'])
    expect(task.title).toBe('finish report')
  })

  it('does not guess tags from keywords', () => {
    expect(one('buy groceries').tagNames).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/features/todos/input.test.ts`
Expected: FAIL on the new cases only; the Task 5 cases still pass.

- [ ] **Step 3: Implement**

Add to `src/features/todos/input.ts`:

```ts
type TagMatch = { tagNames: string[]; rest: string }

function matchTags(text: string): TagMatch {
  const tagNames: string[] = []
  const rest = text.replace(/#([\p{L}\p{N}_-]+)/gu, (_full, name: string) => {
    tagNames.push(name.toLowerCase())
    return ' '
  })
  return { tagNames, rest }
}

type RecurrenceMatch = { recurrence: Recurrence | null; weekday: number | null; rest: string }

function matchRecurrence(text: string): RecurrenceMatch {
  const everyN = text.match(/\bevery (\d+) (days?|weeks?|months?)\b/i)
  if (everyN) {
    const unit = everyN[2].toLowerCase()
    const frequency = unit.startsWith('day')
      ? 'daily'
      : unit.startsWith('week')
        ? 'weekly'
        : 'monthly'
    return {
      recurrence: { frequency, interval: Number(everyN[1]) },
      weekday: null,
      rest: strip(text, everyN[0]),
    }
  }

  const everyDay = text.match(new RegExp(`\\bevery (${WEEKDAYS.join('|')})\\b`, 'i'))
  if (everyDay) {
    return {
      recurrence: { frequency: 'weekly', interval: 1 },
      weekday: weekdayIndex(everyDay[1]),
      rest: strip(text, everyDay[0]),
    }
  }

  const simple = text.match(/\b(daily|every day|weekly|every week|monthly|every month|yearly|every year)\b/i)
  if (simple) {
    const phrase = simple[1].toLowerCase()
    const frequency = phrase.includes('day')
      ? 'daily'
      : phrase.includes('week')
        ? 'weekly'
        : phrase.includes('month')
          ? 'monthly'
          : 'yearly'
    return {
      recurrence: { frequency, interval: 1 },
      weekday: null,
      rest: strip(text, simple[0]),
    }
  }

  return { recurrence: null, weekday: null, rest: text }
}

type ColonSplit = { titlePart: string; subtasks: string[] }

function splitColonList(segment: string): ColonSplit {
  const match = segment.match(/^(.+?):\s*(.+)$/)
  if (!match) return { titlePart: segment, subtasks: [] }

  const items = match[2]
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')

  if (items.length < 2) return { titlePart: segment, subtasks: [] }
  return { titlePart: match[1], subtasks: items }
}
```

Replace `parseSegment` so the colon split happens first — a date inside the subtask list must not be pulled out of it — and so `every monday` sets both the recurrence and the first due date:

```ts
function parseSegment(
  segment: string,
  today: Date,
  firstDay: 'monday' | 'sunday',
): ParsedInputTask {
  const { titlePart, subtasks } = splitColonList(segment)

  const tagResult = matchTags(titlePart)
  const recurrenceResult = matchRecurrence(tagResult.rest)
  const timeResult = matchTime(recurrenceResult.rest)
  const dateResult = matchDate(timeResult.rest, today, firstDay)

  const date =
    dateResult.date ??
    (recurrenceResult.weekday === null
      ? null
      : nextWeekday(startOfDay(today), recurrenceResult.weekday, 0))

  return {
    title: tidy(dateResult.rest),
    notes: '',
    dueAt: buildDueAt(date, timeResult.time, today),
    subtasks,
    tagNames: tagResult.tagNames,
    recurrence: recurrenceResult.recurrence,
  }
}
```

And replace the entry point so it splits into segments:

```ts
export function parseTaskInput(
  text: string,
  today: Date,
  firstDay: 'monday' | 'sunday',
): ParsedInputTask[] | null {
  const trimmed = text.trim()
  if (trimmed === '') return null

  const segments = trimmed
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter((s) => s !== '')

  const tasks = segments
    .map((segment) => parseSegment(segment, today, firstDay))
    .filter((task) => task.title !== '')

  return tasks.length > 0 ? tasks : null
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/todos/input.test.ts`
Expected: PASS, all cases from Tasks 5 and 6.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/features/todos/input.ts src/features/todos/input.test.ts
git commit -m "feat: parse subtasks, recurrence and tags locally in task input"
```

---

### Task 7: Local parser — the escalation decision

The boundary that decides whether the network is touched at all.

**Files:**
- Modify: `src/features/todos/input.ts`, `src/features/todos/input.test.ts`

**Interfaces:**
- Produces: `parseTaskInput` now returns `null` for inputs the AI should handle.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/todos/input.test.ts`:

```ts
describe('escalation to the AI', () => {
  const escalates = (text: string) => parseTaskInput(text, TODAY, 'monday') === null

  it('escalates a question', () => {
    expect(escalates('what should I do about the party?')).toBe(true)
  })

  it('escalates a planning verb', () => {
    expect(escalates('plan a birthday party for next saturday')).toBe(true)
    expect(escalates('help me get ready for the trip')).toBe(true)
    expect(escalates('organize my week')).toBe(true)
    expect(escalates('brainstorm gift ideas')).toBe(true)
    expect(escalates('suggest some meals')).toBe(true)
  })

  it('escalates long unstructured prose', () => {
    expect(
      escalates('i really need to get my whole life in order before the summer arrives'),
    ).toBe(true)
  })

  it('does not escalate a short bare task', () => {
    expect(escalates('buy milk')).toBe(false)
  })

  it('does not escalate long text that has structure', () => {
    expect(
      escalates('remember to call the dentist about the appointment tomorrow at 09:30'),
    ).toBe(false)
  })

  it('escalates empty input', () => {
    expect(escalates('   ')).toBe(true)
  })

  it('is not fooled by a planning verb inside the sentence', () => {
    expect(escalates('buy plan tickets')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/features/todos/input.test.ts`
Expected: FAIL on the escalation cases.

- [ ] **Step 3: Implement**

Add to `src/features/todos/input.ts`:

```ts
const PLANNING_VERBS = [
  'plan',
  'help',
  'organize',
  'organise',
  'brainstorm',
  'suggest',
  'ideas for',
  'what should',
]

const MAX_UNSTRUCTURED_WORDS = 8

function hasStructure(task: ParsedInputTask): boolean {
  return (
    task.dueAt !== null ||
    task.subtasks.length > 0 ||
    task.tagNames.length > 0 ||
    task.recurrence !== null
  )
}
```

And gate the entry point:

```ts
export function parseTaskInput(
  text: string,
  today: Date,
  firstDay: 'monday' | 'sunday',
): ParsedInputTask[] | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  if (trimmed.endsWith('?')) return null

  const lower = trimmed.toLowerCase()
  if (PLANNING_VERBS.some((verb) => lower.startsWith(`${verb} `))) return null

  const segments = trimmed
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter((s) => s !== '')

  const tasks = segments
    .map((segment) => parseSegment(segment, today, firstDay))
    .filter((task) => task.title !== '')

  if (tasks.length === 0) return null

  const wordCount = trimmed.split(/\s+/).length
  if (!tasks.some(hasStructure) && wordCount > MAX_UNSTRUCTURED_WORDS) return null

  return tasks
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, the whole suite.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/features/todos/input.ts src/features/todos/input.test.ts
git commit -m "feat: decide locally when Smart Add needs the AI"
```

---

### Task 8: Tag pills in the preview card

**Files:**
- Create: `src/components/daily-plan/pending-tag-pill.tsx`, `src/components/daily-plan/pending-tag-editor.tsx`
- Modify: `src/components/daily-plan/task-preview-card.tsx`

**Interfaces:**
- Consumes: `PendingTag` (foundation Task 6), `TagColorSwatches` (Task 3), `tagColorsFor` from `@/themes/tag-color`.
- Produces:
  - `PendingTagPill({ tag: PendingTag, onPress: () => void })`
  - `PendingTagEditor({ visible, tag, onChangeColor, onRemove, onClose })`
  - `TaskPreviewCard` prop type changes from `tasks: ParsedTodo[]` to `tasks: PlanTask[]`, and gains `onChangeTags: (taskIndex: number, tags: PendingTag[]) => void`.

- [ ] **Step 1: Create `pending-tag-pill.tsx`**

Mirrors `src/components/tag-pill.tsx`, with one difference: an unsaved tag (`tagId === null`) gets a dashed border so it is visibly "new".

```tsx
type PendingTagPillProps = {
  tag: PendingTag
  onPress: () => void
}

export function PendingTagPill({ tag, onPress }: PendingTagPillProps) {
  // palette = tagColorsFor(resolvedTheme)[tag.color]
  // Pressable pill: background palette.background, text palette.text,
  // borderRadius theme.radius.full, typography.meta fontSize 10.
  // When tag.tagId === null: borderWidth 1, borderStyle 'dashed',
  // borderColor palette.text.
}
```

- [ ] **Step 2: Create `pending-tag-editor.tsx`**

`Modal` following `src/components/edit-list-sheet.tsx`.

```tsx
type PendingTagEditorProps = {
  visible: boolean
  tag: PendingTag | null
  onChangeColor: (color: TagColor) => void
  onRemove: () => void
  onClose: () => void
}

export function PendingTagEditor({ visible, tag, onChangeColor, onRemove, onClose }: PendingTagEditorProps) {
  // header: tag.name, plus "Will be created" in typography.meta / text2
  //   when tag.tagId === null, and nothing when it already exists
  // body: <TagColorSwatches selected={tag.color} onSelect={onChangeColor} />
  // footer: a destructive "Remove tag" Pressable calling onRemove then onClose
  // renders null when tag is null
}
```

Recolouring a tag that already exists changes it **only for this proposed task**, not the saved tag — the saved tag keeps its colour until the user edits it in Settings. Do not call `tag-store` from here.

- [ ] **Step 3: Wire into `task-preview-card.tsx`**

Change the props to `PlanTask[]` plus `onChangeTags`. Under each task's title, render a wrapping row of `PendingTagPill`s. Tapping one sets local state `{ taskIndex, tagIndex }` and opens the editor; the editor's callbacks rebuild that task's tag array and call `onChangeTags(taskIndex, next)`.

Use `flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap: theme.spacing.micro` — the same flex-wrap approach as commit `25ea071` used for the search tag chips.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output. `ChatMessageBubble` will also need its `message.tasks` pass-through updated.

- [ ] **Step 5: Manual smoke check**

Send "finish report #work #urgent" and confirm two dashed pills appear under the task. Tap one: the editor opens, changing the colour updates the pill immediately, and Remove takes the pill away. Create a tag named `work` in Settings first, then repeat — that pill should now render solid, not dashed, and in the saved tag's colour.

- [ ] **Step 6: Commit**

```bash
git add src/components/daily-plan/pending-tag-pill.tsx src/components/daily-plan/pending-tag-editor.tsx src/components/daily-plan/task-preview-card.tsx src/components/daily-plan/chat-message-bubble.tsx
git commit -m "feat: review and recolour proposed tags before creating tasks"
```

---

### Task 9: Local-first routing, tag creation, and degradation

The task that ties everything together.

**Files:**
- Modify: `src/hooks/use-daily-plan-chat.ts`

**Interfaces:**
- Consumes: `parseTaskInput` (Tasks 5–7), `resolveTags` (Task 1), `createTodo` with `tagIds` (Task 4), `useTagStore.createTag`, `updateTodo` for recurrence.
- Produces: no signature change to `useDailyPlanChat()`.

- [ ] **Step 1: Route through the parser first**

In `send()`, replace the unconditional `smartAddChat` call:

```ts
const isFirstMessage = messages.length === 0
const local = isFirstMessage
  ? parseTaskInput(trimmed, new Date(), firstDayOfWeek)
  : null

if (local !== null) {
  const tasks: PlanTask[] = local.map((task) => ({
    title: task.title,
    notes: task.notes,
    dueAt: task.dueAt,
    subtasks: task.subtasks,
    tags: resolveTags(task.tagNames, tagsById),
    recurrence: task.recurrence,
  }))

  // A tiny delay so the instant local answer does not feel jarring
  // next to the AI path, which shows the same typing indicator.
  await new Promise((resolve) => setTimeout(resolve, 250))

  appendMessage({ role: 'ai', text: localReply(tasks), tasks })
  return
}
```

Follow-ups always go to the AI: the parser has no conversational state, so `isFirstMessage` gates it.

`localReply` is a small local helper:

```ts
function localReply(tasks: PlanTask[]): string {
  if (tasks.length === 1) {
    return tasks[0].dueAt ? 'Got it — 1 task with a due date.' : 'Got it — 1 task.'
  }
  return `Found ${tasks.length} tasks.`
}
```

It never asks a question or offers an opinion — anything conversational is the AI's job.

- [ ] **Step 2: Degrade instead of erroring**

Wrap the AI call so no failure — 429 included — surfaces as a red error:

```ts
try {
  const result = await smartAddChat(toAiHistory(messages), trimmed, existingTagNames)
  appendMessage({
    role: 'ai',
    text: result.message,
    tasks: result.todos.map((todo) => ({
      title: todo.title,
      notes: todo.notes,
      dueAt: todo.dueAt,
      subtasks: todo.subtasks,
      tags: resolveTags(todo.tags, tagsById),
      recurrence: null,
    })),
  })
} catch {
  appendMessage({
    role: 'ai',
    text: 'I could not work that one out — try something like "call mom tomorrow at 5".',
  })
}
```

`existingTagNames` is `useMemo(() => Object.values(tagsById).map((t) => t.name), [tagsById])`.

Leave `setError` for genuine app problems only — the "create a list first" case. The `error` field stays in the hook's return type; it is simply no longer set from the AI path.

- [ ] **Step 3: Create tags and todos on confirm**

Replace `createTasks()`:

```ts
const createTag = useTagStore((s) => s.createTag)
const updateTodo = useTodoStore((s) => s.updateTodo)

// inside createTasks():
const idByName = new Map<string, string>()

function tagIdFor(tag: PendingTag): string {
  const key = tag.name.toLowerCase()
  const cached = idByName.get(key)
  if (cached) return cached

  // A tag deleted in Settings while this chat sat in history leaves a
  // stale id behind — treat it as new rather than writing a dead id.
  const stillExists = tag.tagId !== null && tagsById[tag.tagId] !== undefined
  const id = stillExists ? (tag.tagId as string) : createTag(tag.name, tag.color)

  idByName.set(key, id)
  return id
}

for (const task of latestTasks) {
  const parentId = createTodo({
    listId: defaultListId,
    title: task.title,
    notes: task.notes,
    dueAt: task.dueAt,
    tagIds: task.tags.map(tagIdFor),
  })

  if (task.recurrence !== null) {
    updateTodo(parentId, { recurrence: task.recurrence })
  }

  for (const subtaskTitle of task.subtasks) {
    createTodo({ listId: defaultListId, parentId, title: subtaskTitle })
  }
}
```

`idByName` is per-invocation, so one new tag name used by three tasks in the same batch is created once and shared.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test`
Expected: PASS.
Run: `npx tsc --noEmit 2>&1 | grep -v "^example/"`
Expected: no output.

- [ ] **Step 5: Manual smoke check — offline first**

Turn on airplane mode, then:
1. `Groceries: milk, eggs, bread` → one task, three subtasks, no error.
2. `call mom tomorrow at 5` → due tomorrow 17:00.
3. `gym every monday #health` → weekly recurrence, due next Monday, one dashed `health` pill.
4. `plan a birthday party for next saturday` → the plain fallback line, no red error.
5. Press Create on case 3 and confirm in Settings → Tags that exactly one `health` tag now exists, in the pill's colour, and that the todo carries it.

Then turn networking back on and confirm case 4 now returns a real AI plan.

- [ ] **Step 6: Verify the key is genuinely optional**

Temporarily blank `EXPO_PUBLIC_GEMINI_API_KEY` in `.env`, restart the dev server with `npm run dev:clear`, and repeat cases 1–3. All three must still work. Case 4 must show the fallback line rather than "Smart Add is not configured". Restore the key afterwards.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-daily-plan-chat.ts
git commit -m "feat: parse tasks locally first and fall back to AI only when needed"
```

---

## Done criteria for this plan

- `npm test` passes; `npx tsc --noEmit 2>&1 | grep -v "^example/"` is empty.
- Smart Add proposes tags; dashed pills mark tags that do not exist yet; tapping one recolours or removes it; nothing reaches `tag-store` until Create is pressed.
- A new tag name used by several tasks in one batch is created exactly once.
- With airplane mode on and the API key blanked, dates, times, subtasks, recurrence, and `#tags` all still parse.
- A 429 never renders as a red error.
