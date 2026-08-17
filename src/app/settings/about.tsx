import { ScrollView, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SettingsRow } from '@/components/settings-row'
import { SettingsScreenHeader } from '@/components/settings-screen-header'
import { useAppTheme } from '@/hooks/use-app-theme'
import { typography } from '@/themes/typography'

import type { SymbolViewProps } from 'expo-symbols'

const APP_ICON: SymbolViewProps['name'] = {
  ios: 'leaf',
  android: 'eco',
  web: 'eco',
}

const ICONS = {
  whatsNew: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as SymbolViewProps['name'],
  help: { ios: 'questionmark.circle', android: 'help', web: 'help' } as SymbolViewProps['name'],
  feedback: { ios: 'envelope', android: 'mail', web: 'mail' } as SymbolViewProps['name'],
  rate: { ios: 'star', android: 'star', web: 'star' } as SymbolViewProps['name'],
  terms: { ios: 'doc.text', android: 'description', web: 'description' } as SymbolViewProps['name'],
  privacy: { ios: 'lock.shield', android: 'shield', web: 'shield' } as SymbolViewProps['name'],
  licenses: { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' } as SymbolViewProps['name'],
}

export default function AboutScreen() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background }}>
      <SettingsScreenHeader title="About" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            paddingVertical: theme.spacing.lg,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.color.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SymbolView name={APP_ICON} size={28} tintColor={theme.color.accent} />
          </View>
          <View>
            <Text style={{ ...typography.screenTitle, fontSize: 24, color: theme.color.text }}>
              Planora
            </Text>
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              v1.0.0
            </Text>
            <Text style={{ ...typography.meta, color: theme.color.text2 }}>
              Build a life that feels good.
            </Text>
          </View>
        </View>

        <SettingsRow icon={ICONS.whatsNew} label="What's new" disabled />
        <SettingsRow icon={ICONS.help} label="Help & support" disabled />
        <SettingsRow icon={ICONS.feedback} label="Send feedback" disabled />
        <SettingsRow icon={ICONS.rate} label="Rate the app" disabled />

        <Text
          style={{
            ...typography.sectionTitle,
            color: theme.color.text2,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.xs,
          }}
        >
          LEGAL
        </Text>

        <SettingsRow icon={ICONS.terms} label="Terms of service" disabled />
        <SettingsRow icon={ICONS.privacy} label="Privacy policy" disabled />
        <SettingsRow icon={ICONS.licenses} label="Open source licenses" disabled />

        <Text
          style={{
            ...typography.meta,
            color: theme.color.text2,
            textAlign: 'center',
            paddingTop: theme.spacing.xl,
          }}
        >
          © 2026 Planora. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  )
}
