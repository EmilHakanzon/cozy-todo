# Accent Color, Subtask Connectors, Task Reminders & Google Calendar Placeholder

## Overview

Four independent features for Planora, ordered by implementation dependency (none depend on each other — order is by complexity, simplest first):

1. **Accent color picker** — let users pick a global accent color from the existing list color palette
2. **Subtask connector lines** — visual nesting lines for inline subtasks
3. **Task reminders** — local notifications at a todo's due time via `expo-notifications`
4. **Google Calendar placeholder** — "Coming soon" screen replacing the disabled settings row

## Global Constraints

- Expo SDK 57 — read versioned docs at https://docs.expo.dev/versions/v57.0.0/
- Font: Manrope (400 Regular, 500 Medium, 600 SemiBold)
- Spacing: 4px grid via existing `spacing.ts` tokens
- Radius: existing `radius.ts` tokens
- Colors: existing `colors.ts` light/dark palettes, `list-color.ts` for list accents
- Path aliases: `@/*` -> `./src/*`
- Icons: `SymbolView` from `expo-symbols` with `SymbolViewProps['name']` type
- All new files use `useAppTheme()` hook
- No `any` types. No comments unless WHY is non-obvious.
- Stores use Zustand with AsyncStorage persistence

---

## Feature 1: Accent Color Picker

### Goal

Let users choose a global accent color that replaces the hardcoded sage green (`#525b57` light / `#91aa91` dark). The accent color applies everywhere `theme.color.accent` and `theme.color.accentSoft` are used — checkboxes, active tabs, highlights, badges.

### Design

**Color source:** Reuse the 6 colors from the existing `list-color.ts` palette: sage, terracotta, ochre, dustyBlue, lavender, taupe. Each already has light and dark mode variants with `accent` and `background` (which serves as `accentSoft`).

**Store change:** Add `accentColor: TodoListColor` (default `'sage'`) and `setAccentColor` to `settings-store.ts`. Persisted via AsyncStorage.

**Theme system change:**
- In `colors.ts`, export a function `buildAccentColors(color: TodoListColor, mode: 'light' | 'dark')` that returns `{ accent: string, accentSoft: string }` by looking up the list color palette. The `accent` value comes from `listColors[color].accent` and `accentSoft` from `listColors[color].background`.
- In `theme.ts`, change theme construction to accept an accent color parameter. The theme objects are no longer plain constants — they become functions or are rebuilt per-accent.
- In `use-app-theme.ts`, read `accentColor` from `useSettingsStore`, build the theme with the user's accent. This is the single integration point — every component downstream already reads `theme.color.accent`.

**Settings screen:** New file `src/app/settings/accent-color.tsx`:
- 2x3 grid of circles (40x40, `borderRadius: 20`)
- Each circle filled with the accent color from the list palette (light mode: `listColors[color].accent`, dark mode: `darkListColors[color].accent`)
- Active color shows a white checkmark overlay
- Tapping a circle calls `setAccentColor` and navigates back
- Follows the same pattern as `theme.tsx`, `first-day.tsx`

**Settings index:** Enable the "Accent color" row — remove `disabled`, add `onPress` navigation. Show a small colored circle as the value indicator instead of text.

### Files

- Modify: `src/stores/settings-store.ts` — add `accentColor`, `setAccentColor`
- Modify: `src/themes/colors.ts` — add `buildAccentColors()` function
- Modify: `src/themes/theme.ts` — parameterize theme construction with accent color
- Modify: `src/hooks/use-app-theme.ts` — read accent from settings, pass to theme builder
- Create: `src/app/settings/accent-color.tsx` — picker screen
- Modify: `src/app/settings/index.tsx` — enable accent color row

### Edge cases

- Default is `'sage'`, which matches the current hardcoded accent — existing users see no change
- The `TodoCheckbox` sage-green fill color may be hardcoded separately — verify and replace with `theme.color.accent`

---

## Feature 2: Subtask Connector Lines

### Goal

Show vertical + horizontal connector lines on the left side of subtasks when they appear inline (Today screen, detail screen), matching the design mockup. This is a visual-only change with no state or type changes.

### Design

**New component:** `src/components/subtask-group.tsx`

A wrapper that renders connector lines alongside a list of subtask items:
- A vertical line (1px wide, `theme.color.border` color) running down the left edge, from the first subtask to the last
- For each subtask, a horizontal tick (8px wide, same color) connecting the vertical line to the subtask's checkbox
- The subtask content is indented to the right of the connector area
- Total left indent: ~24px (16px for the connector area + 8px gap)

```
|           <- vertical line
|--- [x] Kitchen          <- horizontal tick + checkbox + label
|--- [ ] Bathroom
|--- [ ] Vacuum the floor
```

**Integration points:**
- `src/app/(tabs)/index.tsx` (Today screen) — when a todo has children and they're shown inline, wrap them with `SubtaskGroup` instead of rendering them as flat items
- `src/app/todo/[todoId].tsx` (Detail screen) — use `SubtaskGroup` in the subtasks section

The component takes children or a `subtasks` array and handles the line rendering via absolute-positioned `View` elements.

### Files

