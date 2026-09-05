import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@react-native-async-storage/async-storage': fileURLToPath(
        new URL('./src/test/async-storage-mock.ts', import.meta.url)
      ),
      'expo-notifications': fileURLToPath(
        new URL('./src/test/expo-notifications-mock.ts', import.meta.url)
      ),
      'react-native-android-widget': fileURLToPath(
        new URL('./src/test/react-native-android-widget-mock.ts', import.meta.url)
      ),
      'react-native': fileURLToPath(
        new URL('./src/test/react-native-mock.ts', import.meta.url)
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
