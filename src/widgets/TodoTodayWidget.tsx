'use no memo'

import React from 'react'
import { FlexWidget, ListWidget, TextWidget } from 'react-native-android-widget'

import type { WidgetData, WidgetTodo } from './widget-data'

const COLORS = {
  bg: '#1e2119',
  surface: '#222520',
  text: '#e8e4da',
  textSecondary: '#9a9689',
  textDimmed: '#6a6558',
  accent: '#8bab7a',
  border: '#3a3f35',
  tagRed: '#c47a5a',
  tagOrange: '#c4935a',
  tagYellow: '#c4a85a',
  tagGreen: '#8bab7a',
  tagBlue: '#5a8ac4',
  tagPurple: '#9a7ab8',
  tagPink: '#b87a9a',
  tagGray: '#9a9689',
} as const

const FONT_REGULAR = 'Manrope_400Regular'
const FONT_SEMIBOLD = 'Manrope_600SemiBold'

function tagColorToHex(color: string | null): `#${string}` | null {
  if (!color) return null
  const map: Record<string, `#${string}`> = {
    red: COLORS.tagRed,
    orange: COLORS.tagOrange,
    yellow: COLORS.tagYellow,
    green: COLORS.tagGreen,
    blue: COLORS.tagBlue,
    purple: COLORS.tagPurple,
    pink: COLORS.tagPink,
    gray: COLORS.tagGray,
  }
  return map[color] ?? null
}

function WidgetHeader() {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'wrap_content',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text="📋"
          style={{ fontSize: 16, marginRight: 6 }}
        />
        <TextWidget
          text="Today"
          style={{ fontSize: 16, fontFamily: FONT_SEMIBOLD, color: COLORS.text }}
        />
      </FlexWidget>
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'cozytodo://quick-add' }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: COLORS.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          <TextWidget text="+" style={{ fontSize: 16, fontFamily: FONT_SEMIBOLD, color: '#ffffff' }} />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'cozytodo://smart-add' }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: COLORS.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget text="✨" style={{ fontSize: 14 }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  )
}

function WidgetDivider() {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 1,
        backgroundColor: COLORS.border,
      }}
    />
  )
}

function TodoRow({ todo }: { todo: WidgetTodo }) {
  const tagHex = tagColorToHex(todo.tagColor)

  return (
    <FlexWidget
      key={todo.id}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `cozytodo://todo/${todo.id}` }}
      style={{
        width: 'match_parent',
        height: 'wrap_content',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <FlexWidget
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: todo.completed ? COLORS.accent : COLORS.textSecondary,
          backgroundColor: todo.completed ? COLORS.accent : undefined,
          marginRight: 10,
        }}
      />
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget
            text={todo.title}
            maxLines={1}
            truncate="END"
            style={{
              width: 'match_parent',
              fontSize: 14,
              fontFamily: FONT_REGULAR,
              color: todo.completed ? COLORS.textDimmed : COLORS.text,
            }}
          />
        </FlexWidget>
        {tagHex ? (
          <FlexWidget
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: tagHex,
              marginLeft: 8,
            }}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  )
}

function EmptyState() {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text="No tasks for today"
        style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: FONT_REGULAR }}
      />
      <TextWidget
        text="Enjoy your day!"
        style={{ fontSize: 12, color: COLORS.textDimmed, fontFamily: FONT_REGULAR, marginTop: 4 }}
      />
    </FlexWidget>
  )
}

export function TodoTodayWidget({ data }: { data: WidgetData }) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: COLORS.bg,
        flexDirection: 'column',
        borderRadius: 16,
      }}
    >
      <WidgetHeader />
      <WidgetDivider />
      {data.todos.length === 0 ? (
        <EmptyState />
      ) : (
        <ListWidget
          style={{
            width: 'match_parent',
            height: 'match_parent',
          }}
        >
          {data.todos.map((todo) => (
            <TodoRow key={todo.id} todo={todo} />
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  )
}
