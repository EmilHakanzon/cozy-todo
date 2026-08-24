import { Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

type PlanSectionLabelProps = {
  label: string
  count: number
  color: string
}

export function PlanSectionLabel({ label, count, color }: PlanSectionLabelProps) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingBottom: theme.spacing.xs,
        paddingLeft: theme.spacing.micro,
      }}
    >
      <Text style={{ ...typography.sectionTitle, color }}>{label}</Text>
      {count > 0 && <Text style={{ ...typography.meta, color: theme.color.text2 }}>({count})</Text>}
    </View>
  )
}
