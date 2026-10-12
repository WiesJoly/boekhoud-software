import type { Debtor, InvoiceLine, Service, VatAttribution, VatCode, VatProfile } from './types'

export const VAT_RATE = 0.21

export function lineVat(netCents: number, code: VatCode): number {
  return code === 'standard21' ? Math.round(netCents * VAT_RATE) : 0
}

/** Share of input VAT that may be reclaimed, given the practice profile and what the purchase is used for. */
export function inputVat(
  vatCents: number,
  profile: VatProfile,
  attribution: VatAttribution,
  proRataRate: number,
): { deductibleVatCents: number; nonDeductibleVatCents: number } {
  let deductible: number
  if (profile === 'exempt') deductible = 0
  else if (profile === 'taxed') deductible = vatCents
  else if (attribution === 'taxed') deductible = vatCents
  else if (attribution === 'exempt') deductible = 0
  else deductible = Math.round(vatCents * proRataRate)
  return { deductibleVatCents: deductible, nonDeductibleVatCents: vatCents - deductible }
}

export function proRata(taxedTurnoverCents: number, totalTurnoverCents: number): number {
  if (totalTurnoverCents <= 0) return 0
  return Math.min(1, Math.max(0, taxedTurnoverCents / totalTurnoverCents))
}

export type VatWarning = 'MISSING_VAT_CODE' | 'EXEMPT_TO_ORGANISATION' | 'ABOVE_NZA_MAX'

export function invoiceWarnings(lines: InvoiceLine[], debtor: Debtor, services: Service[]): VatWarning[] {
  const warnings = new Set<VatWarning>()
  for (const line of lines) {
    const service = services.find((s) => s.id === line.serviceId)
    if (!service || service.vatCode === null) warnings.add('MISSING_VAT_CODE')
    if (line.vatCode === 'exempt' && debtor.type === 'organisation') warnings.add('EXEMPT_TO_ORGANISATION')
    if (service?.nzaMaxCents !== undefined && line.unitCents > service.nzaMaxCents) warnings.add('ABOVE_NZA_MAX')
  }
  return [...warnings]
}
