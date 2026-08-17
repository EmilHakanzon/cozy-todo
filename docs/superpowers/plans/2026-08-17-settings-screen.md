# Settings Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Settings screen with Theme and About sub-screens, a settings preference store, and wire it into the app from a gear icon on the Today header.

**Architecture:** Settings lives outside the tab group as Stack screens (`app/settings/*`). A reusable `SettingsRow` component renders each item. Theme selection is fully functional via the existing `useThemeStore`. A new `settings-store` persists user preferences (first day of week, time format, default view). Non-functional features (integrations, notifications, backup) appear as disabled rows.

**Tech Stack:** Expo SDK 57, expo-router, expo-symbols (SymbolView), Zustand + AsyncStorage persistence, React Native

**Spec:** Design mockup image 6 (`assets/images/ChatGPT Image 14 aug. 2026 15_14_36.png`)

## Global Constraints

- Expo SDK 57 — read versioned docs at https://docs.expo.dev/versions/v57.0.0/
- Font: Manrope (400 Regular, 500 Medium, 600 SemiBold)
- Spacing: 4px grid via existing `spacing.ts` tokens
- Radius: existing `radius.ts` tokens
- Colors: existing `colors.ts` light/dark palettes
- Path aliases: `@/*` → `./src/*`
- Icons: `SymbolView` from `expo-symbols` — use `SymbolViewProps['name']` type, no `any`
- All new files use the existing `useAppTheme()` hook
- No `any` types. No comments unless WHY is non-obvious.

---

### Task 1: Settings Store

**Files:**
- Create: `src/stores/settings-store.ts`

**Interfaces:**
- Consumes: `zustand`, `zustand/middleware/persist`, `@react-native-async-storage/async-storage`
- Produces:
  - `FirstDayOfWeek = 'monday' | 'sunday'`
  - `TimeFormat = '12h' | '24h'`
  - `DefaultView = 'today' | 'upcoming' | 'lists'`
  - `useSettingsStore` with `firstDayOfWeek`, `timeFormat`, `defaultView`, and setters for each

- [ ] **Step 1: Create the settings store**

Create `src/stores/settings-store.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type FirstDayOfWeek = 'monday' | 'sunday'
export type TimeFormat = '12h' | '24h'
export type DefaultView = 'today' | 'upcoming' | 'lists'

type SettingsState = {
  firstDayOfWeek: FirstDayOfWeek
  timeFormat: TimeFormat
  defaultView: DefaultView
  setFirstDayOfWeek: (value: FirstDayOfWeek) => void
  setTimeFormat: (value: TimeFormat) => void
  setDefaultView: (value: DefaultView) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      firstDayOfWeek: 'monday',
      timeFormat: '24h',
      defaultView: 'today',

      setFirstDayOfWeek: (value) => set({ firstDayOfWeek: value }),
      setTimeFormat: (value) => set({ timeFormat: value }),
      setDefaultView: (value) => set({ defaultView: value }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        firstDayOfWeek: state.firstDayOfWeek,
        timeFormat: state.timeFormat,
        defaultView: state.defaultView,
      }),
    },
  ),
)
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/settings-store.ts
git commit -m "feat: settings store for app preferences"
```

---

### Task 2: SettingsRow Component

**Files:**
- Create: `src/components/settings-row.tsx`

**Interfaces:**
- Consumes: `useAppTheme()`, `typography`, `SymbolView`, `SymbolViewProps`
- Produces: `SettingsRow({ icon, label, value, onPress, disabled, destructive })` — a reusable row with icon, label, value text, and chevron

- [ ] **Step 1: Create SettingsRow component**

Create `src/components/settings-row.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

type SettingsRowProps = {
  icon: SymbolViewProps['name']
  label: string
  value?: string
  onPress?: () => void
  disabled?: boolean
  destructive?: boolean
}

const CHEVRON: SymbolViewProps['name'] = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
}

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  disabled = false,
  destructive = false,
}: SettingsRowProps) {
  const { theme } = useAppTheme()

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.sm,
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      <SymbolView
        name={icon}
        size={20}
        tintColor={destructive ? '#c44' : theme.color.text2}
      />
      <Text
        style={{
          ...typography.body,
          flex: 1,
          color: destructive ? '#c44' : theme.color.text,
        }}
      >
        {label}
      </Text>
      {value && (
        <Text style={{ ...typography.meta, color: theme.color.text2 }}>
          {value}
        </Text>
      )}
      {onPress && !destructive && (
        <SymbolView name={CHEVRON} size={14} tintColor={theme.color.text2} />
      )}
    </Pressable>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/settings-row.tsx
git commit -m "feat: reusable SettingsRow component"
```

