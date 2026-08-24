# Daily Plan: tags, chat history, persistent state, local-first parsing, and file split

Date: 2026-08-24
Status: approved design, not yet implemented

## Problem

`src/app/daily-plan.tsx` is 947 lines and holds four separate concerns. Three
user-facing problems come out of it:

1. **Smart Add cannot tag anything.** Tags already exist as a first-class model
   (`Tag = { id, name, color, createdAt }`, a persisted `tag-store`, a
   `tag-picker`, a `tag-pill`, and a palette in `src/themes/tag-color.ts`), and
   todos already carry `tagIds`. Smart Add simply never touches any of it:
   `ParsedTodo` has no tag field and `createTodo()` does not accept `tagIds`.
2. **Chat context is lost on navigation.** `daily-plan` is a Stack screen pushed
   over the tabs, and all chat state lives in `useState` inside the route
   component. Switching tabs unmounts the screen and discards the conversation.
3. **No way back into an old chat.** Once a chat is cleared or turned into
   tasks, it is gone.

Problems 2 and 3 have the same root cause and the same fix.

## Goals

- Smart Add proposes tags; the user reviews them before anything is written.
- Chat survives tab switches and app restarts.
- Past chats are browsable and resumable with full AI context.
- Smart Add keeps working with no API key, no network, and no quota.
- `daily-plan.tsx` drops to a thin composition file.

## Non-goals

Chat search, renaming chats, cloud sync, streaming responses, per-tag icons,
and React Native component tests (the repo has none today).

Also explicitly rejected: **a "requests remaining today" countdown badge.** The
Gemini API returns no remaining-quota header, so any counter is a local guess
that drifts (the free tier resets on Pacific time, not local midnight, and the
per-model daily limit is not published in the response). More importantly, with
local-first parsing below, the quota stops being something the user bumps into.
The badge would be a nicer sign on a wall we are removing.

## Step 0 — immediate fixes

Independent of everything else, landed first so the app works today:

1. `src/lib/smart-add.ts:70` pins `gemini-2.5-flash`, which now returns 429
   (`RESOURCE_EXHAUSTED`, free-tier limit 20 requests/day) and whose `-lite`
   sibling returns 404 "no longer available to new users". Move to
   `gemini-3.5-flash`, hoisted into a `GEMINI_MODEL` constant. Verified working
   against the project's own key with the exact request shape used here.
2. `src/lib/smart-add.ts:83` throws `AI error: ${rawBody}`, dumping Google's
   whole JSON error into the chat error line — unreadable, and the direct cause
   of a bug report that read only as "error code 29". Parse the body and map:
   429 to a daily-limit sentence, 400/403 to an invalid-key sentence, anything
   else to `error.message`, unparseable bodies to the existing generic string.

After the local parser lands, most of these errors stop being user-visible at
all (see degradation rules below), but the parsing still matters for logs.

## Approach

Every chat — including the one in progress — is a record in a single persisted
zustand store. The "active" chat is just the one whose id is `activeChatId`.
This gives tab-switch survival, restart survival, and the history list from one
source of truth.

Parsing follows the same instinct: a local, pure parser is the floor that always
runs, and the hosted model is reached only for what that parser declines. The
API key becomes optional rather than required.

Rejected: keeping the active chat in memory with a separate persisted archive
(two shapes for the same thing; a crash loses the draft), and moving the route
inside the tab navigator so it never unmounts (fixes only the tab-switch
symptom, gives no history, dies on restart).

## Data model

New file `src/features/daily-plan/types.ts`:

