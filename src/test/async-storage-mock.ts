// In-memory stand-in för AsyncStorage i testmiljön.
// Riktiga modulen är byggd för en React Native-runtime och når efter `window`,
// som inte finns i vitest `node`-miljön. Aliasas i vitest.config.mts.
const storage = new Map<string, string>()

const AsyncStorageMock = {
  getItem: async (key: string) => storage.get(key) ?? null,

  setItem: async (key: string, value: string) => {
    storage.set(key, value)
  },

  removeItem: async (key: string) => {
    storage.delete(key)
  },

  clear: async () => {
    storage.clear()
  },

  getAllKeys: async () => [...storage.keys()],
}

export default AsyncStorageMock