---

### Task 3: Main Settings Screen

**Files:**
- Create: `src/app/settings/index.tsx`
- Modify: `src/app/(tabs)/index.tsx` — add gear icon to ScreenHeader rightAction

**Interfaces:**
- Consumes: `SettingsRow`, `ScreenHeader`, `useAppTheme()`, `useThemeStore`, `useSettingsStore`, `router` from expo-router, `SymbolView`
- Produces: Full settings list with sections matching the design: Preferences, Integrations, Notifications, More

- [ ] **Step 1: Create the settings screen**

Create `src/app/settings/index.tsx`:

```tsx
import { Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SettingsRow } from '@/components/settings-row'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useSettingsStore } from '@/stores/settings-store'
import { useThemeStore } from '@/stores/theme-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const CLOSE_ICON: SymbolViewProps['name'] = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
}

const ICONS = {
  theme: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' } as SymbolViewProps['name'],
  accentColor: { ios: 'paintpalette', android: 'palette', web: 'palette' } as SymbolViewProps['name'],
  firstDay: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' } as SymbolViewProps['name'],
  timeFormat: { ios: 'clock', android: 'schedule', web: 'schedule' } as SymbolViewProps['name'],
  defaultView: { ios: 'eye', android: 'visibility', web: 'visibility' } as SymbolViewProps['name'],
  language: { ios: 'globe', android: 'language', web: 'language' } as SymbolViewProps['name'],
  calendar: { ios: 'calendar.badge.plus', android: 'event', web: 'event' } as SymbolViewProps['name'],
  import: { ios: 'square.and.arrow.down', android: 'download', web: 'download' } as SymbolViewProps['name'],
  reminders: { ios: 'bell', android: 'notifications', web: 'notifications' } as SymbolViewProps['name'],
  dailyPlan: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as SymbolViewProps['name'],
  sound: { ios: 'speaker.wave.2', android: 'volume_up', web: 'volume_up' } as SymbolViewProps['name'],
  backup: { ios: 'icloud.and.arrow.up', android: 'cloud_upload', web: 'cloud_upload' } as SymbolViewProps['name'],
  privacy: { ios: 'lock.shield', android: 'shield', web: 'shield' } as SymbolViewProps['name'],
  about: { ios: 'info.circle', android: 'info', web: 'info' } as SymbolViewProps['name'],
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' } as SymbolViewProps['name'],
}

const THEME_LABELS = { light: 'Light', dark: 'Dark', system: 'System' } as const
const DAY_LABELS = { monday: 'Monday', sunday: 'Sunday' } as const
const TIME_LABELS = { '12h': '12-hour', '24h': '24-hour' } as const
const VIEW_LABELS = { today: 'Today', upcoming: 'Upcoming', lists: 'Lists' } as const

function SectionHeader({ title }: { title: string }) {
  const { theme } = useAppTheme()
  return (
    <Text
      style={{
        ...typography.sectionTitle,
        color: theme.color.text2,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xs,
      }}
    >
      {title}
    </Text>
  )
}

export default function SettingsScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const themePreference = useThemeStore((s) => s.preference)
  const { firstDayOfWeek, timeFormat, defaultView } = useSettingsStore()

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <View
        style={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ ...typography.screenTitle, color: theme.color.text }}>
          Settings
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <SymbolView name={CLOSE_ICON} size={20} tintColor={theme.color.text2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <SectionHeader title="PREFERENCES" />
        <SettingsRow
          icon={ICONS.theme}
          label="Theme"
          value={THEME_LABELS[themePreference]}
          onPress={() => router.push('/settings/theme')}
        />
        <SettingsRow
          icon={ICONS.accentColor}
          label="Accent color"
          disabled
        />
        <SettingsRow
          icon={ICONS.firstDay}
          label="First day of week"
          value={DAY_LABELS[firstDayOfWeek]}
          disabled
        />
        <SettingsRow
          icon={ICONS.timeFormat}
          label="Time format"
          value={TIME_LABELS[timeFormat]}
          disabled
        />
        <SettingsRow
          icon={ICONS.defaultView}
          label="Default view"
          value={VIEW_LABELS[defaultView]}
          disabled
        />
        <SettingsRow
          icon={ICONS.language}
          label="Language"
          value="English"
          disabled
        />

        <SectionHeader title="INTEGRATIONS" />
        <SettingsRow
          icon={ICONS.calendar}
          label="Google Calendar"
          value="Not connected"
          disabled
        />
        <SettingsRow
          icon={ICONS.import}
          label="Import"
          value="From other apps"
          disabled
        />

        <SectionHeader title="NOTIFICATIONS" />
        <SettingsRow
          icon={ICONS.reminders}
          label="Reminders"
          value="Off"
          disabled
        />
        <SettingsRow
          icon={ICONS.dailyPlan}
          label="Daily plan"
          value="Off"
          disabled
        />
        <SettingsRow
          icon={ICONS.sound}
          label="Sound"
          value="Chime"
          disabled
        />

        <SectionHeader title="MORE" />
        <SettingsRow
          icon={ICONS.backup}
          label="Backup & restore"
          disabled
        />
        <SettingsRow
          icon={ICONS.privacy}
          label="Data & privacy"
          disabled
        />
        <SettingsRow
          icon={ICONS.about}
          label="About"
          value="v1.0.0"
          onPress={() => router.push('/settings/about')}
        />
      </ScrollView>
    </View>
  )
}
```

