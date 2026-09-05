import { useEffect } from 'react'
import { AppState } from 'react-native'

import { getDailyPlanCounts } from '@/features/todos/selectors'
import {
  cancelDailyPlanNotification,
  scheduleDailyPlanNotification,
} from '@/lib/notifications'
import { useSettingsStore } from '@/stores/settings-store'
import { useTodoStore } from '@/stores/todo-store'

/**
 * Texten bakas in när notisen schemaläggs, och expo-notifications har inget sätt
 * att uppdatera en redan schemalagd notis — bara avboka och boka om. Utan den här
 * omschemaläggningen skulle samma "2 overdue and 3 scheduled" upprepas varje
 * morgon i all evighet.
 *
 * Vi bokar om vid varje skifte till och från förgrunden. Skiftet till bakgrund är
 * det viktiga: det fångar läget precis när användaren lämnar appen. Räkningen kan
 * alltså vara inaktuell om appen inte öppnas på flera dygn, men i övrigt speglar
 * den vad användaren senast såg.
 */
export function useDailyPlanNotification(): void {
  const enabled = useSettingsStore((s) => s.dailyPlanEnabled)
  const time = useSettingsStore((s) => s.dailyPlanTime)

  useEffect(() => {
    const sync = () => {
      if (!enabled) {
        void cancelDailyPlanNotification().catch(() => {})
        return
      }
      const { todayCount, overdueCount } = getDailyPlanCounts(
        useTodoStore.getState().todosById,
      )
      void scheduleDailyPlanNotification(time, todayCount, overdueCount).catch(() => {})
    }

    sync()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') sync()
    })
    return () => subscription.remove()
  }, [enabled, time])
}
