import { useEffect } from 'react'
import { router } from 'expo-router'
import { toDateString } from '@/lib/date-utils'
import { useQuickAddStore } from '@/stores/quick-add-store'

export default function QuickAddDeepLink() {
  const open = useQuickAddStore((s) => s.open)

  useEffect(() => {
    router.replace('/(tabs)')
    open(undefined, undefined, toDateString(new Date()))
  }, [open])

  return null
}
