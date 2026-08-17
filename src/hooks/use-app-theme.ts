import { useSettingsStore } from '@/stores/settings-store'
import { useThemeStore } from '@/stores/theme-store'
import { buildTheme } from '@/themes/theme'
import { useColorScheme } from 'react-native'

import type { ResolvedTheme } from '@/themes/theme'

export function useAppTheme() {
  const systemColorScheme = useColorScheme()
  const preference = useThemeStore((state) => state.preference)
  const accentColor = useSettingsStore((state) => state.accentColor)

  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : preference

  const theme = buildTheme(resolvedTheme, accentColor)

  return {
    theme,
    resolvedTheme,
    preference,
  }
}
