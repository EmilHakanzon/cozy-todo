import { useState } from 'react'
import { Text, View } from 'react-native'

import { PendingTagEditor } from '@/components/daily-plan/pending-tag-editor'
import { PendingTagPill } from '@/components/daily-plan/pending-tag-pill'
import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { PendingTag, PlanTask } from '@/features/daily-plan/types'
import type { TagColor } from '@/features/tags/types'

type TaskPreviewCardProps = {
  tasks: PlanTask[]
  timeFormat: string
  onChangeTags: (taskIndex: number, tags: PendingTag[]) => void
}

export function TaskPreviewCard({ tasks, timeFormat, onChangeTags }: TaskPreviewCardProps) {
  const { theme } = useAppTheme()
  const [editingTagIndex, setEditingTagIndex] = useState<{
    taskIndex: number
    tagIndex: number
  } | null>(null)

  const editingTag =
    editingTagIndex !== null
      ? (tasks[editingTagIndex.taskIndex]?.tags[editingTagIndex.tagIndex] ?? null)
      : null

  const closeEditor = () => setEditingTagIndex(null)

  const handleChangeColor = (color: TagColor) => {
    if (editingTagIndex === null) return
    const { taskIndex, tagIndex } = editingTagIndex
    const nextTags = tasks[taskIndex].tags.map((t, i) =>
      i === tagIndex ? { ...t, color } : t,
    )
    onChangeTags(taskIndex, nextTags)
  }

  const handleRemoveTag = () => {
    if (editingTagIndex === null) return
    const { taskIndex, tagIndex } = editingTagIndex
    const nextTags = tasks[taskIndex].tags.filter((_, i) => i !== tagIndex)
    onChangeTags(taskIndex, nextTags)
  }

  return (
    <View
      style={{
        marginTop: theme.spacing.xs,
        backgroundColor: theme.color.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.color.accent + '30',
        overflow: 'hidden',
      }}
    >
      {tasks.map((task, j) => (
        <TaskPreviewRow
          key={j}
          task={task}
          showBorder={j < tasks.length - 1}
          timeFormat={timeFormat}
          onTagPress={(tagIndex) => setEditingTagIndex({ taskIndex: j, tagIndex })}
        />
      ))}

      <PendingTagEditor
        visible={editingTagIndex !== null}
        tag={editingTag}
        onChangeColor={handleChangeColor}
        onRemove={handleRemoveTag}
        onClose={closeEditor}
      />
    </View>
  )
}

function TaskPreviewRow({
  task,
  showBorder,
  timeFormat,
  onTagPress,
}: {
  task: PlanTask
  showBorder: boolean
  timeFormat: string
  onTagPress: (tagIndex: number) => void
}) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        padding: theme.spacing.md,
        borderBottomWidth: showBorder ? 1 : 0,
        borderBottomColor: theme.color.border,
      }}
    >
      <Text
        style={{
          ...typography.body,
          fontFamily: 'Manrope_600SemiBold',
          color: theme.color.text,
        }}
      >
        {task.title}
      </Text>
      {task.tags.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.micro,
            paddingTop: 4,
          }}
        >
          {task.tags.map((tag, tagIndex) => (
            <PendingTagPill key={tagIndex} tag={tag} onPress={() => onTagPress(tagIndex)} />
          ))}
        </View>
      )}
      {task.dueAt && (
        <Text
          style={{
            ...typography.meta,
            color: theme.color.accent,
            paddingTop: 2,
          }}
        >
          {new Date(task.dueAt).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            ...(task.dueAt.includes('T')
              ? {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: timeFormat === '12h',
                }
              : {}),
          })}
        </Text>
      )}
      {task.notes !== '' && (
        <Text
          style={{
            ...typography.meta,
            color: theme.color.text2,
            paddingTop: 2,
          }}
          numberOfLines={2}
        >
          {task.notes}
        </Text>
      )}
      {task.subtasks.length > 0 && (
        <View style={{ paddingTop: theme.spacing.xs }}>
          {task.subtasks.map((sub, j) => (
            <View
              key={j}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                paddingVertical: 2,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  borderWidth: 1,
                  borderColor: theme.color.text2,
                }}
              />
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>{sub}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