```ts
export type PlanChatId = string

/** A tag attached to a proposed task. tagId === null means "create on confirm". */
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
  recurrence: Recurrence | null   // local parser only; the AI never sets this
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

The unsent input-box text lives as a single `draft` string at the **store root**,
not on `PlanChat`. Only one input exists at a time, and keeping it off the chat
record is what lets chats stay lazily created: typing a half-sentence and
navigating away preserves the text without conjuring an empty chat to hold it.

## Boundaries

`src/lib/smart-add.ts` stays a **parser**. Its `ParsedTodo` gains
`tags: string[]` — the raw names the model wrote, nothing more. It knows
nothing about `TagId`, colors, or app state.

Turning names into `PendingTag`s is a pure function elsewhere:

```ts
// src/features/daily-plan/resolve-tags.ts
export function resolveTags(
  names: string[],
  tagsById: Record<TagId, Tag>,
): PendingTag[]
```

Rules, in order:

1. Trim each name, collapse internal whitespace, drop empties.
2. Dedupe case-insensitively within the task, keeping first occurrence.
3. Cap at 3 tags per task.
4. Match an existing tag by lowercased name. On a hit, reuse its real `id`,
   its stored display `name`, and its stored `color`.
5. On a miss, emit `tagId: null` with the trimmed name and a color chosen by
   `TAG_COLORS[hash(lowercasedName) % TAG_COLORS.length]`, where `hash` is a
   simple deterministic char-code sum. The same name therefore always gets the
   same color, across chats and across app restarts.

Nothing is written to `tag-store` at resolve time.

## AI contract

Three changes to `src/lib/smart-add.ts`:

- The JSON schema in the system prompt gains `"tags": ["string"]` per todo.
- The prompt injects the user's existing tag names so the model prefers reusing
  `work` over inventing `job`.
- A rule: 0-3 short lowercase tags per task; omit rather than invent.

Defensive parsing matches the existing style — if `tags` is missing or is not
an array of strings, it becomes `[]`.

Chat history is sent back to the model as raw names. A small mapper
`toAiHistory(messages: PlanChatMessage[]): ChatMessage[]` in
`src/features/daily-plan/ai-history.ts` flattens `PendingTag[]` back to
`string[]`, keeping `smart-add.ts` free of app types.

## Local-first parsing

> **Superseded 2026-08-24:** the local parser described below was removed at the
> user's request in favour of an LLM-only Daily Plan — every message now goes
> straight to Smart Add. The tags work in this spec was kept. The section is
> left intact as a record of the original design.

`src/features/todos/input.ts` exists in the repo as an empty file. It gets
filled in and becomes the **floor** of Smart Add, not a fallback: every input is
parsed locally first, and the AI is reached only for what the parser declines.
This makes the API key optional — the app works with no key, no network, and no
quota, just less cleverly.

The calendar maths already exists in `src/lib/date-utils.ts` (`startOfDay`,
`addDays`, `startOfWeek`, `toDateString`, `isToday`, `isTomorrow`) and
`src/lib/recurrence.ts` (`computeNextDueDate`). The parser composes those; it
does not reimplement date logic.

```ts
export function parseTaskInput(
  text: string,
  today: Date,
  firstDay: FirstDayOfWeek,
): PlanTask[] | null   // null === "I decline, escalate to AI"
```

Pure, no store access, no `new Date()` inside — `today` is injected so tests are
deterministic. Tags come back as raw names and go through the same
`resolveTags()` as the AI path, so colors, dedupe, and the 3-tag cap behave
identically no matter which path produced them.

### The supported phrase list

This list is the contract. Anything outside it is not "unsupported" — it
escalates to the AI. Keeping the list short and explicit is what stops the
parser from growing into a date library.

**Splitting into tasks**
- Newline separates tasks.
- `;` separates tasks.
- `and` does **not** split — too ambiguous ("bread and butter" is one item).

**Subtasks**
- `Title: a, b, c` — a colon followed by two or more comma-separated items
  becomes a title plus subtasks.
- Commas with no colon do not split. `milk, eggs, bread` stays one title.

**Dates** (matched case-insensitively, then stripped from the title)
- `today`, `tonight` (today at 20:00)
- `tomorrow`
- `<weekday>` — next future occurrence, today excluded
- `next <weekday>` — the occurrence in the following week
- `next week` — start of next week, honouring the user's `firstDay` setting
- `this weekend`, `next weekend` — Saturday
- `in N days`, `in N weeks`
- `end of month`
- `YYYY-MM-DD`
- Numeric forms like `3/4` are **not** supported — locale-ambiguous.

**Times** (stripped from the title, applied to the parsed date, else to today)
- `at HH:mm`, `HH:mm`, `at H`, `at Ham`, `at Hpm`
- With a time, `dueAt` is `YYYY-MM-DDTHH:mm:00`; without, plain `YYYY-MM-DD` —
  matching the existing convention `isDateOnly()` relies on.

**Recurrence**
- `daily`, `every day`, `weekly`, `every week`, `monthly`, `every month`,
  `yearly`, `every year`
- `every N days|weeks|months` — sets `interval`
- `every <weekday>` — weekly, with the first `dueAt` on that weekday

`Recurrence` has no weekday field, so `every monday` is expressed as weekly plus
a first due date. `CreateTodoInput` does not accept recurrence and does not need
to: the create handler calls the existing `updateTodo(id, { recurrence })` after
creating the todo. No store surface change.

**Tags**
- `#name` only. No keyword-to-tag guessing locally — it is wrong often enough to
  be annoying, and it is exactly what the AI is good at.

