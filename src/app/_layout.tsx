import { useFonts } from 'expo-font'
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
} from '@expo-google-fonts/manrope'
import * as SplashScreen from 'expo-splash-screen'
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { QuickAddModal } from '@/components/quick-add'
import { useAppTheme } from '@/hooks/use-app-theme'
import { bootstrapApp } from '@/lib/bootstrap-app'
import { useListStore } from '@/stores/list-store'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
  })

  const hasHydrated = useListStore((state) => state.hasHydrated)
  const { resolvedTheme } = useAppTheme()

  useEffect(() => {
    if (!hasHydrated) return
    bootstrapApp()
  }, [hasHydrated])

  useEffect(() => {
    if ((fontsLoaded || fontError) && hasHydrated) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError, hasHydrated])

  if (!fontsLoaded && !fontError) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        <QuickAddModal />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
