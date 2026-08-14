// UUID v4 i ren JS — medvetet INTE expo-crypto.
//
// expo-crypto är en native modul och kräver en ny dev client-build varje gång.
// Hermes saknar dessutom `crypto` som global, så webb-API:t finns inte heller.
// Math.random är inte kryptografiskt säkert, men dessa id:n är lokala nycklar
// i en AsyncStorage-map — de lämnar aldrig enheten och är inga tokens.
// Byt till expo-crypto (och bygg om dev clienten) om id:n någon gång blir
// säkerhetskänsliga, t.ex. delningslänkar.
export function createId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8

    return value.toString(16)
  })
}
