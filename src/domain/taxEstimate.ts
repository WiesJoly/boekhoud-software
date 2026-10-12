import type { FiscalParameters } from './fiscal'

export interface TaxEstimate {
  taxableProfitCents: number
  incomeTaxCents: number
  zvwCents: number
  totalCents: number
  zelfstandigenaftrekApplied: boolean
}

/** Income tax + Zvw on business profit. Heffingskortingen are deliberately ignored, so the estimate errs on the safe side. */
export function estimateTax(input: { profitCents: number; hours: number; isStarter: boolean; params: FiscalParameters }): TaxEstimate {
  const { profitCents, hours, isStarter, params } = input
  const applied = hours >= params.urencriteriumHours
  const deduction = applied ? params.zelfstandigenaftrekCents + (isStarter ? params.startersaftrekCents : 0) : 0
  const afterDeduction = Math.max(0, profitCents - deduction)
  const taxable = Math.round(afterDeduction * (1 - params.mkbWinstvrijstellingRate))

  let incomeTax = 0
  let lower = 0
  for (const bracket of params.incomeTaxBrackets) {
    const upper = bracket.upToCents ?? Infinity
    if (taxable > lower) incomeTax += (Math.min(taxable, upper) - lower) * bracket.rate
    lower = upper
  }
  const incomeTaxCents = Math.round(incomeTax)
  const zvwCents = Math.round(Math.min(taxable, params.zvwMaxIncomeCents) * params.zvwRate)
  return { taxableProfitCents: taxable, incomeTaxCents, zvwCents, totalCents: incomeTaxCents + zvwCents, zelfstandigenaftrekApplied: applied }
}

export function dayOfYear(date: string): number {
  const d = Date.parse(`${date}T00:00:00Z`)
  return Math.round((d - Date.parse(`${date.slice(0, 4)}-01-01T00:00:00Z`)) / 86_400_000) + 1
}

const daysInYear = (year: number) => ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365)

/** Tax to set aside for the profit made so far, using an annualised projection so the brackets apply realistically. */
export function reservationToDate(profitToDateCents: number, today: string, hoursToDate: number, isStarter: boolean, params: FiscalParameters): number {
  const elapsed = dayOfYear(today)
  const total = daysInYear(Number(today.slice(0, 4)))
  const factor = total / elapsed
  const projected = estimateTax({ profitCents: profitToDateCents * factor, hours: hoursToDate * factor, isStarter, params })
  return Math.round(projected.totalCents / factor)
}
