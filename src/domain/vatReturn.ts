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

export interface VatReturn {
  box1aNetCents: number
  box1aVatCents: number
  box1eNetCents: number
  box5bCents: number
  payableCents: number
}

export function vatReturn(year: number, quarter: Quarter, invoices: Invoice[], expenses: Expense[]): VatReturn {
  let box1aNet = 0
  let box1aVat = 0
  let box1e = 0
  for (const invoice of invoices.filter((i) => inQuarter(i.date, year, quarter))) {
    for (const line of invoice.lines) {
      const net = Math.round(line.qty * line.unitCents)
      if (line.vatCode === 'standard21') { box1aNet += net; box1aVat += lineVat(net, 'standard21') }
      else if (line.vatCode === 'exempt') box1e += net
    }
  }
  const box5b = expenses.filter((e) => inQuarter(e.date, year, quarter)).reduce((s, e) => s + e.deductibleVatCents, 0)
  return { box1aNetCents: box1aNet, box1aVatCents: box1aVat, box1eNetCents: box1e, box5bCents: box5b, payableCents: box1aVat - box5b }
}

/** Net turnover from taxed services in a year (exempt care and out-of-scope income excluded). */
export function taxedTurnover(year: number, invoices: Invoice[]): number {
  const prefix = `${year}-`
  return invoices
    .filter((i) => i.date.startsWith(prefix))
    .flatMap((i) => i.lines)
    .filter((l) => l.vatCode === 'standard21')
    .reduce((s, l) => s + Math.round(l.qty * l.unitCents), 0)
}

export function korSignal(taxedTurnoverYearCents: number, params: FiscalParameters): { eligible: boolean; explanation: string } {
  const eligible = taxedTurnoverYearCents < params.korThresholdCents
  const threshold = formatCents(params.korThresholdCents)
  const explanation = eligible
    ? `Je belaste omzet (${formatCents(taxedTurnoverYearCents)}) blijft onder de KOR-drempel van ${threshold}. Je kunt kiezen voor de kleineondernemersregeling. In principe telt vrijgestelde zorg niet mee voor de drempel; bespreek de keuze met je fiscalist.`
    : `Je belaste omzet (${formatCents(taxedTurnoverYearCents)}) ligt boven de KOR-drempel van ${threshold}; de kleineondernemersregeling is niet mogelijk. Vrijgestelde zorg is hierbij niet meegeteld.`
  return { eligible, explanation }
}