- [ ] **Step 2: Add gear icon to Today screen header**

In `src/app/(tabs)/index.tsx`, add a gear icon button as the `rightAction` of `ScreenHeader`:

Add imports:
```tsx
import { Pressable } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import type { SymbolViewProps } from 'expo-symbols'
```

Add constant:
```tsx
const SETTINGS_ICON: SymbolViewProps['name'] = {
  ios: 'gearshape',
  android: 'settings',
  web: 'settings',
}
```

Update the ScreenHeader to include rightAction:
```tsx
<ScreenHeader
  title="Today"
  subtitle={dateStr}
  rightAction={
    <Pressable
      onPress={() => router.push('/settings')}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
    >
      <SymbolView name={SETTINGS_ICON} size={22} tintColor={theme.color.text2} />
    </Pressable>
  }
/>
```

- [ ] **Step 3: Verify settings screen**

Run the app. Tap the gear icon on the Today screen header. Confirm:
- Settings screen opens with "Settings" title and X close button
- X button navigates back to Today
- Sections: Preferences, Integrations, Notifications, More are visible
- Theme row shows current theme value and navigates to theme picker
- About row shows v1.0.0 and navigates to about screen
- Disabled rows appear at 40% opacity and don't respond to taps
- Scrolling works, bottom padding accommodates safe area

- [ ] **Step 4: Commit**

```bash
git add src/app/settings/index.tsx src/app/\(tabs\)/index.tsx
git commit -m "feat: Settings screen with gear icon on Today header"
```

---

### Task 4: Theme Sub-Screen

**Files:**
- Create: `src/app/settings/theme.tsx`

**Interfaces:**
- Consumes: `useThemeStore`, `ThemePreference`, `useAppTheme()`, `typography`, `router`, `SymbolView`, `useSafeAreaInsets`
- Produces: Theme picker with Light / Dark / Follow system options, checkmark on active, and live preview below

- [ ] **Step 1: Create the theme screen**

Create `src/app/settings/theme.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useThemeStore } from '@/stores/theme-store'
import { typography } from '@/themes/typography'

import type { ThemePreference } from '@/stores/theme-store'
import type { SymbolViewProps } from 'expo-symbols'

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
}

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
}

const THEME_ICONS: Record<ThemePreference, SymbolViewProps['name']> = {
  light: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  dark: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' },
  system: { ios: 'circle.lefthalf.filled', android: 'contrast', web: 'contrast' },
}

const THEME_OPTIONS: { key: ThemePreference; label: string; subtitle?: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'Follow system', subtitle: 'Use device setting' },
]

export default function ThemeScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const preference = useThemeStore((s) => s.preference)
  const setPreference = useThemeStore((s) => s.setPreference)

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <View
        style={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <SymbolView name={BACK_ICON} size={20} tintColor={theme.color.text2} />
        </Pressable>
        <Text style={{ ...typography.screenTitle, fontSize: 24, flex: 1, color: theme.color.text }}>
          Theme
        </Text>
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        {THEME_OPTIONS.map((option) => {
          const isActive = preference === option.key

          return (
            <Pressable
              key={option.key}
              onPress={() => setPreference(option.key)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.md,
                gap: theme.spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <SymbolView
                name={THEME_ICONS[option.key]}
                size={20}
                tintColor={isActive ? theme.color.accent : theme.color.text2}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...typography.body,
                    fontFamily: 'Manrope_500Medium',
                    color: theme.color.text,
                  }}
                >
                  {option.label}
                </Text>
                {option.subtitle && (
                  <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                    {option.subtitle}
                  </Text>
                )}
              </View>
              {isActive && (
                <SymbolView name={CHECK_ICON} size={18} tintColor={theme.color.accent} />
              )}
            </Pressable>
          )
        })}
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl }}>
        <Text style={{ ...typography.sectionTitle, color: theme.color.text2, marginBottom: theme.spacing.sm }}>
          PREVIEW
        </Text>
        <View
          style={{
            backgroundColor: theme.color.surface,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.color.border,
          }}
        >
          <Text style={{ ...typography.screenTitle, fontSize: 20, color: theme.color.text }}>
            Today
          </Text>
          <Text style={{ ...typography.meta, color: theme.color.text2, marginTop: 2 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: theme.color.border,
                }}
              />
              <Text style={{ ...typography.body, color: theme.color.text }}>
                Sample task
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: theme.color.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SymbolView name={CHECK_ICON} size={12} tintColor="#ffffff" />
              </View>
              <Text
                style={{
                  ...typography.body,
                  color: theme.color.text2,
                  textDecorationLine: 'line-through',
                }}
              >
                Completed task
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Verify theme screen**

Run the app. Navigate to Settings → Theme. Confirm:
- Back arrow returns to Settings
- Three options: Light, Dark, Follow system
- Active option has accent-colored icon and checkmark
- Tapping an option changes the theme immediately
- Preview card below reflects the current theme
- Theme preference persists after closing and reopening the app

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/theme.tsx
git commit -m "feat: Theme picker with live preview"
```

