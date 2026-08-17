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
