import { SymbolView } from 'expo-symbols'
import { Pressable, Text, View } from 'react-native'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const SPARKLE_ICON: SymbolViewProps['name'] = {
  ios: 'sparkles',
  android: 'auto_awesome',
  web: 'auto_awesome',
}

type ChatEmptyStateProps = {
  onPickExample: (text: string) => void
}

export function ChatEmptyState({ onPickExample }: ChatEmptyStateProps) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          paddingBottom: theme.spacing.sm,
        }}
      >
        <SymbolView name={SPARKLE_ICON} size={16} tintColor={theme.color.accent} />
        <Text
          style={{
            ...typography.body,
            fontFamily: 'Manrope_600SemiBold',
            color: theme.color.text,
          }}
        >
          Smart Add
        </Text>
      </View>
      <Text style={{ ...typography.body, color: theme.color.text2, lineHeight: 22 }}>
        Tell me what you need to do and I'll create tasks for you. You can describe multiple
        tasks, set dates, add subtasks — just talk naturally.
      </Text>
      <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.md }}>
        {[
          '"Plan a birthday party for next Saturday"',
          '"Groceries: milk, eggs, bread, and butter"',
          '"Meeting with "X" tomorrow at 2pm, prepare slides beforehand"',
        ].map((example) => (
          <Pressable
            key={example}
            onPress={() => onPickExample(example.slice(1, -1))}
            style={({ pressed }) => ({
              backgroundColor: theme.color.surfaceSoft,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>{example}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
