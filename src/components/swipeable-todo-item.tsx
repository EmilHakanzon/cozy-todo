import { useRef, useCallback } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { SymbolView } from 'expo-symbols'
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable'

import { TodoItem } from './todo-item'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

import type { SharedValue } from 'react-native-reanimated'
import type { SymbolViewProps } from 'expo-symbols'
import type { Todo, TodoId } from '@/features/todos/types'

const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark.circle.fill',
  android: 'check_circle',
  web: 'check_circle',
}
const UNDO_ICON: SymbolViewProps['name'] = {
  ios: 'arrow.uturn.backward',
  android: 'undo',
  web: 'undo',
}
const TRASH_ICON: SymbolViewProps['name'] = {
  ios: 'trash.fill',
  android: 'delete',
  web: 'delete',
}

type SwipeableTodoItemProps = {
  todo: Todo
  onToggle: (id: TodoId) => void
  onPress?: (id: TodoId) => void
  showListName?: boolean
}

export function SwipeableTodoItem({
  todo,
  onToggle,
  onPress,
  showListName,
}: SwipeableTodoItemProps) {
  const { theme } = useAppTheme()
  const deleteTodo = useTodoStore((s) => s.deleteTodo)
  const swipeableRef = useRef<SwipeableMethods>(null)

  const isCompleted = todo.completedAt !== null

  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel', onPress: () => swipeableRef.current?.close() },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTodo(todo.id),
      },
    ])
  }, [todo.id, deleteTodo])

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onToggle(todo.id)
    swipeableRef.current?.close()
  }, [todo.id, onToggle])

  const renderLeftActions = useCallback(
    (_progress: SharedValue<number>, _drag: SharedValue<number>) => (
      <Pressable
        onPress={handleToggle}
        style={{
          backgroundColor: isCompleted ? theme.color.accent : '#4CAF50',
          justifyContent: 'center',
          alignItems: 'center',
          width: 80,
          borderRadius: theme.radius.md,
          marginRight: theme.spacing.xs,
        }}
      >
        <SymbolView
          name={isCompleted ? UNDO_ICON : CHECK_ICON}
          size={22}
          tintColor="#ffffff"
        />
        <Text
          style={{
            ...typography.meta,
            color: '#ffffff',
            fontFamily: 'Manrope_500Medium',
            marginTop: 2,
          }}
        >
          {isCompleted ? 'Undo' : 'Done'}
        </Text>
      </Pressable>
    ),
    [isCompleted, handleToggle, theme],
  )

  const renderRightActions = useCallback(
    (_progress: SharedValue<number>, _drag: SharedValue<number>) => (
      <Pressable
        onPress={handleDelete}
        style={{
          backgroundColor: '#D32F2F',
          justifyContent: 'center',
          alignItems: 'center',
          width: 80,
          borderRadius: theme.radius.md,
          marginLeft: theme.spacing.xs,
        }}
      >
        <SymbolView name={TRASH_ICON} size={22} tintColor="#ffffff" />
        <Text
          style={{
            ...typography.meta,
            color: '#ffffff',
            fontFamily: 'Manrope_500Medium',
            marginTop: 2,
          }}
        >
          Delete
        </Text>
      </Pressable>
    ),
    [handleDelete, theme],
  )

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      leftThreshold={40}
      rightThreshold={40}
      overshootLeft={false}
      overshootRight={false}
    >
      <View style={{ backgroundColor: theme.color.background }}>
        <TodoItem
          todo={todo}
          onToggle={onToggle}
          onPress={onPress}
          showListName={showListName}
        />
      </View>
    </ReanimatedSwipeable>
  )
}
