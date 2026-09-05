# Android Widget — Design Spec

## Purpose

Add a home screen widget for Android that shows today's todos and provides quick actions to create new tasks. Uses `react-native-android-widget` since `expo-widgets` is iOS-only.

## Widget Layout (Large — 4×3 cells)

```
┌─────────────────────────────────────┐
│ 📋 Planora — Today          + │ ✨ │
├─────────────────────────────────────┤
│ ○ Buy groceries              🏷 red │
│ ○ Fix deploy pipeline      🏷 blue │
│ ○ Call dentist                      │
│ ○ Review PR #42            🏷 blue │
│ ✓ Morning run (dimmed)    🏷 green │
│                                     │
│           3 more tasks →            │
└─────────────────────────────────────┘
```

- **Header**: App icon + "Today" label + "+" (Quick Add) + "✨" (Smart Add)
- **Body**: Scrollable list of today's todos (active first, completed dimmed at bottom)
- **Footer**: "N more tasks →" if list overflows, tapping opens the app's Today tab
- **Empty state**: "No tasks for today — enjoy your day!" with "+" button prominent

## Data Flow

### Reading todos (widget → AsyncStorage)

The widget task handler reads directly from AsyncStorage:

1. Read key `"todo"` → get `todosById` (Zustand persisted state)
2. Read key `"lists"` → get `listsById` for list names/colors
3. Read key `"tags"` → get `tagsById` for tag colors
4. Filter: `dueAt?.startsWith(todayDateString)` (same logic as `getTodayTodos`)
5. Sort: active todos first (by position), completed at bottom
6. Render widget with filtered data

### Updating widget (app → widget)

Call `requestWidgetUpdate()` when:
- A todo is created, updated, toggled, or deleted (in `todo-store.ts`)
- App returns to foreground (in case external changes happened)
- Periodic fallback: `updatePeriodMillis: 1800000` (30 min)

### Click Actions

| Element | Action | Deep Link |
|---------|--------|-----------|
| "+" button | Open Quick Add | `cozytodo://quick-add` |
| "✨" button | Open Smart Add | `cozytodo://smart-add` |
| Todo row | Open todo detail | `cozytodo://todo/{todoId}` |
| Footer "N more →" | Open Today tab | `cozytodo://` |

## Deep Link Routes

New routes needed in expo-router:

- `src/app/quick-add.tsx` — triggers `QuickAddModal` open and navigates to Today tab
- `src/app/smart-add.tsx` — navigates to the Smart Add/Daily Plan chat screen

The `cozytodo://todo/[todoId]` route already exists at `src/app/todo/[todoId].tsx`.

## Theming

The widget uses the app's dark theme (most common for widgets):
- Background: `#1e2119` (surface)
- Text: `#e8e4da` (primary), `#9a9689` (secondary)
- Accent: `#8bab7a` (green)
- Font: Manrope (bundled via config plugin `fonts` option)

No dynamic light/dark switching — Android widgets don't support `prefers-color-scheme`. We pick dark to match the app's default.

## Files to Create/Modify

### New files
- `src/widgets/TodoTodayWidget.tsx` — widget component (FlexWidget/TextWidget/ListWidget)
- `src/widgets/widget-task-handler.ts` — reads AsyncStorage, renders widget
- `src/widgets/widget-utils.ts` — shared helpers (date filtering, data reading)
- `src/app/quick-add.tsx` — deep link route for Quick Add
- `src/app/smart-add.tsx` — deep link route for Smart Add
- `index.ts` — custom entry point (registers widget task handler + expo-router)
- `assets/fonts/Manrope-Regular.ttf` etc. — font files for widget

### Modified files
- `app.json` — add `react-native-android-widget` plugin config
- `package.json` — change `main` to `./index.ts`, add dependency
- `src/stores/todo-store.ts` — call `requestWidgetUpdate()` after mutations

## Config Plugin (app.json)

```json
["react-native-android-widget", {
  "fonts": ["./assets/fonts/Manrope-Regular.ttf", "./assets/fonts/Manrope-SemiBold.ttf"],
  "widgets": [{
    "name": "TodoToday",
    "label": "Planora — Today",
    "description": "Shows today's tasks with quick add actions",
    "minWidth": "250dp",
    "minHeight": "180dp",
    "targetCellWidth": 4,
    "targetCellHeight": 3
  }]
}]
```

## Entry Point (index.ts)

Registers the widget task handler alongside expo-router:

```
registerWidgetTaskHandler(widgetTaskHandler)
import 'expo-router/entry'  // must be last
```

## Constraints

- **No hooks** in widget components — pure functions only
- **`'use no memo'`** at top of widget files (React Compiler is enabled)
- **Dev build required** — no Expo Go support
- **Widget JS context** is separate from app — no store subscriptions, only AsyncStorage reads
- **ListWidget** for scrollable todo list (not FlexWidget with overflow)
- **updatePeriodMillis** minimum is 30 minutes (Android OS limit)

## Out of Scope

- iOS widget (future work with `expo-widgets`)
- Widget configuration/settings screen
- Multiple widget sizes (start with Large only)
- Widget preview image (can add later)
- Resizable widget
