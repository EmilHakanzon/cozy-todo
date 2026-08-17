import { Pressable, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { useAppTheme } from '@/hooks/use-app-theme'
import { listColorsFor } from '@/themes/list-color'
import { typography } from '@/themes/typography'

import type { TodoList } from '@/features/lists/types'
import type { SymbolViewProps } from 'expo-symbols'

type ListCardProps = {
  list: TodoList
  todoCount: number
  activeCount: number
  onPress: () => void
}

const ICON_SIZE = 40
const LIST_ICON: SymbolViewProps['name'] = {
  ios: 'list.bullet',
  android: 'format_list_bulleted',
  web: 'format_list_bulleted',
}

export function ListCard({ list, todoCount, activeCount, onPress }: ListCardProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const listColors = listColorsFor(resolvedTheme)
  const palette = listColors[list.color]

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: theme.radius.md,
          backgroundColor: palette.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SymbolView name={LIST_ICON} size={20} tintColor={palette.accent} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.taskTitle, color: theme.color.text }}>{list.name}</Text>
        <Text style={{ ...typography.meta, color: theme.color.text2 }}>
          {todoCount} {todoCount === 1 ? 'task' : 'tasks'}
        </Text>
      </View>

      {activeCount > 0 && (
        <View
          style={{
            minWidth: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: palette.accent,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 6,
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: 'Manrope_600SemiBold', color: '#ffffff' }}>
            {activeCount}
          </Text>
        </View>
      )}
    </Pressable>
  )
}
