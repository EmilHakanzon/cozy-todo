import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ChatEmptyState } from '@/components/daily-plan/chat-empty-state'
import { ChatMessageBubble } from '@/components/daily-plan/chat-message-bubble'
import { PlanBacklogRow } from '@/components/daily-plan/plan-backlog-row'
import { PlanHero } from '@/components/daily-plan/plan-hero'
import { PlanSectionLabel } from '@/components/daily-plan/plan-section-label'
import { PlanTodoRow } from '@/components/daily-plan/plan-todo-row'
import {
  getActiveTodos,
  getAllRootTodos,
  getBacklogTodos,
  getOverdueTodos,
  getTodayTodos,
} from '@/features/todos/selectors'
import { useAppTheme } from '@/hooks/use-app-theme'
import { smartAddChat, type ChatMessage, type ParsedTodo } from '@/lib/smart-add'
import { useListStore } from '@/stores/list-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useTodoStore } from '@/stores/todo-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const CLOSE_ICON: SymbolViewProps['name'] = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
}
const SEND_ICON: SymbolViewProps['name'] = {
  ios: 'arrow.up.circle.fill',
  android: 'send',
  web: 'send',
}
const SPARKLE_ICON: SymbolViewProps['name'] = {
  ios: 'sparkles',
  android: 'auto_awesome',
  web: 'auto_awesome',
}
const CHECK_ICON: SymbolViewProps['name'] = {
  ios: 'checkmark.circle.fill',
  android: 'check_circle',
  web: 'check_circle',
}
const CLEAR_ICON: SymbolViewProps['name'] = {
  ios: 'arrow.counterclockwise',
  android: 'refresh',
  web: 'refresh',
}