### When the parser declines

`parseTaskInput` returns `null` — escalate — when any of:

- the text ends with `?`
- it opens with a planning verb: `plan`, `help`, `organize`, `brainstorm`,
  `suggest`, `ideas for`, `what should`
- no structure was found (no date, time, colon-list, recurrence, or tag) **and**
  the text is longer than 8 words — a long bare sentence is a request, not a
  title

It does **not** decline for a short bare sentence. `buy milk` is one task with
no due date, handled locally, no network.

Separately, **any message in an already-started chat goes straight to the AI.**
Refinement ("no, move that to Friday and drop the last one") is conversational
by nature and the parser has no conversational state. The parser owns the first
message of a chat; the AI owns the rest.

### Degradation

- The AI is attempted only when a key is configured and the parser declined.
- Any AI failure — 429, offline, malformed JSON — falls back to the local result
  if one exists. Since the AI is only called when the parser declined, usually
  none does; in that case the chat shows a plain, non-red hint:
  "I could not work that one out — try something like *call mom tomorrow at 5*."
- A 429 never surfaces as a red error. Running out of quota degrades the feature,
  it does not break it.

### Keeping the AI feel

The local path still produces a normal `PlanChatMessage` with `role: 'ai'` and a
short canned line varied by what it found ("Got it — 1 task for tomorrow.",
"Found 3 items."), rendered through the same bubbles and preview card. The
existing typing indicator stays, with a small artificial delay (~250 ms) so the
instant local response does not feel jarring next to the AI path.

The canned lines never pretend to converse — no follow-up questions, no opinions.
The parser reports what it found; anything conversational is the AI's job.

## Store

New `src/stores/daily-plan-store.ts`, persisted to AsyncStorage under the name
`daily-plan`, following the existing `tag-store` / `list-store` pattern
including the `hasHydrated` flag.

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

Lifecycle:

- Chats are created **lazily**. `ensureActiveChat()` runs on first send, so an
  opened-and-abandoned screen never leaves an empty chat behind.
- `title` is derived on the first user message: trimmed, whitespace-collapsed,
  sliced to 60 chars with an ellipsis. Fallback `'Untitled plan'`.
- `finishActiveChat(n)` records `createdTodoCount += n`, stamps `updatedAt`,
  sets `activeChatId = null`, then prunes.
- `startNewChat()` deletes the active chat if it has no messages, then sets
  `activeChatId = null`.
- `resumeChat(id)` sets `activeChatId = id`. If a different chat was active and
  is empty, it is deleted.
- **Retention**: keep the 30 most recently updated chats; prune the rest. The
  active chat is never pruned.

History ordering lives in pure helpers so it can be tested without the store:

```ts
// src/features/daily-plan/chat-history.ts
export function deriveChatTitle(text: string): string
export function sortChatsByRecency(chatsById): PlanChat[]
export function pruneChats(chatsById, activeChatId, max): Record<PlanChatId, PlanChat>
```

## Creating todos

`CreateTodoInput` in `src/stores/todo-store.ts` gains `tagIds?: string[]`,
defaulting to `[]` on the created `Todo`.

The confirm handler in `use-daily-plan-chat.ts`:

1. Collect every `PendingTag` across the tasks being created.
2. For each with `tagId !== null`, verify the id still exists in `tagsById` — a
   tag deleted from Settings while the chat sat in history is downgraded to a
   new tag.
3. Create each distinct missing name **once**, keyed by lowercased name, and
   reuse that id across all tasks in the batch.
4. Create each parent todo with its resolved `tagIds`, then its subtasks.
5. Call `finishActiveChat(count)` and show the existing success message.

If no list exists, `defaultListId` is empty; show the existing inline chat error
instead of letting `createTodo` throw.

## UI

Preview card: each proposed task renders its tags as pills. Existing tags use
the normal `TagPill` look. Tags that will be created get a dashed border, so
what is new is visible at a glance. Tapping a pill opens `PendingTagEditor` — a
RN `Modal` following the `edit-list-sheet.tsx` pattern — with the eight color
swatches and a Remove button. Edits write back through `setTaskTags`.

