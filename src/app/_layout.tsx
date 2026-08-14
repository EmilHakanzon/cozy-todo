import { useAppTheme } from '@/hooks/use-app-theme'
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import { useEffect } from 'react'
import { bootstrapApp } from '@/lib/bootstrap-app'
import { useListStore } from '@/stores/list-store';


export default function RootLayout() {

  const hasHydrated = useListStore(
    (state) => state.hasHydrated,
  );

  useEffect(() => {

    if (!hasHydrated) {
      return;
    }

    bootstrapApp();
  }, [hasHydrated])
  const { resolvedTheme } = useAppTheme()

  return (
    <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack />
    </ThemeProvider>
  )
}
