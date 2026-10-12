export interface FiscalParameters {
  year: number
  incomeTaxBrackets: { upToCents: number | null; rate: number }[]
  zvwRate: number
  zvwMaxIncomeCents: number
  zelfstandigenaftrekCents: number
  startersaftrekCents: number
  mkbWinstvrijstellingRate: number
  urencriteriumHours: number
  korThresholdCents: number
  mileageRateCents: number
  capitalizeThresholdCents: number
  kia: { fromCents: number; toCents: number; rate: number }[]
  /** False until a tax adviser has confirmed the values. */
  verified: boolean
}

/** Indicative 2026 values — controleer met je fiscalist. Stored in Firestore `fiscalParameters/2026`; this is the seed and fallback. */
export const FISCAL_DEFAULTS_2026: FiscalParameters = {
  year: 2026,
  incomeTaxBrackets: [
    { upToCents: 3888300, rate: 0.3575 },
    { upToCents: 7842600, rate: 0.3756 },
    { upToCents: null, rate: 0.495 },
  ],
  zvwRate: 0.0485,
  zvwMaxIncomeCents: 7940900,
  zelfstandigenaftrekCents: 120000,
  startersaftrekCents: 212300,
  mkbWinstvrijstellingRate: 0.127,
  urencriteriumHours: 1225,
  korThresholdCents: 2000000,
  mileageRateCents: 23,
  capitalizeThresholdCents: 45000,
  kia: [{ fromCents: 290100, toCents: 7168300, rate: 0.28 }],
  verified: false,
}
