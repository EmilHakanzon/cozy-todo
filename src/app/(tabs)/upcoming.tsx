import { Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

export default function UpcomingScreen() {
  const { theme } = useAppTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background, padding: theme.spacing.lg }}>
      <Text style={{ ...typography.screenTitle, color: theme.color.text }}>Upcoming</Text>
      <Text style={{ ...typography.meta, color: theme.color.text2, marginTop: theme.spacing.xs }}>
        Coming soon
      </Text>
    </View>
  )
}
