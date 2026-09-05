// Minimal stand-in för react-native i testmiljön.
// Riktiga modulen är byggd för en React Native-runtime (Flow-syntax, native
// bindings) som varken node-miljön eller vitest/rolldown kan tolka.
// Aliasas i vitest.config.mts. Utöka med fler exports vid behov.
export const Platform = {
  OS: 'ios',
  select: <T>(spec: Record<string, T>) => spec.ios ?? spec.default,
}
