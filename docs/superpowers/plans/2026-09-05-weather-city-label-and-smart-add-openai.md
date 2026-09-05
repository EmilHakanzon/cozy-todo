# Weather City Label Fix & Smart Add Provider Switch

> **Context for whoever picks this up:** The Weather widget and the Gemini-based
> Smart Add feature referenced below do not exist in this branch or on
> `master` as of this commit — they only exist as uncommitted work in a local
> working tree on another machine. This doc is a handoff note: commit and
> push that local branch, then use this as the task list against the real
> source.

**Goal:** Fix a display inconsistency in the Weather widget, and swap Smart
Add's AI provider from Gemini to OpenAI.

---

## Task 1: Weather — show city name on the Today screen

**Observed behavior:** Settings → Weather correctly shows
`16° · Drizzle in Borås` (condition + city name). The compact weather chip
on the Today screen only shows `15° · Drizzle` — no city name, even though
the same location was resolved correctly (matching temperature/condition,
just missing the city).

**Expected behavior:** The Today screen chip should include the resolved
city name too, consistent with the Settings screen, e.g. `15° · Drizzle,
Borås` or `15° · Drizzle · Borås` (match whatever separator convention the
Settings row already uses).

**Where to look:** Whatever component renders the compact weather chip on
the Today screen (likely something like `WeatherChip` / `TodayWeather`)
probably formats its label differently from the Settings screen's weather
preview row — the Settings row already has the correct string
(`"{condition} in {city}"` or similar) built from the same underlying
weather state/selector. Reuse that existing formatter/selector instead of
re-deriving a shorter label for the Today chip.

**Definition of done:** Today screen chip shows city name, matches
Settings' formatting convention, both light and dark theme checked.

---

## Task 2: Smart Add — switch from Gemini to OpenAI gpt-4o-mini

**Current state:** Smart Add (natural-language task parsing when adding a
todo) calls Gemini to turn free text into structured todo fields.

**Requested change:** Replace the Gemini call with OpenAI, model
`gpt-4o-mini`.

**Things to carry over / check while swapping:**
- Match the existing request/response contract (whatever fields Smart Add
  currently expects back — title, dueAt, listId guess, etc.) so no
  downstream code needs to change, only the provider call.
- Move the API key to whatever env/config mechanism the project already
  uses for the Gemini key (same pattern, new variable name) — do not
  hardcode a key in source.
- Confirm token/cost budget is reasonable for gpt-4o-mini's pricing before
  shipping (cheap model, but check actual prompt size/usage pattern).
- Same error-handling behavior on API failure (e.g. falling back to a
  plain, unparsed todo) should be preserved.

**Definition of done:** Smart Add produces equivalent structured output via
OpenAI gpt-4o-mini instead of Gemini, existing Smart Add UI/UX unchanged.
