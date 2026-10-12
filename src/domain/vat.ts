import type { Debtor, InvoiceLine, Service, VatAttribution, VatCode, VatProfile } from './types'

export const VAT_RATE = 0.21

export function lineVat(netCents: number, code: VatCode): number {
  return code === 'standard21' ? Math.round(netCents * VAT_RATE) : 0
}

/** VAT code that actually applies on the invoice, given the practice profile. */
export function effectiveVatCode(code: VatCode, profile: VatProfile): VatCode {
  return code === 'standard21' && profile === 'small' ? 'smallBusiness' : code
}

/** Share of input VAT that may be reclaimed, given the practice profile and what the purchase is used for. */
export function inputVat(
  vatCents: number,
  profile: VatProfile,
  attribution: VatAttribution,
  proRataRate: number,
): { deductibleVatCents: number; nonDeductibleVatCents: number } {
  let deductible: number
  if (profile === 'exempt' || profile === 'small') deductible = 0
  else if (profile === 'taxed') deductible = vatCents
  else if (attribution === 'taxed') deductible = vatCents
  else if (attribution === 'exempt') deductible = 0
  else deductible = Math.round(vatCents * proRataRate)
  return { deductibleVatCents: deductible, nonDeductibleVatCents: vatCents - deductible }
}

/** Algemeen verhoudingsgetal: taxed share of turnover, rounded up to a whole percentage (art. 46 WBTW). */
export function proRata(taxedTurnoverCents: number, totalTurnoverCents: number): number {
  if (totalTurnoverCents <= 0 || taxedTurnoverCents <= 0) return 0
  const percent = Math.ceil(Math.round((taxedTurnoverCents / totalTurnoverCents) * 1e6) / 1e4)
  return Math.min(100, percent) / 100
}

export type VatWarning = 'MISSING_VAT_CODE' | 'EXEMPT_TO_ORGANISATION' | 'ABOVE_MAX_RATE' | 'PEPPOL_REQUIRED'

export function invoiceWarnings(lines: InvoiceLine[], debtor: Debtor, services: Service[]): VatWarning[] {
  const warnings = new Set<VatWarning>()
  for (const line of lines) {
    const service = services.find((s) => s.id === line.serviceId)
    if (!service || service.vatCode === null) warnings.add('MISSING_VAT_CODE')
    if (line.vatCode === 'exempt' && debtor.type === 'organisation') warnings.add('EXEMPT_TO_ORGANISATION')
    if (service?.maxRateCents !== undefined && line.unitCents > service.maxRateCents) warnings.add('ABOVE_MAX_RATE')
    // Since 2026 taxed B2B invoices must be structured e-invoices via Peppol.
    if (line.vatCode === 'standard21' && debtor.type === 'organisation') warnings.add('PEPPOL_REQUIRED')
  }
  return [...warnings]
}
