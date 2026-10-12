import { doc, getDoc } from 'firebase/firestore'
import { FISCAL_DEFAULTS_2026, type FiscalParameters } from '../domain/fiscal'
import { db } from '../firebase'

/** Loads the parameters for a year; falls back to the built-in indicative 2026 values when none are stored. */
export async function loadFiscal(year: number): Promise<{ params: FiscalParameters; usingDefaults: boolean }> {
  const snap = await getDoc(doc(db, 'fiscalParameters', String(year)))
  if (snap.exists()) return { params: snap.data() as FiscalParameters, usingDefaults: false }
  return { params: { ...FISCAL_DEFAULTS_2026, year }, usingDefaults: true }
}
