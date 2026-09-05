import { useState, useMemo } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SettingsScreenHeader } from '@/components/settings-screen-header'
import { SegmentedControl } from '@/components/segmented-control'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useAiUsageStore, aggregateUsage, filterByRange } from '@/stores/ai-usage-store'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

type Range = 'day' | 'week' | 'month'

const RANGE_SEGMENTS = [
  { key: 'day' as const, label: 'Today' },
  { key: 'week' as const, label: 'Week' },
  { key: 'month' as const, label: 'Month' },
]

const TRASH_ICON: SymbolViewProps['name'] = {
  ios: 'trash',
  android: 'delete',
  web: 'delete',
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.color.surfaceSoft,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        gap: theme.spacing.micro,
      }}
    >
      <Text style={{ ...typography.meta, color: theme.color.text2 }}>{label}</Text>
      <Text
        style={{
          ...typography.screenTitle,
          fontSize: 22,
          color: theme.color.text,
        }}
      >
        {value}
      </Text>
      {sub && (
        <Text style={{ ...typography.meta, color: theme.color.text2 }}>{sub}</Text>
      )}
    </View>
  )
}

function UsageBar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const { theme } = useAppTheme()
  const pct = max > 0 ? Math.min(value / max, 1) : 0

  return (
    <View style={{ gap: theme.spacing.micro }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ ...typography.body, color: theme.color.text }}>{label}</Text>
        <Text style={{ ...typography.meta, color: theme.color.text2 }}>
          {formatTokens(value)}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.color.surface,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            borderRadius: 4,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  )
}

export default function AiUsageScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const entries = useAiUsageStore((s) => s.entries)
  const clearUsage = useAiUsageStore((s) => s.clearUsage)

  const [range, setRange] = useState<Range>('day')

  const filtered = useMemo(() => filterByRange(entries, range), [entries, range])
  const stats = useMemo(() => aggregateUsage(filtered), [filtered])
  const allTimeStats = useMemo(() => aggregateUsage(entries), [entries])

  const handleClear = () => {
    Alert.alert(
      'Clear Usage Data',
      'This will remove all tracked AI usage. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearUsage },
      ],
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <SettingsScreenHeader
        title="AI Usage"
        rightAction={
          entries.length > 0 ? (
            <Pressable onPress={handleClear} hitSlop={8}>
              <SymbolView name={TRASH_ICON} size={20} tintColor={theme.color.text2} />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: insets.bottom + 40,
          gap: theme.spacing.lg,
        }}
      >
        <SegmentedControl segments={RANGE_SEGMENTS} value={range} onChange={setRange} />

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <StatCard label="Requests" value={String(stats.requests)} />
          <StatCard label="Cost" value={formatCost(stats.cost)} />
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <StatCard
            label="Total tokens"
            value={formatTokens(stats.totalTokens)}
          />
          <StatCard
            label="Model"
            value="4o-mini"
            sub="gpt-4o-mini"
          />
        </View>

        <View
          style={{
            backgroundColor: theme.color.surfaceSoft,
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
          }}
        >
          <Text style={{ ...typography.sectionTitle, color: theme.color.text2 }}>
            TOKEN BREAKDOWN
          </Text>
          <UsageBar
            label="Input"
            value={stats.promptTokens}
            max={stats.totalTokens}
            color={theme.color.accent}
          />
          <UsageBar
            label="Output"
            value={stats.completionTokens}
            max={stats.totalTokens}
            color="#7ab8d4"
          />
        </View>

        <View
          style={{
            backgroundColor: theme.color.surfaceSoft,
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            gap: theme.spacing.sm,
          }}
        >
          <Text style={{ ...typography.sectionTitle, color: theme.color.text2 }}>
            PRICING (GPT-4O-MINI)
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ ...typography.body, color: theme.color.text }}>Input</Text>
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              $0.15 / 1M tokens
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ ...typography.body, color: theme.color.text }}>Output</Text>
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              $0.60 / 1M tokens
            </Text>
          </View>
        </View>

        {allTimeStats.requests > 0 && (
          <View
            style={{
              backgroundColor: theme.color.surfaceSoft,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              gap: theme.spacing.sm,
            }}
          >
            <Text style={{ ...typography.sectionTitle, color: theme.color.text2 }}>
              ALL TIME
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...typography.body, color: theme.color.text }}>Requests</Text>
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                {allTimeStats.requests}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...typography.body, color: theme.color.text }}>Tokens</Text>
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                {formatTokens(allTimeStats.totalTokens)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...typography.body, color: theme.color.text }}>Cost</Text>
              <Text style={{ ...typography.meta, color: theme.color.text2 }}>
                {formatCost(allTimeStats.cost)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
