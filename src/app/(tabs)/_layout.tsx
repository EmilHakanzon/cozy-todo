import { Tabs } from 'expo-router'

import { TabBar } from '@/components/tab-bar'

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="upcoming" options={{ title: 'Upcoming' }} />
      <Tabs.Screen name="lists" options={{ title: 'Lists' }} />
    </Tabs>
  )
}
