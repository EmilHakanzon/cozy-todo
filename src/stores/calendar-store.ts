import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type CalendarState = {
  /**
   * Vilka av telefonens kalendrar som ska visas. Bara det här behöver sparas —
   * själva eventen ägs av operativsystemet och hämtas om vid varje visning.
   */
  selectedCalendarIds: string[]
  hasHydrated: boolean
  toggleCalendar: (id: string) => void
  setSelectedCalendarIds: (ids: string[]) => void
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      selectedCalendarIds: [],
      hasHydrated: false,

      toggleCalendar: (id) =>
        set((state) => ({
          selectedCalendarIds: state.selectedCalendarIds.includes(id)
            ? state.selectedCalendarIds.filter((selected) => selected !== id)
            : [...state.selectedCalendarIds, id],
        })),
      setSelectedCalendarIds: (ids) => set({ selectedCalendarIds: ids }),
    }),
    {
      name: 'device-calendar',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ selectedCalendarIds: state.selectedCalendarIds }),
      onRehydrateStorage: () => () => {
        useCalendarStore.setState({ hasHydrated: true })
      },
    },
  ),
)
