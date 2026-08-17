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
  weather: { ios: 'cloud.sun', android: 'partly_cloudy_day', web: 'partly_cloudy_day' } as SymbolViewProps['name'],
  reminders: { ios: 'bell', android: 'notifications', web: 'notifications' } as SymbolViewProps['name'],
  dailyPlan: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as SymbolViewProps['name'],
  sound: { ios: 'speaker.wave.2', android: 'volume_up', web: 'volume_up' } as SymbolViewProps['name'],
  backup: { ios: 'icloud.and.arrow.up', android: 'cloud_upload', web: 'cloud_upload' } as SymbolViewProps['name'],
  privacy: { ios: 'lock.shield', android: 'shield', web: 'shield' } as SymbolViewProps['name'],
  about: { ios: 'info.circle', android: 'info', web: 'info' } as SymbolViewProps['name'],
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
  const { firstDayOfWeek, timeFormat, defaultView, remindersEnabled, weatherEnabled, weatherCity } = useSettingsStore()

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
          onPress={() => router.push('/settings/accent-color')}
        />
        <SettingsRow
          icon={ICONS.firstDay}
          label="First day of week"
          value={DAY_LABELS[firstDayOfWeek]}
          onPress={() => router.push('/settings/first-day')}
        />
        <SettingsRow
          icon={ICONS.timeFormat}
          label="Time format"
          value={TIME_LABELS[timeFormat]}
          onPress={() => router.push('/settings/time-format')}
        />
        <SettingsRow
          icon={ICONS.defaultView}
          label="Default view"
          value={VIEW_LABELS[defaultView]}
          onPress={() => router.push('/settings/default-view')}
        />
        <SettingsRow
          icon={ICONS.weather}
          label="Weather"
          value={weatherEnabled ? (weatherCity || 'Auto') : 'Off'}
          onPress={() => router.push('/settings/weather')}
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
          onPress={() => router.push('/settings/google-calendar')}
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
          value={remindersEnabled ? 'On' : 'Off'}
          onPress={() => router.push('/settings/reminders')}
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
