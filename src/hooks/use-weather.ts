import { useState, useEffect, useRef, useCallback } from 'react'
import { AppState } from 'react-native'

import { useSettingsStore } from '@/stores/settings-store'

type WeatherData = {
  temperature: number
  description: string
  icon: string
  city: string
}

type WeatherState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: WeatherData }

const WMO_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear', icon: '☀️' },
  1: { description: 'Mostly clear', icon: '🌤️' },
  2: { description: 'Partly cloudy', icon: '⛅' },
  3: { description: 'Overcast', icon: '☁️' },
  45: { description: 'Foggy', icon: '🌫️' },
  48: { description: 'Icy fog', icon: '🌫️' },
  51: { description: 'Light drizzle', icon: '🌦️' },
  53: { description: 'Drizzle', icon: '🌦️' },
  55: { description: 'Heavy drizzle', icon: '🌧️' },
  61: { description: 'Light rain', icon: '🌧️' },
  63: { description: 'Rain', icon: '🌧️' },
  65: { description: 'Heavy rain', icon: '🌧️' },
  71: { description: 'Light snow', icon: '🌨️' },
  73: { description: 'Snow', icon: '❄️' },
  75: { description: 'Heavy snow', icon: '❄️' },
  77: { description: 'Snow grains', icon: '❄️' },
  80: { description: 'Light showers', icon: '🌦️' },
  81: { description: 'Showers', icon: '🌧️' },
  82: { description: 'Heavy showers', icon: '🌧️' },
  85: { description: 'Snow showers', icon: '🌨️' },
  86: { description: 'Heavy snow showers', icon: '🌨️' },
  95: { description: 'Thunderstorm', icon: '⛈️' },
  96: { description: 'Thunderstorm with hail', icon: '⛈️' },
  99: { description: 'Thunderstorm with heavy hail', icon: '⛈️' },
}

function getWeatherInfo(code: number) {
  return WMO_CODES[code] ?? { description: 'Unknown', icon: '🌡️' }
}

async function getCoordinates(cityOverride: string): Promise<{ latitude: number; longitude: number; city: string }> {
  if (cityOverride.trim()) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityOverride.trim())}&count=1&language=en&format=json`
    const geoRes = await fetch(geoUrl)
    if (!geoRes.ok) throw new Error('Geocoding failed')
    const geoData = await geoRes.json()
    if (!geoData.results?.length) throw new Error('City not found')
    const r = geoData.results[0] as { latitude: number; longitude: number; name: string }
    return { latitude: r.latitude, longitude: r.longitude, city: r.name }
  }

  const ipServices = [
    async () => {
      const res = await fetch('https://freeipapi.com/api/json')
      if (!res.ok) throw new Error()
      const d = await res.json()
      return { latitude: d.latitude, longitude: d.longitude, city: d.cityName || '' }
    },
    async () => {
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json')
      if (!res.ok) throw new Error()
      const d = await res.json()
      return { latitude: Number(d.latitude), longitude: Number(d.longitude), city: d.city || '' }
    },
  ]

  for (const tryService of ipServices) {
    try {
      const result = await tryService()
      if (result.latitude && result.longitude) return { ...result, city: result.city || 'Your location' }
    } catch { /* try next */ }
  }
  throw new Error('Location unavailable')
}

const MIN_REFRESH_MS = 10 * 60 * 1000

export function useWeather(): WeatherState {
  const weatherEnabled = useSettingsStore((s) => s.weatherEnabled)
  const weatherCity = useSettingsStore((s) => s.weatherCity)
  const [state, setState] = useState<WeatherState>({ status: 'idle' })
  const lastFetchRef = useRef(0)
  const lastCityRef = useRef('')

  const fetchWeather = useCallback(async () => {
    if (!weatherEnabled) {
      setState({ status: 'idle' })
      return
    }

    const cityChanged = weatherCity !== lastCityRef.current
    const now = Date.now()
    if (!cityChanged && now - lastFetchRef.current < MIN_REFRESH_MS && state.status === 'success') return

    setState((prev) => prev.status === 'success' ? prev : { status: 'loading' })

    try {
      const coords = await getCoordinates(weatherCity)

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code`
      const res = await fetch(weatherUrl)
      if (!res.ok) throw new Error('Weather fetch failed')

      const json = await res.json()
      const temp = Math.round(json.current.temperature_2m)
      const code = json.current.weather_code
      const info = getWeatherInfo(code)

      lastFetchRef.current = Date.now()
      lastCityRef.current = weatherCity
      setState({
        status: 'success',
        data: {
          temperature: temp,
          description: info.description,
          icon: info.icon,
          city: coords.city,
        },
      })
    } catch {
      setState((prev) => prev.status === 'success' ? prev : { status: 'error' })
    }
  }, [weatherEnabled, weatherCity, state.status])

  useEffect(() => {
    fetchWeather()
  }, [weatherEnabled, weatherCity])

  useEffect(() => {
    if (!weatherEnabled) return
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') fetchWeather()
    })
    return () => sub.remove()
  }, [fetchWeather, weatherEnabled])

  return state
}