export default function DailyPlanScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const todosById = useTodoStore((s) => s.todosById)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const createTodo = useTodoStore((s) => s.createTodo)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const listsById = useListStore((s) => s.listsById)
  const timeFormat = useSettingsStore((s) => s.timeFormat)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const chatScrollRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    const isIOS = Platform.OS === 'ios'
    const showSub = Keyboard.addListener(isIOS ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      setIsKeyboardVisible(true)
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 50)
    })
    const hideSub = Keyboard.addListener(isIOS ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setIsKeyboardVisible(false)
    )
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const latestTodos = useMemo(() => {
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const msg = chatMessages[i]
      if (msg.role === 'ai' && msg.todos && msg.todos.length > 0) {
        return msg.todos
      }
    }
    return [] as ParsedTodo[]
  }, [chatMessages])

  const defaultListId = useMemo(() => {
    const lists = Object.values(listsById)
    return lists.length > 0 ? lists[0].id : ''
  }, [listsById])

  const allRootTodos = useMemo(() => getAllRootTodos(todosById), [todosById])
  const overdue = useMemo(() => getOverdueTodos(todosById), [todosById])
  const todayTodos = useMemo(() => getActiveTodos(getTodayTodos(allRootTodos)), [allRootTodos])
  const backlog = useMemo(() => getBacklogTodos(todosById).slice(0, 8), [todosById])

  const totalPlanned = todayTodos.length + overdue.length

  const handleTodoPress = useCallback(
    (id: string) => router.push({ pathname: '/todo/[todoId]', params: { todoId: id } }),
    []
  )

  const handleAddToToday = useCallback(
    (id: string) => {
      const today = new Date().toISOString().split('T')[0]
      updateTodo(id, { dueAt: today })
    },
    [updateTodo]
  )

  const handleSend = useCallback(async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || isSending) return

    const userMsg: ChatMessage = { role: 'user', text: trimmed }
    setChatMessages((prev) => [...prev, userMsg])
    setChatInput('')
    setIsSending(true)
    setChatError('')
    setSuccessMsg('')

    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100)

    try {
      const result = await smartAddChat(chatMessages, trimmed)
      const aiMsg: ChatMessage = {
        role: 'ai',
        text: result.message,
        todos: result.todos,
      }
      setChatMessages((prev) => [...prev, aiMsg])
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100)
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIsSending(false)
    }
  }, [chatInput, chatMessages, isSending])

  const handleCreateTodos = useCallback(() => {
    if (latestTodos.length === 0) return

    for (const parsed of latestTodos) {
      const parentId = createTodo({
        listId: defaultListId,
        title: parsed.title,
        notes: parsed.notes,
        dueAt: parsed.dueAt,
      })

      for (const subtaskTitle of parsed.subtasks) {
        createTodo({
          listId: defaultListId,
          parentId,
          title: subtaskTitle,
        })
      }
    }

    const count = latestTodos.length
    setChatMessages([])
    setSuccessMsg(`Created ${count} ${count === 1 ? 'task' : 'tasks'}`)
    setTimeout(() => setSuccessMsg(''), 3000)
  }, [latestTodos, defaultListId, createTodo])

  const handleClearChat = useCallback(() => {
    setChatMessages([])
    setChatError('')
    setSuccessMsg('')
  }, [])

  const hasChatContent = chatMessages.length > 0

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.color.background }}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View
        style={{
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.xs,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {hasChatContent ? (
          <Pressable
            onPress={handleClearChat}
            hitSlop={8}
            style={({ pressed }) => ({
              opacity: pressed ? 0.5 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            })}
          >
            <SymbolView name={CLEAR_ICON} size={16} tintColor={theme.color.text2} />
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>New chat</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <SymbolView name={CLOSE_ICON} size={20} tintColor={theme.color.text2} />
        </Pressable>
      </View>

      <ScrollView
        ref={chatScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onContentSizeChange={() => {
          if (hasChatContent) {
            chatScrollRef.current?.scrollToEnd({ animated: true })
          }
        }}
      >
        {/* Hero greeting card */}
        <PlanHero totalPlanned={totalPlanned} />

        {/* Chat messages */}
        {chatMessages.length === 0 && !successMsg && (
          <ChatEmptyState
            onPickExample={(text) => {
              setChatInput(text)
              inputRef.current?.focus()
            }}
          />
        )}

        {successMsg !== '' && (
          <View
            style={{
              marginHorizontal: theme.spacing.lg,
              backgroundColor: theme.color.accentSoft,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              marginBottom: theme.spacing.md,
            }}
          >
            <SymbolView name={CHECK_ICON} size={20} tintColor={theme.color.accent} />
            <Text style={{ ...typography.body, color: theme.color.accent }}>{successMsg}</Text>
          </View>
        )}

        {chatMessages.map((msg, i) => (
          <ChatMessageBubble key={i} message={msg} timeFormat={timeFormat} />
        ))}

        {isSending && (
          <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
            <View
              style={{
                backgroundColor: theme.color.surfaceSoft,
                borderRadius: theme.radius.lg,
                borderBottomLeftRadius: theme.radius.sm,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                alignSelf: 'flex-start',
              }}
            >
              <ActivityIndicator color={theme.color.accent} size="small" />
            </View>
          </View>
        )}

        {chatError !== '' && (
          <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
            <Text style={{ ...typography.meta, color: theme.color.overdue }}>{chatError}</Text>
          </View>
        )}

        {/* Create tasks button */}
        {latestTodos.length > 0 && !isSending && (
          <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xs }}>
            <Pressable
              onPress={handleCreateTodos}
              style={({ pressed }) => ({
                backgroundColor: theme.color.accent,
                borderRadius: theme.radius.md,
                paddingVertical: theme.spacing.sm,
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  ...typography.body,
                  fontFamily: 'Manrope_600SemiBold',
                  color: '#ffffff',
                }}
              >
                Create {latestTodos.length === 1 ? 'task' : `${latestTodos.length} tasks`}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Overdue card */}
        {overdue.length > 0 && !hasChatContent && (
          <View
            style={{
              marginHorizontal: theme.spacing.lg,
              marginTop: theme.spacing.md,
              marginBottom: theme.spacing.md,
            }}
          >
            <PlanSectionLabel label="OVERDUE" count={overdue.length} color={theme.color.overdue} />
            <View
              style={{
                backgroundColor: theme.color.surface,
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                borderColor: theme.color.overdue + '30',
                overflow: 'hidden',
              }}
            >
              {overdue.map((todo, i) => (
                <PlanTodoRow
                  key={todo.id}
                  todo={todo}
                  onToggle={toggleTodo}
                  onPress={handleTodoPress}
                  showBorder={i < overdue.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* Today card */}
        {!hasChatContent && (
          <View
            style={{
              marginHorizontal: theme.spacing.lg,
              marginBottom: theme.spacing.md,
            }}
          >
            <PlanSectionLabel label="TODAY" count={todayTodos.length} color={theme.color.accent} />
            {todayTodos.length > 0 ? (
              <View
                style={{
                  backgroundColor: theme.color.surface,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: theme.color.border,
                  overflow: 'hidden',
                }}
              >
                {todayTodos.map((todo, i) => (
                  <PlanTodoRow
                    key={todo.id}
                    todo={todo}
                    onToggle={toggleTodo}
                    onPress={handleTodoPress}
                    showBorder={i < todayTodos.length - 1}
                  />
                ))}
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: theme.color.surface,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: theme.color.border,
                  padding: theme.spacing.lg,
                  alignItems: 'center',
                }}
              >
                <Text style={{ ...typography.body, color: theme.color.text2 }}>
                  Nothing scheduled yet
                </Text>
                <Text style={{ ...typography.meta, color: theme.color.text2, paddingTop: 2 }}>
                  Pick from your backlog or use Smart Add
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Backlog — pick tasks */}
        {backlog.length > 0 && !hasChatContent && (
          <View style={{ marginHorizontal: theme.spacing.lg }}>
            <PlanSectionLabel
              label="ADD TO TODAY"
              count={backlog.length}
              color={theme.color.text2}
            />
            <View
              style={{
                backgroundColor: theme.color.surfaceSoft,
                borderRadius: theme.radius.lg,
                overflow: 'hidden',
              }}
            >
              {backlog.map((todo, i) => (
                <PlanBacklogRow
                  key={todo.id}
                  todo={todo}
                  onPress={handleTodoPress}
                  onAddToToday={handleAddToToday}
                  showBorder={i < backlog.length - 1}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Chat input bar — pinned to bottom */}
      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.xs,
          paddingBottom: isKeyboardVisible ? theme.spacing.xs : insets.bottom + theme.spacing.xs,
          backgroundColor: theme.color.background,
          borderTopWidth: 1,
          borderTopColor: theme.color.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            backgroundColor: theme.color.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.color.border,
            paddingLeft: theme.spacing.md,
            paddingRight: theme.spacing.xs,
            paddingVertical: theme.spacing.xs,
          }}
        >
          <SymbolView
            name={SPARKLE_ICON}
            size={18}
            tintColor={theme.color.accent}
            style={{ marginBottom: 8 }}
          />
          <TextInput
            ref={inputRef}
            value={chatInput}
            onChangeText={(text) => {
              setChatInput(text)
              setChatError('')
            }}
            placeholder={hasChatContent ? 'Refine or add more...' : 'Describe your tasks...'}
            placeholderTextColor={theme.color.text2}
            multiline
            returnKeyType="default"
            editable={!isSending}
            style={{
              ...typography.body,
              flex: 1,
              color: theme.color.text,
              paddingHorizontal: theme.spacing.xs,
              paddingVertical: theme.spacing.micro,
              maxHeight: 100,
            }}
          />
          {isSending ? (
            <ActivityIndicator
              color={theme.color.accent}
              style={{ marginBottom: 6, marginRight: 4 }}
            />
          ) : (
            chatInput.trim().length > 0 && (
              <Pressable
                onPress={handleSend}
                hitSlop={8}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  marginBottom: 4,
                })}
              >
                <SymbolView name={SEND_ICON} size={28} tintColor={theme.color.accent} />
              </Pressable>
            )
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