History: a clock icon in the header opens `ChatHistorySheet`, also a RN
`Modal`. Rows show title, relative date, and task count
(`4 tasks`, or `Draft` when `createdTodoCount === 0`). Tap resumes; long-press
deletes with a confirm `Alert`, matching `edit-list-sheet.tsx`.

Cleanup taken on the way: the eight-swatch color row is currently duplicated
inline in `tag-picker.tsx` and `settings/tags.tsx`. It is extracted to
`src/components/tag-color-swatches.tsx` and reused in both plus
`PendingTagEditor`, rather than written a third time.

## File layout

```
src/app/daily-plan.tsx                     ~100 lines, composition only
src/components/daily-plan/
  plan-hero.tsx                            greeting, date, clock, weather, count
  plan-section-label.tsx
  plan-todo-row.tsx
  plan-backlog-row.tsx
  chat-empty-state.tsx                     Smart Add intro + example prompts
  chat-message-bubble.tsx
  task-preview-card.tsx
  pending-tag-pill.tsx
  pending-tag-editor.tsx
  chat-input-bar.tsx
  chat-history-sheet.tsx
src/components/tag-color-swatches.tsx      extracted, shared
src/hooks/use-daily-plan-chat.ts           send, resolve, create, archive
src/features/daily-plan/
  types.ts
  resolve-tags.ts
  chat-history.ts
  ai-history.ts
src/features/todos/input.ts                local parser (file exists, empty)
src/stores/daily-plan-store.ts
```

The keyboard handling fixed earlier in `daily-plan.tsx` (KeyboardAvoidingView
`behavior="padding"`, keyboard show/hide listeners, scroll-to-end, collapsing
safe-area padding) moves into the composition file and `chat-input-bar.tsx`
with no behavior change. Do not regress it.

## Testing

Vitest on pure logic only, matching the existing convention
(`selectors.test.ts`, `todo-store.test.ts`, `date-utils.test.ts`):

- `resolve-tags.test.ts` — existing-tag match by case-insensitive name; unknown
  name gets `tagId: null`; color is stable for the same name across calls;
  dedupe; 3-tag cap; empty and whitespace-only names dropped.
- `chat-history.test.ts` — title derivation including truncation and fallback;
  recency sort; prune keeps 30 and never drops the active chat.
- `daily-plan-store.test.ts` — lazy creation, draft persistence, append,
  `setTaskTags`, finish resets `activeChatId` and records the count, resume,
  empty-chat cleanup.
- `input.test.ts` — one case per supported phrase, with `today` injected so
  results are deterministic; plus a decision table for escalation (declines on
  `?`, planning verbs, and long unstructured text; does not decline on
  `buy milk`); plus title-stripping (the date and time phrases must not survive
  into the title).

## Implementation order

Five phases, each independently shippable and verifiable:

1. **Step 0** — model constant + readable errors. Unblocks the app immediately.
2. **Extraction** — split `daily-plan.tsx` into the component/hook/feature files
   with no behavior change. Landing this before the features keeps every later
   diff small and reviewable.
3. **Store** — `daily-plan-store` plus its pure helpers, wired to replace the
   route's `useState`. Fixes the tab-switch context loss on its own.
4. **History** — `ChatHistorySheet` and the lifecycle actions. Depends on 3.
5. **Tags + local parser** — `resolveTags`, the AI contract change, `input.ts`,
   the preview-card tag UI, and `tagIds` on `CreateTodoInput`. Largest phase;
   the parser and the tag work share the `PlanTask` shape, so they land together.

Phase 2 must not regress the keyboard fix already in `daily-plan.tsx`.

## Edge cases

- Model returns duplicate or oddly-cased tag names — handled by `resolveTags`.
- Tag deleted in Settings while the chat sits in history — stale `tagId` is
  downgraded to a new tag at create time.
- Same new tag name on several tasks in one batch — created once, id shared.
- No lists exist — inline chat error, no throw.
- Store not yet hydrated — chat area renders nothing until `hasHydrated`.
- No API key configured — the parser handles everything; declined inputs show
  the plain hint rather than an error. The feature is never "unavailable".
- Free-tier quota exhausted mid-chat — the 429 degrades to the hint, never a red
  error, and the next first-message-of-a-chat is still parsed locally.
- A parsed recurrence is applied via `updateTodo(id, { recurrence })` after
  create, since `CreateTodoInput` has no recurrence field.
- Ambiguous numeric dates (`3/4`) are deliberately not parsed; they fall through
  to the AI, which has the context to disambiguate.
