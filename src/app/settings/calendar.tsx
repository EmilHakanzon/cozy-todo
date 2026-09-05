import { Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { SettingsScreenHeader } from '@/components/settings-screen-header'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useDeviceCalendars } from '@/hooks/use-device-calendars'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const CALENDAR_ICON: SymbolViewProps['name'] = {
  ios: 'calendar',
  android: 'event',
  web: 'event',
}

export default function CalendarSettingsScreen() {
  const { theme } = useAppTheme()
  const { granted, loading, calendars, selectedCalendarIds, toggleCalendar, connect } =
    useDeviceCalendars()

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.color.background }}>
        <SettingsScreenHeader title="Calendar" />
      </View>
    )
  }

  if (!granted) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.color.background }}>
        <SettingsScreenHeader title="Calendar" />

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.xl,
            paddingBottom: 120,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.color.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.lg,
            }}
          >
            <SymbolView name={CALENDAR_ICON} size={36} tintColor={theme.color.accent} />
          </View>
          <Text
            style={{
              ...typography.screenTitle,
              fontSize: 24,
              color: theme.color.text,
              textAlign: 'center',
              marginBottom: theme.spacing.sm,
            }}
          >
            Show your calendar
          </Text>
          <Text
            style={{
              ...typography.body,
              color: theme.color.text2,
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: theme.spacing.xl,
            }}
          >
            Planora can show the calendars already on this phone — Google, iCloud, work — alongside your tasks in Upcoming. Nothing leaves your device.
          </Text>

          <Pressable
            onPress={connect}
            style={({ pressed }) => ({
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.color.accent,
              borderRadius: theme.radius.md,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.xl,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                ...typography.body,
                fontFamily: 'Manrope_600SemiBold',
                color: '#ffffff',
              }}
            >
              Allow calendar access
            </Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <SettingsScreenHeader title="Calendar" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: 120 }}>
        <Text
          style={{
            ...typography.sectionTitle,
            color: theme.color.text2,
            paddingBottom: theme.spacing.sm,
          }}
        >
          SHOW IN UPCOMING
        </Text>

        {calendars.length === 0 ? (
          <Text style={{ ...typography.body, color: theme.color.text2 }}>
            No calendars found on this device.
          </Text>
        ) : (
          calendars.map((calendar) => (
            <View
              key={calendar.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
                paddingVertical: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.color.border,
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: calendar.color || theme.color.accent,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: theme.color.text }} numberOfLines={1}>
                  {calendar.title}
                </Text>
                {calendar.accountName !== '' && (
                  <Text style={{ ...typography.meta, color: theme.color.text2 }} numberOfLines={1}>
                    {calendar.accountName}
                  </Text>
                )}
              </View>
              <Switch
                value={selectedCalendarIds.includes(calendar.id)}
                onValueChange={() => toggleCalendar(calendar.id)}
                trackColor={{ true: theme.color.accent, false: theme.color.border }}
              />
            </View>
          ))
        )}

        <Text
          style={{
            ...typography.meta,
            color: theme.color.text2,
            paddingTop: theme.spacing.lg,
            lineHeight: 18,
          }}
        >
          Events are read from this device only. Planora never signs in to your calendar account and never uploads your events.
        </Text>
      </ScrollView>
    </View>
  )
}
