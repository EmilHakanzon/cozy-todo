import { useAppTheme } from '@/hooks/use-app-theme'
import { useThemeStore } from '@/stores/theme-store'
import { Button, Text, View } from 'react-native'

export default function HomeScreen() {
  const { theme, resolvedTheme } = useAppTheme()
  const setPreference = useThemeStore((state) => state.setPreference)

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background, padding: theme.spacing.lg }}>
     
    </View>
  )
}
