import { GlassView } from 'expo-glass-effect'
import { SymbolView } from 'expo-symbols'
import { Platform, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useQuickAddStore } from '@/stores/quick-add-store'
import { typography } from '@/themes/typography'

import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs'
import type { SymbolViewProps } from 'expo-symbols'

type IconName = SymbolViewProps['name']

const TAB_ICONS: Record<string, { label: string; icon: IconName }> = {
  index: {
    label: 'Today',
    icon: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  },
  upcoming: {
    label: 'Upcoming',
    icon: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  },
  lists: {
    label: 'Lists',
    icon: { ios: 'square.stack.3d.up', android: 'stacks', web: 'stacks' },
  },
}

const FAB_ICON: IconName = { ios: 'plus', android: 'add', web: 'add' }

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { theme, resolvedTheme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const openQuickAdd = useQuickAddStore((s) => s.open)

  const Wrapper = Platform.OS === 'ios' ? GlassView : View
  const wrapperProps =
    Platform.OS === 'ios'
      ? { glassEffectStyle: 'regular' as const, colorScheme: resolvedTheme as 'light' | 'dark' }
      : {}

  return (
    <View
      style={{
        position: 'absolute',
        bottom: insets.bottom + theme.spacing.xs,
        left: theme.spacing.md,
        right: theme.spacing.md,
      }}
    >
      <Wrapper
        {...wrapperProps}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radius.xl,
          ...(Platform.OS !== 'ios' && {
            backgroundColor:
              resolvedTheme === 'dark' ? 'rgba(33, 35, 31, 0.92)' : 'rgba(252, 251, 248, 0.92)',
            borderWidth: 1,
            borderColor: theme.color.border,
          }),
        }}
      >
        {state.routes.map((route, index) => {
          const config = TAB_ICONS[route.name]
          if (!config) return null

          const isFocused = state.index === index

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params)
            }
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={config.label}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: theme.spacing.micro,
                gap: theme.spacing.micro,
              }}
            >
              <SymbolView
                name={config.icon}
                size={22}
                tintColor={isFocused ? theme.color.accent : theme.color.text2}
              />
              <Text
                style={{
                  ...typography.meta,
                  fontSize: 11,
                  color: isFocused ? theme.color.accent : theme.color.text2,
                }}
              >
                {config.label}
              </Text>
            </Pressable>
          )
        })}

        <Pressable
          onPress={() => openQuickAdd()}
          accessibilityRole="button"
          accessibilityLabel="Add task"
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: theme.radius.full,
            backgroundColor: theme.color.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: theme.spacing.xs,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <SymbolView name={FAB_ICON} size={24} tintColor="#ffffff" />
        </Pressable>
      </Wrapper>
    </View>
  )
}
