import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { TodoListColor } from '@/features/lists/types'

export type FirstDayOfWeek = 'monday' | 'sunday'
export type TimeFormat = '12h' | '24h'
export type DefaultView = 'today' | 'upcoming' | 'lists'

type SettingsState = {
  firstDayOfWeek: FirstDayOfWeek
  timeFormat: TimeFormat
  defaultView: DefaultView
  accentColor: TodoListColor
  remindersEnabled: boolean
  weatherEnabled: boolean
  weatherCity: string
  dailyPlanEnabled: boolean
  dailyPlanTime: string
  setFirstDayOfWeek: (value: FirstDayOfWeek) => void
  setTimeFormat: (value: TimeFormat) => void
  setDefaultView: (value: DefaultView) => void
  setAccentColor: (value: TodoListColor) => void
  setRemindersEnabled: (value: boolean) => void
  setWeatherEnabled: (value: boolean) => void
  setWeatherCity: (value: string) => void
  setDailyPlanEnabled: (value: boolean) => void
  setDailyPlanTime: (value: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      firstDayOfWeek: 'monday',
      timeFormat: '24h',
      defaultView: 'today',
      accentColor: 'sage',
      remindersEnabled: false,
      weatherEnabled: true,
      weatherCity: '',
      dailyPlanEnabled: false,
      dailyPlanTime: '08:00',
      setFirstDayOfWeek: (value) => set({ firstDayOfWeek: value }),
      setTimeFormat: (value) => set({ timeFormat: value }),
      setDefaultView: (value) => set({ defaultView: value }),
      setAccentColor: (value) => set({ accentColor: value }),
      setRemindersEnabled: (value) => set({ remindersEnabled: value }),
      setWeatherEnabled: (value) => set({ weatherEnabled: value }),
      setWeatherCity: (value) => set({ weatherCity: value }),
      setDailyPlanEnabled: (value) => set({ dailyPlanEnabled: value }),
      setDailyPlanTime: (value) => set({ dailyPlanTime: value }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        firstDayOfWeek: state.firstDayOfWeek,
        timeFormat: state.timeFormat,
        defaultView: state.defaultView,
        accentColor: state.accentColor,
        remindersEnabled: state.remindersEnabled,
        weatherEnabled: state.weatherEnabled,
        weatherCity: state.weatherCity,
        dailyPlanEnabled: state.dailyPlanEnabled,
        dailyPlanTime: state.dailyPlanTime,
      }),
    },
  ),
)
