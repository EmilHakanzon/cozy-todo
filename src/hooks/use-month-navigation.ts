import { useState, useMemo, useCallback } from 'react'

import {
  endOfMonth,
  formatMonthYear,
  startOfMonth,
} from '@/lib/date-utils'

export function useMonthNavigation() {
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [selectedMonthDay, setSelectedMonthDay] = useState<Date | null>(null)

  const monthStart = useMemo(() => startOfMonth(monthDate), [monthDate])
  const monthEnd = useMemo(() => endOfMonth(monthDate), [monthDate])
  const monthLabel = useMemo(() => formatMonthYear(monthDate), [monthDate])

  const navigateMonthPrev = useCallback(() => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    setSelectedMonthDay(null)
  }, [])

  const navigateMonthNext = useCallback(() => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    setSelectedMonthDay(null)
  }, [])

  const navigateMonthToday = useCallback(() => {
    setMonthDate(new Date())
    setSelectedMonthDay(null)
  }, [])

  return {
    monthDate,
    monthStart,
    monthEnd,
    monthLabel,
    selectedMonthDay,
    setSelectedMonthDay,
    navigateMonthPrev,
    navigateMonthNext,
    navigateMonthToday,
  }
}
