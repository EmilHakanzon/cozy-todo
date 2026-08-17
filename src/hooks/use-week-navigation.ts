import { useState, useMemo, useCallback } from 'react'

import {
  addDays,
  endOfWeek,
  formatWeekRange,
  getWeekDays,
  startOfWeek,
} from '@/lib/date-utils'

import type { FirstDayOfWeek } from '@/stores/settings-store'

export function useWeekNavigation(firstDayOfWeek: FirstDayOfWeek) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), firstDayOfWeek))
  const [selectedDay, setSelectedDay] = useState(() => new Date())

  const weekEnd = useMemo(() => endOfWeek(weekStart), [weekStart])
  const rangeLabel = useMemo(() => formatWeekRange(weekStart, weekEnd), [weekStart, weekEnd])
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

  const navigatePrev = useCallback(() => setWeekStart((prev) => addDays(prev, -7)), [])
  const navigateNext = useCallback(() => setWeekStart((prev) => addDays(prev, 7)), [])
  const navigateToday = useCallback(() => {
    setWeekStart(startOfWeek(new Date(), firstDayOfWeek))
    setSelectedDay(new Date())
  }, [firstDayOfWeek])

  return {
    weekStart,
    weekEnd,
    weekDays,
    rangeLabel,
    selectedDay,
    setSelectedDay,
    navigatePrev,
    navigateNext,
    navigateToday,
  }
}
