/**
 * Writes the indicative fiscal parameters to Firestore.
 * Emulator: `npm run seed` (sets FIRESTORE_EMULATOR_HOST).
 * Real project: GOOGLE_APPLICATION_CREDENTIALS=… GCLOUD_PROJECT=<id> npx tsx scripts/seed-fiscal.ts
 */
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { FISCAL_DEFAULTS_2026 } from '../src/domain/fiscal.ts'

initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-boekhouding' })
const db = getFirestore()

await db.doc(`fiscalParameters/${FISCAL_DEFAULTS_2026.year}`).set(FISCAL_DEFAULTS_2026)
console.log(`fiscalParameters/${FISCAL_DEFAULTS_2026.year} geschreven`)
