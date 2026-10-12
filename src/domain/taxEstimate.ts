import type { Bracket, FiscalParameters } from './fiscal'

export interface TaxEstimate {
  socialContributionsCents: number
  taxableIncomeCents: number
  incomeTaxCents: number
  municipalTaxCents: number
  totalCents: number
}

function progressive(amount: number, brackets: Bracket[]): number {
  let total = 0
  let lower = 0
  for (const b of brackets) {
    const upper = b.upToCents ?? Infinity
    if (amount > lower) total += (Math.min(amount, upper) - lower) * b.rate
    lower = upper
  }
  return total
}

/**
 * Sociale bijdragen zelfstandige in hoofdberoep. Contributions are themselves deductible,
 * so the base is the profit after contributions: solve c = max(minimum, tiers(profit − c)) × (1 + fee).
 */
export function socialContributions(profitCents: number, params: FiscalParameters): number {
  const { tiers, minimumYearCents, managementFeeRate } = params.socialContribution
  let c = 0
  for (let i = 0; i < 50; i++) {
    c = Math.max(minimumYearCents, progressive(Math.max(0, profitCents - c), tiers)) * (1 + managementFeeRate)
  }
  return Math.round(c)
}

/** Personenbelasting + gemeentebelasting + sociale bijdragen. Simplified: single, no dependants, no other income or deductions. */
export function estimateTax(input: { profitCents: number; params: FiscalParameters }): TaxEstimate {
  const { profitCents, params } = input
  const social = socialContributions(profitCents, params)
  const taxable = Math.max(0, Math.round(profitCents - social))
  const gross = progressive(taxable, params.incomeTaxBrackets)
  const taxFreeReduction = progressive(Math.min(taxable, params.taxFreeAmountCents), params.incomeTaxBrackets)
  const incomeTax = Math.max(0, Math.round(gross - taxFreeReduction))
  const municipal = Math.round(incomeTax * params.municipalTaxRate)
  return {
    socialContributionsCents: social,
    taxableIncomeCents: taxable,
    incomeTaxCents: incomeTax,
    municipalTaxCents: municipal,
    totalCents: social + incomeTax + municipal,
  }
}

export function dayOfYear(date: string): number {
  const d = Date.parse(`${date}T00:00:00Z`)
  return Math.round((d - Date.parse(`${date.slice(0, 4)}-01-01T00:00:00Z`)) / 86_400_000) + 1
}

const daysInYear = (year: number) => ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365)

/** What to set aside for the profit made so far (voorafbetalingen + sociale bijdragen), via an annualised projection. */
export function reservationToDate(profitToDateCents: number, today: string, params: FiscalParameters): number {
  const elapsed = dayOfYear(today)
  const factor = daysInYear(Number(today.slice(0, 4))) / elapsed
  const projected = estimateTax({ profitCents: profitToDateCents * factor, params })
  return Math.round(projected.totalCents / factor)
}