- Create: `src/components/subtask-group.tsx`
- Modify: `src/app/(tabs)/index.tsx` — use `SubtaskGroup` for inline subtasks
- Modify: `src/app/todo/[todoId].tsx` — use `SubtaskGroup` in subtask section

### Edge cases

- Single subtask: vertical line is just a dot/short segment — still render it for consistency
- Empty subtasks (only the "add subtask" input): don't render connectors
- Completed subtask's connector line uses same color as incomplete — the strikethrough on the text is the completion indicator

---

## Feature 3: Task Reminders

### Goal

Notify users at a todo's due time using local notifications via `expo-notifications`. Controlled by a global toggle in settings.

### Design

**Notification service:** New file `src/lib/notifications.ts` with:

```typescript
requestPermission(): Promise<boolean>
```
Calls `Notifications.requestPermissionsAsync()`. Returns true if granted.

```typescript
scheduleTodoReminder(todo: Todo): Promise<void>
```
If `todo.dueAt` is in the future and reminders are enabled:
- Cancel any existing notification with identifier `todo-${todo.id}`
- Schedule a new notification with:
  - `identifier`: `todo-${todo.id}`
  - `content.title`: todo title
  - `content.body`: list name or "Planora"
  - `trigger`: date trigger at `new Date(todo.dueAt)`

```typescript
cancelTodoReminder(todoId: string): Promise<void>
```
Cancels the notification with identifier `todo-${todoId}`.

```typescript
cancelAllReminders(): Promise<void>
```
Calls `Notifications.cancelAllScheduledNotificationsAsync()`.

```typescript
rescheduleAllReminders(todosById: Record<string, Todo>): Promise<void>
```
Cancels all, then schedules reminders for every incomplete todo with a future `dueAt`. Called when reminders are toggled on.

**Store changes:**

`settings-store.ts`:
- Add `remindersEnabled: boolean` (default `false`)
- Add `setRemindersEnabled: (value: boolean) => void`

`todo-store.ts` — add notification side effects:
- `createTodo`: if `dueAt` is set, call `scheduleTodoReminder`
- `updateTodo`: if `dueAt` changed, call `scheduleTodoReminder` (reschedules) or `cancelTodoReminder` (if cleared)
- `toggleTodo`: if completing, call `cancelTodoReminder`; if uncompleting and `dueAt` is future, call `scheduleTodoReminder`
- `deleteTodo`: call `cancelTodoReminder`

Side effects are fire-and-forget (no await in the synchronous store actions). The notification service functions handle errors internally.

**Settings screen:** New file `src/app/settings/reminders.tsx`:
- "Enable reminders" row with a toggle switch
- When toggling on: calls `requestPermission()`. If denied, shows an alert explaining how to enable in system settings. If granted, calls `rescheduleAllReminders`.
- When toggling off: calls `cancelAllReminders()`
- If permission was previously denied, show a note: "Notifications are disabled in system settings"

**Settings index:** Enable the "Reminders" row — remove `disabled`, add `onPress` navigation, show "On"/"Off" as value.

**Expo configuration:** `expo-notifications` requires `expo install expo-notifications` and a notification handler setup in `_layout.tsx`:
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})
```

### Files

- Install: `expo-notifications`
- Create: `src/lib/notifications.ts` — scheduling service
- Modify: `src/stores/settings-store.ts` — add `remindersEnabled`
- Modify: `src/stores/todo-store.ts` — notification side effects
- Create: `src/app/settings/reminders.tsx` — toggle screen
- Modify: `src/app/settings/index.tsx` — enable reminders row
- Modify: `src/app/_layout.tsx` — notification handler setup

### Edge cases

- Todo with `dueAt` in the past: don't schedule a notification
- Recurring tasks: when a recurring task is "completed" (its due date advances), schedule a new reminder for the next occurrence
- App is killed: `expo-notifications` local notifications fire from the OS, not the app process — they work even when the app is closed
- Permission denied: store `remindersEnabled` as true (user intent) but don't schedule. If permission is later granted via system settings, reminders won't auto-schedule — the user would need to toggle off/on. This is acceptable for v1.

### Not included (future)

- Overdue reminders (a second notification N minutes/hours after due time)
- Daily plan digest notification
- Sound/vibration customization
- Snooze from notification action

---

## Feature 4: Google Calendar Placeholder

### Goal

Replace the disabled "Google Calendar — Not connected" settings row with a tappable row that opens a "Coming soon" informational screen.

### Design

**Settings screen:** New file `src/app/settings/google-calendar.tsx`:
- Back button + "Google Calendar" title (follows existing settings screen pattern)
- Large calendar icon centered
- "Coming soon" heading
- Brief description: "Connect your Google Calendar to see events alongside your tasks. We'll let you know when this feature is ready."
- No interactive elements beyond the back button

**Settings index:** Enable the Google Calendar row — remove `disabled`, add `onPress` navigation. Keep value as "Not connected".

### Files

- Create: `src/app/settings/google-calendar.tsx`
- Modify: `src/app/settings/index.tsx` — enable Google Calendar row

---

## Implementation Order

1. Accent color picker (no dependencies, establishes theme pattern)
2. Subtask connector lines (no dependencies, visual only)
3. Task reminders (installs new dependency, most complex)
4. Google Calendar placeholder (trivial, can be done anytime)

Each feature is independently testable and committable.
