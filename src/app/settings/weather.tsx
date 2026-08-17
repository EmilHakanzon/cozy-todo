import { useState, useEffect, useRef } from 'react'
import { Switch, Text, TextInput, View } from 'react-native'

import { SettingsScreenHeader } from '@/components/settings-screen-header'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useWeather } from '@/hooks/use-weather'
import { useSettingsStore } from '@/stores/settings-store'
import { typography } from '@/themes/typography'

export default function WeatherSettingsScreen() {
  const { theme } = useAppTheme()
  const weatherEnabled = useSettingsStore((s) => s.weatherEnabled)
  const weatherCity = useSettingsStore((s) => s.weatherCity)
  const setWeatherEnabled = useSettingsStore((s) => s.setWeatherEnabled)
  const setWeatherCity = useSettingsStore((s) => s.setWeatherCity)
  const weather = useWeather()

  const [cityDraft, setCityDraft] = useState(weatherCity)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCityDraft(weatherCity)
  }, [weatherCity])

  function handleCityChange(text: string) {
    setCityDraft(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setWeatherCity(text)
    }, 800)
  }

  const previewText =
    weather.status === 'success'
      ? `${weather.data.icon} ${weather.data.temperature}°  ·  ${weather.data.description} in ${weather.data.city}`
      : weather.status === 'loading'
        ? 'Looking up weather...'
        : weather.status === 'error'
          ? 'Could not detect location. Try entering your city below.'
          : ''

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <SettingsScreenHeader title="Weather" />

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: theme.spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.body, color: theme.color.text }}>
              Show weather
            </Text>
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              Display current weather on the Today screen
            </Text>
          </View>
          <Switch
            value={weatherEnabled}
            onValueChange={setWeatherEnabled}
            trackColor={{ false: theme.color.border, true: theme.color.accent }}
            thumbColor="#ffffff"
          />
        </View>

        {weatherEnabled && (
          <>
            {previewText !== '' && (
              <View
                style={{
                  backgroundColor: theme.color.surfaceSoft,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.sm,
                  marginBottom: theme.spacing.md,
                }}
              >
                <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                  {previewText}
                </Text>
              </View>
            )}

            <View
              style={{
                paddingVertical: theme.spacing.md,
                borderTopWidth: 1,
                borderTopColor: theme.color.border,
              }}
            >
              <Text style={{ ...typography.body, color: theme.color.text, marginBottom: theme.spacing.micro }}>
                City override
              </Text>
              <Text style={{ ...typography.meta, color: theme.color.text2, marginBottom: theme.spacing.xs }}>
                Leave empty to detect automatically
              </Text>
              <TextInput
                value={cityDraft}
                onChangeText={handleCityChange}
                placeholder="Auto-detect"
                placeholderTextColor={theme.color.text2}
                autoCapitalize="words"
                autoCorrect={false}
                style={{
                  ...typography.body,
                  color: theme.color.text,
                  backgroundColor: theme.color.surfaceSoft,
                  borderRadius: theme.radius.md,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  borderWidth: 1,
                  borderColor: theme.color.border,
                }}
              />
            </View>
          </>
        )}
      </View>
    </View>
  )
}
