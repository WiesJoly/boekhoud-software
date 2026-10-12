import type { FiscalParameters } from './fiscal'
import { formatCents } from './money'
import type { Expense, Invoice } from './types'
import { lineVat } from './vat'

export type Quarter = 1 | 2 | 3 | 4

export function quarterOf(date: string): { year: number; quarter: Quarter } {
  return { year: Number(date.slice(0, 4)), quarter: (Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1) as Quarter }
}

const inQuarter = (date: string, year: number, quarter: Quarter) => {
  const q = quarterOf(date)
  return q.year === year && q.quarter === quarter
}

/**
 * Periodieke btw-aangifte (roosters). 00 = vrijgestelde handelingen (art. 44) van een gemengde btw-plichtige,
 * 03 = maatstaf 21%, 54 = verschuldigde btw, 59 = aftrekbare btw,
 * 48 = uitgereikte creditnota's (maatstaf), 64 = btw op uitgereikte creditnota's.
 */
export interface VatReturn {
  grid00Cents: number
  grid03Cents: number
  grid48Cents: number
  grid54Cents: number
  grid59Cents: number
  grid64Cents: number
  grid71Cents: number
  grid72Cents: number
}

export function vatReturn(year: number, quarter: Quarter, invoices: Invoice[], expenses: Expense[]): VatReturn {
  const g = { g00: 0, g03: 0, g48: 0, g54: 0, g64: 0 }
  for (const invoice of invoices.filter((i) => inQuarter(i.date, year, quarter))) {
    for (const line of invoice.lines) {
      const net = Math.round(line.qty * line.unitCents)
      const vat = lineVat(net, line.vatCode)
      if (invoice.kind === 'credit') {
        if (line.vatCode === 'standard21' || line.vatCode === 'exempt') { g.g48 += -net; g.g64 += -vat }
      } else if (line.vatCode === 'standard21') { g.g03 += net; g.g54 += vat }
      else if (line.vatCode === 'exempt') g.g00 += net
    }
  }
  const g59 = expenses.filter((e) => inQuarter(e.date, year, quarter)).reduce((s, e) => s + e.deductibleVatCents, 0)
  const due = g.g54
  const deductible = g59 + g.g64
  return {
    grid00Cents: g.g00, grid03Cents: g.g03, grid48Cents: g.g48, grid54Cents: g.g54, grid59Cents: g59, grid64Cents: g.g64,
    grid71Cents: Math.max(0, due - deductible), grid72Cents: Math.max(0, deductible - due),
  }
}

/** Net turnover from taxed services in a year (art. 44-vrijgestelde zorg and out-of-scope income excluded). */
export function taxedTurnover(year: number, invoices: Invoice[]): number {
  const prefix = `${year}-`
  return invoices
    .filter((i) => i.date.startsWith(prefix))
    .flatMap((i) => i.lines)
    .filter((l) => l.vatCode === 'standard21' || l.vatCode === 'smallBusiness')
    .reduce((s, l) => s + Math.round(l.qty * l.unitCents), 0)
}

/** Vrijstellingsregeling kleine ondernemingen (art. 56bis WBTW). */
export function smallBusinessSignal(taxedTurnoverYearCents: number, params: FiscalParameters): { eligible: boolean; explanation: string } {
  const eligible = taxedTurnoverYearCents < params.smallBusinessThresholdCents
  const threshold = formatCents(params.smallBusinessThresholdCents)
  const turnover = formatCents(taxedTurnoverYearCents)
  const explanation = eligible
    ? `Je belaste omzet (${turnover}) blijft onder de drempel van ${threshold}. Je kunt kiezen voor de vrijstellingsregeling voor kleine ondernemingen: geen btw aanrekenen en geen btw-aangifte, maar ook geen aftrek. Omzet uit zorg vrijgesteld door artikel 44 telt in principe niet mee. Bespreek de keuze met je boekhouder.`
    : `Je belaste omzet (${turnover}) ligt boven de drempel van ${threshold}; de vrijstellingsregeling voor kleine ondernemingen is niet mogelijk. Omzet vrijgesteld door artikel 44 is niet meegeteld.`
  return { eligible, explanation }
}
