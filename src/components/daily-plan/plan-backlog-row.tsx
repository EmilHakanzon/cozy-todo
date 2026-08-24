import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'
import type { Todo } from '@/features/todos/types'

const PLUS_ICON: SymbolViewProps['name'] = {
  ios: 'plus.circle.fill',
  android: 'add_circle',
  web: 'add_circle',
}

type PlanBacklogRowProps = {
  todo: Todo
  onPress: (id: string) => void
  onAddToToday: (id: string) => void
  showBorder: boolean
}

export function PlanBacklogRow({ todo, onPress, onAddToToday, showBorder }: PlanBacklogRowProps) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: showBorder ? 1 : 0,
        borderBottomColor: theme.color.border,
      }}
    >
      <Pressable onPress={() => onPress(todo.id)} style={{ flex: 1 }}>
        <Text
          style={{
            ...typography.body,
            color: theme.color.text2,
          }}
          numberOfLines={1}
        >
          {todo.title}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onAddToToday(todo.id)}
        hitSlop={8}
        style={({ pressed }) => ({
          opacity: pressed ? 0.5 : 1,
          paddingLeft: theme.spacing.sm,
        })}
      >
        <SymbolView name={PLUS_ICON} size={24} tintColor={theme.color.accent} />
      </Pressable>
    </View>
  )
}
