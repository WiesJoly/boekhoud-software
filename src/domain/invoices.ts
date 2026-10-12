import type { Debtor, Invoice, InvoiceLine } from './types'
import { lineVat } from './vat'

export function invoiceTotals(lines: InvoiceLine[]): { netCents: number; vatCents: number; totalCents: number } {
  let net = 0
  let vat = 0
  for (const line of lines) {
    const lineNet = Math.round(line.qty * line.unitCents)
    net += lineNet
    vat += lineVat(lineNet, line.vatCode)
  }
  return { netCents: net, vatCents: vat, totalCents: net + vat }
}

export function buildCreditLines(original: Invoice): InvoiceLine[] {
  return original.lines.map((l) => ({ ...l, qty: -l.qty }))
}

export function outstandingCents(invoice: Invoice, credits: Invoice[]): number {
  const credited = credits.filter((c) => c.kind === 'credit' && c.creditOf === invoice.id).reduce((s, c) => s + c.totalCents, 0)
  return Math.max(0, invoice.totalCents + credited - invoice.paidCents)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10)
}

export function dueReminders(invoices: Invoice[], debtors: Debtor[], today: string): { invoiceId: string; level: 1 | 2 }[] {
  const result: { invoiceId: string; level: 1 | 2 }[] = []
  for (const invoice of invoices) {
    if (invoice.kind !== 'invoice' || invoice.status !== 'open') continue
    const debtor = debtors.find((d) => d.id === invoice.debtorId)
    if (!debtor || debtor.type !== 'client' || !debtor.remindersEnabled) continue
    const age = daysBetween(invoice.date, today)
    const has = (level: 1 | 2) => invoice.reminders.some((r) => r.level === level)
    if (age >= 28 && has(1) && !has(2)) result.push({ invoiceId: invoice.id, level: 2 })
    else if (age >= 14 && !has(1)) result.push({ invoiceId: invoice.id, level: 1 })
  }
  return result
}

export const REMINDER_TEXT: Record<1 | 2, string> = {
  1: 'Vriendelijke herinnering: de factuur {nummer} van {datum} staat nog open. Mocht de betaling al onderweg zijn, dan kunt u dit bericht als niet verzonden beschouwen.',
  2: 'Tweede herinnering: de factuur {nummer} van {datum} staat nog open. Neem gerust contact op als betalen op dit moment lastig is, dan zoeken we samen naar een oplossing.',
}

export function formatDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function fillReminder(level: 1 | 2, invoice: Invoice): string {
  return REMINDER_TEXT[level].replace('{nummer}', invoice.number).replace('{datum}', formatDate(invoice.date))
}
