import { useEffect } from 'react'
import { router } from 'expo-router'

export default function SmartAddDeepLink() {
  useEffect(() => {
    router.replace('/daily-plan')
  }, [])

  return null
}
