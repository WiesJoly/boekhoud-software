export interface Bracket {
  upToCents: number | null
  rate: number
}

export interface FiscalParameters {
  year: number
  /** Personenbelasting, progressive brackets on net taxable professional income. */
  incomeTaxBrackets: Bracket[]
  /** Belastingvrije som (basisbedrag, alleenstaande zonder personen ten laste). */
  taxFreeAmountCents: number
  /** Aanvullende gemeentebelasting as a share of the income tax. */
  municipalTaxRate: number
  /** Sociale bijdragen zelfstandige in hoofdberoep. */
  socialContribution: { tiers: Bracket[]; minimumYearCents: number; managementFeeRate: number }
  /** Vrijstellingsregeling kleine ondernemingen (btw). */
  smallBusinessThresholdCents: number
  /** Optional kilometre rate for the mileage log; 0 = log only (self-employed deduct actual car costs). */
  mileageRateCents: number
  capitalizeThresholdCents: number
  /** False until an accountant has confirmed the values. */
  verified: boolean
}

/** Indicative values inkomstenjaar 2026 / aanslagjaar 2027 — controleer met je boekhouder. Seed and fallback for `fiscalParameters/2026`. */
export const FISCAL_DEFAULTS_2026: FiscalParameters = {
  year: 2026,
  incomeTaxBrackets: [
    { upToCents: 1672000, rate: 0.25 },
    { upToCents: 2951000, rate: 0.4 },
    { upToCents: 5107000, rate: 0.45 },
    { upToCents: null, rate: 0.5 },
  ],
  taxFreeAmountCents: 1118000,
  municipalTaxRate: 0.07,
  socialContribution: {
    tiers: [
      { upToCents: 7502454, rate: 0.205 },
      { upToCents: 11056242, rate: 0.1416 },
      { upToCents: null, rate: 0 },
    ],
    minimumYearCents: 356168,
    managementFeeRate: 0.04,
  },
  smallBusinessThresholdCents: 2500000,
  mileageRateCents: 0,
  capitalizeThresholdCents: 100000,
  verified: false,
}
