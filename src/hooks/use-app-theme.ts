import { useThemeStore } from '@/stores/theme-store'
import { darkTheme, lightTheme } from '@/themes/theme'
import { useColorScheme } from 'react-native'

export function useAppTheme() {
  const systemColorScheme = useColorScheme()
  const preference = useThemeStore((state) => state.preference)

  const resolvedTheme =
    preference === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : preference

  const theme = resolvedTheme === 'dark' ? darkTheme : lightTheme

  return {
    theme,
    resolvedTheme,
    preference,
  }
}