---

### Task 5: About Sub-Screen

**Files:**
- Create: `src/app/settings/about.tsx`

**Interfaces:**
- Consumes: `useAppTheme()`, `typography`, `router`, `SymbolView`, `useSafeAreaInsets`
- Produces: About screen with app logo placeholder, version, info rows, and legal section

- [ ] **Step 1: Create the about screen**

Create `src/app/settings/about.tsx`:

```tsx
import { Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SettingsRow } from '@/components/settings-row'
import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
}

const APP_ICON: SymbolViewProps['name'] = {
  ios: 'leaf',
  android: 'eco',
  web: 'eco',
}

const ICONS = {
  whatsNew: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as SymbolViewProps['name'],
  help: { ios: 'questionmark.circle', android: 'help', web: 'help' } as SymbolViewProps['name'],
  feedback: { ios: 'envelope', android: 'mail', web: 'mail' } as SymbolViewProps['name'],
  rate: { ios: 'star', android: 'star', web: 'star' } as SymbolViewProps['name'],
  terms: { ios: 'doc.text', android: 'description', web: 'description' } as SymbolViewProps['name'],
  privacy: { ios: 'lock.shield', android: 'shield', web: 'shield' } as SymbolViewProps['name'],
  licenses: { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' } as SymbolViewProps['name'],
}

export default function AboutScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <View
        style={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <SymbolView name={BACK_ICON} size={20} tintColor={theme.color.text2} />
        </Pressable>
        <Text style={{ ...typography.screenTitle, fontSize: 24, flex: 1, color: theme.color.text }}>
          About
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            paddingVertical: theme.spacing.lg,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.color.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SymbolView name={APP_ICON} size={28} tintColor={theme.color.accent} />
          </View>
          <View>
            <Text style={{ ...typography.screenTitle, fontSize: 24, color: theme.color.text }}>
              Planora
            </Text>
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              v1.0.0
            </Text>
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              Build a life that feels good.
            </Text>
          </View>
        </View>

        <SettingsRow icon={ICONS.whatsNew} label="What's new" disabled />
        <SettingsRow icon={ICONS.help} label="Help & support" disabled />
        <SettingsRow icon={ICONS.feedback} label="Send feedback" disabled />
        <SettingsRow icon={ICONS.rate} label="Rate the app" disabled />

        <Text
          style={{
            ...typography.sectionTitle,
            color: theme.color.text2,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.xs,
          }}
        >
          LEGAL
        </Text>

        <SettingsRow icon={ICONS.terms} label="Terms of service" disabled />
        <SettingsRow icon={ICONS.privacy} label="Privacy policy" disabled />
        <SettingsRow icon={ICONS.licenses} label="Open source licenses" disabled />

        <Text
          style={{
            ...typography.meta,
            color: theme.color.text2,
            textAlign: 'center',
            paddingTop: theme.spacing.xl,
          }}
        >
          © 2026 Planora. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  )
}
```

- [ ] **Step 2: Verify about screen**

Run the app. Navigate to Settings → About. Confirm:
- Back arrow returns to Settings
- App icon, name "Planora", version v1.0.0, tagline
- Info rows: What's new, Help & support, Send feedback, Rate the app
- Legal section: Terms, Privacy, Licenses
- Copyright notice at bottom
- All rows disabled (40% opacity)

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "^example/"
```

Expected: no errors from source files.

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/about.tsx
git commit -m "feat: About screen with app info and legal section"
```
