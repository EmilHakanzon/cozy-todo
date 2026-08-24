# Daily Plan foundation — on-device verification checklist

Branch: `feat/daily-plan-foundation` (15 commits off `master` at `25ea071`).

**Why this file exists.** 109 passing vitest tests and a clean `tsc` prove nothing about runtime here. This repo has no React Native component tests by design, so every UI behaviour below is unverified until a human runs it. Nothing on this branch should be trusted until these pass.

Run on a **physical Android device**, not an emulator — Expo SDK 54+ forces edge-to-edge, and emulator keyboard behaviour differs from real hardware in exactly the area this branch touches.

```
npm run dev
```

---

## 1. Does Smart Add work at all — do this first

Send one real message in Daily Plan.

- [ ] A reply comes back and tasks are proposed.

This single check is the entire premise of commit `00e5370`. `gemini-3.5-flash` was verified against your key directly, but if it ever stops resolving, `formatGeminiError` falls through to its default branch and prints Google's raw message into the chat — the original reported bug, unfixed, with a completely green test suite.

- [ ] Force an error (turn off wifi mid-send). The chat shows a readable sentence, **not** a wall of JSON.

## 2. Android keyboard — the highest-risk area

This is the bug fixed at the very start of the session, and the code moved between four files during the refactor.

- [ ] Tap the input. The bar sits directly above the keyboard, not behind it.
- [ ] No dead gap between the bar and the keyboard.
- [ ] Opening the keyboard scrolls the chat so the latest message stays visible.
- [ ] Dragging the chat dismisses the keyboard.
- [ ] **Sending scrolls to the new bubble.** Check this one carefully — the implementation changed during the refactor from two fixed 100 ms timeouts to `onContentSizeChange`, and the replacement is gated on `hasChatContent`, which flips `false → true` in the same render that produces the content. Correct in theory; only hardware settles it.
- [ ] On a fresh chat with no messages, tapping the input does **not** scroll the hero card out of view.

## 3. The reported bug — context survival

- [ ] Send a message, wait for the reply. Switch to the Today tab. Come back. **The conversation is still there.**
- [ ] Type half a sentence without sending. Switch tabs. Come back. The text is still in the input.
- [ ] Force-quit the app, reopen. The conversation is still there. (The half-typed draft is **not** — that is deliberate, see the note at the bottom.)
- [ ] Press "Create N tasks". Todos and their subtasks appear in the list; the chat resets.

## 4. The mid-flight race (fixed in `40f4cc4`, worth confirming)

- [ ] Send a message. While the spinner is up, open the history sheet and resume a different chat. The reply must land in the **original** chat, not the one you switched to.
- [ ] Send a message. While the spinner is up, tap "New chat". The reply must not appear in the new empty chat.

Known cosmetic residual: after either of these the spinner clears globally, so the chat you switched *to* looks idle while the other request finishes. The reply still files correctly.

## 5. Cold start

- [ ] With a saved chat, kill and reopen the app. Nothing flashes — no Overdue/Today/Backlog cards appearing then vanishing, no "Describe your tasks..." placeholder flipping to "Refine or add more...", no X button turning into "New chat".

## 6. History sheet

- [ ] Create two chats that produced tasks. The history icon lists both, newest first, with correct titles.
- [ ] A chat that produced no tasks reads "Draft"; one that produced exactly one reads "1 task".
- [ ] Tapping a row loads it, and a follow-up message is answered with the earlier context in mind.
- [ ] Long-press → confirm → the row disappears.
- [ ] Open the sheet with no history: "No past chats yet", not a blank sheet.
- [ ] The currently open chat is not listed in its own history.

## 7. Regression sweep — untouched screens

The refactor extracted shared-looking components; confirm nothing else broke.

- [ ] Settings → Tags: create a tag, pick each of the eight colours. Check light **and** dark mode (the swatches read from `tagColorsFor(resolvedTheme)`).
- [ ] A todo's tag picker behaves identically.
- [ ] Today / Upcoming / Lists tabs render normally.

---

## Known behaviour changes — expected, not bugs

- **An unsent draft no longer survives a force-quit.** It still survives navigating away and back, which is the bug that was actually reported. Persisting it meant serialising the entire chat archive to AsyncStorage on every keystroke — up to ~500 KB per character at the 30-chat cap.
- **`version: 1` on the store discards Daily Plan chats written by earlier builds of this branch.** Intentional: the persisted shape changed and the branch was never merged. Todos, lists, and tags live in separate stores and are untouched.
- **"New chat" and "Create tasks" now clear the input.** The pre-refactor code left stale text behind.

## Known residuals — real, deliberately not fixed

- `smart-add.ts`: `JSON.parse` succeeds on a bare `'null'` or `'42'`, after which `!parsed.message` throws a `TypeError`. Pre-existing hazard, narrowed by the fix wave but not closed.
- `chat-history.ts`: `pruneChats` can return `max + 1` entries when the protected active chat falls outside the top `max`. Near-unreachable — `ensureActiveChat` protects the newest chat and `finishActiveChat` passes `null`.
- `smart-add.ts` maps HTTP 400 to "the API key looks invalid", but Gemini returns 400 for malformed request bodies more often than for bad keys. Deferred to the tags-and-parser plan, which reopens this file.
- The route is 405 lines against a plan estimate of "under 150". Reaching it needs the Overdue/Today/Backlog JSX extracted into a `PlanCards` component — mechanical, ~110 lines of markup with no logic.
