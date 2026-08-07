// Skriver ut projektets native-fingerprint för Android.
//
// Ändras hashen sedan din senaste dev build behöver du bygga om med
// `npm run build:dev`. Ändras den inte räcker `npm run dev` — JS-ändringar
// laddas om direkt utan ny build.
import { createFingerprintAsync } from '@expo/fingerprint'

const { hash } = await createFingerprintAsync(process.cwd(), {
  platforms: ['android'],
})

console.log(hash)
