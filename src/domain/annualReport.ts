import { ACCOUNTS, accountName } from './accounts'
import { depreciationForYear, depreciationSchedule, depreciationUntil } from './depreciation'
import { categoryOf } from './expenses'
import { outstandingCents } from './invoices'
import type { BankTransaction, Consult, Debtor, DebtorType, Expense, Invoice, Mileage, Service, Settings } from './types'
import { vatReturn } from './vatReturn'

export interface ReportInput {
  year: number
  settings: Settings
  services: Service[]
  debtors: Debtor[]
  consults: Consult[]
  invoices: Invoice[]
  expenses: Expense[]
  transactions: BankTransaction[]
  mileage: Mileage[]
  mileageRateCents: number
}

export interface ReportLine {
  account: string
  cents: number
}

const DEBTOR_ACCOUNT: Record<DebtorType, string> = {
  mutuality: 'debiteuren-ziekenfondsen',
  network: 'debiteuren-netwerken',
  client: 'debiteuren-clienten',
  organisation: 'debiteuren-overig',
}

const inYear = (date: string, year: number) => date.startsWith(`${year}-`)
const lineNet = (l: { qty: number; unitCents: number }) => Math.round(l.qty * l.unitCents)

/** Consults that count as revenue on their own (not rejected, not billed through an invoice). */
const consultRevenue = (consults: Consult[]) => consults.filter((c) => c.status !== 'rejected' && !c.invoiceId)
const consultAmount = (c: Consult) => (c.status === 'paid' ? c.paidCents : c.amountCents)

function consultAccount(c: Consult, debtors: Debtor[]): string {
  if (c.status === 'registered') return 'nog-te-factureren'
  const type = debtors.find((d) => d.id === c.debtorId)?.type
  if (type === 'network') return 'omzet-netwerk'
  if (type === 'mutuality') return 'omzet-riziv'
  return 'omzet-zelfbetalers'
}

const assetCost = (e: Expense) => e.amountInclCents - e.deductibleVatCents
const scheduleOf = (e: Expense) => depreciationSchedule(assetCost(e), e.date, e.assetLifeYears ?? 5)

function collect(entries: [string, number][]): ReportLine[] {
  const totals = new Map<string, number>()
  for (const [account, cents] of entries) totals.set(account, (totals.get(account) ?? 0) + cents)
  const order = (id: string) => {
    const i = ACCOUNTS.findIndex((a) => a.id === id)
    return i < 0 ? ACCOUNTS.length : i
  }
  return [...totals]
    .filter(([, cents]) => cents !== 0)
    .sort(([a], [b]) => order(a) - order(b))
    .map(([account, cents]) => ({ account, cents }))
}

function revenueEntries(input: ReportInput, from: string, to: string): { account: string; cents: number; care: boolean }[] {
  const within = (d: string) => d >= from && d <= to
  const entries: { account: string; cents: number; care: boolean }[] = []
  for (const invoice of input.invoices.filter((i) => within(i.date))) {
    for (const line of invoice.lines) {
      const service = input.services.find((s) => s.id === line.serviceId)
      entries.push({ account: service?.revenueAccount ?? 'omzet-overig', cents: lineNet(line), care: service?.isCare ?? false })
    }
  }
  for (const c of consultRevenue(input.consults).filter((c) => within(c.date))) {
    entries.push({ account: consultAccount(c, input.debtors), cents: consultAmount(c), care: true })
  }
  return entries
}

export function profitAndLoss(input: ReportInput): { revenue: ReportLine[]; costs: ReportLine[]; profitCents: number } {
  const { year } = input
  const revenue = collect(revenueEntries(input, `${year}-01-01`, `${year}-12-31`).map((e) => [e.account, e.cents]))

  const costEntries: [string, number][] = []
  for (const e of input.expenses) {
    if (e.capitalize) costEntries.push(['kosten-afschrijvingen', depreciationForYear(scheduleOf(e), year)])
    else if (inYear(e.date, year)) costEntries.push([categoryOf(e.category)?.account ?? 'kosten-kantoor', assetCost(e)])
  }
  const km = input.mileage.filter((m) => inYear(m.date, year)).reduce((s, m) => s + m.km, 0)
  costEntries.push(['kosten-vervoer', Math.round(km * input.mileageRateCents)])
  const costs = collect(costEntries)

  const sum = (l: ReportLine[]) => l.reduce((s, x) => s + x.cents, 0)
  return { revenue, costs, profitCents: sum(revenue) - sum(costs) }
}

/** Position at 31 December. Payments are taken as currently recorded. */
export function balanceSheet(input: ReportInput): { assets: ReportLine[]; liabilities: ReportLine[]; equityCents: number } {
  const { year, settings } = input
  const end = `${year}-12-31`
  const assets: [string, number][] = []
  const liabilities: [string, number][] = []

  const bank = input.transactions
    .filter((t) => t.date >= settings.openingBalanceDate && t.date <= end)
    .reduce((s, t) => s + t.amountCents, settings.openingBalanceCents)
  assets.push(['zakelijke-bank', bank])

  for (const e of input.expenses.filter((e) => e.capitalize && e.date <= end)) {
    assets.push(['inventaris', assetCost(e) - depreciationUntil(scheduleOf(e), year)])
  }

  const credits = input.invoices.filter((i) => i.kind === 'credit')
  for (const invoice of input.invoices.filter((i) => i.kind === 'invoice' && i.date <= end)) {
    const type = input.debtors.find((d) => d.id === invoice.debtorId)?.type ?? 'organisation'
    assets.push([DEBTOR_ACCOUNT[type], outstandingCents(invoice, credits)])
  }
  for (const c of consultRevenue(input.consults).filter((c) => c.date <= end)) {
    if (c.status === 'declared') {
      const type = input.debtors.find((d) => d.id === c.debtorId)?.type ?? 'mutuality'
      assets.push([DEBTOR_ACCOUNT[type], c.amountCents])
    } else if (c.status === 'registered') assets.push(['nog-te-factureren', c.amountCents])
  }

  if (settings.vatProfile === 'mixed' || settings.vatProfile === 'taxed') {
    const vat = ([1, 2, 3, 4] as const).reduce((s, q) => {
      const r = vatReturn(year, q, input.invoices, input.expenses)
      return s + r.grid71Cents - r.grid72Cents
    }, 0)
    if (vat >= 0) liabilities.push(['btw-te-betalen', vat])
    else assets.push(['btw-te-vorderen', -vat])
  }

  const a = collect(assets)
  const l = collect(liabilities)
  const sum = (x: ReportLine[]) => x.reduce((s, y) => s + y.cents, 0)
  return { assets: a, liabilities: l, equityCents: sum(a) - sum(l) }
}

export function revenueSplit(input: ReportInput, from: string, to: string): { careCents: number; otherCents: number } {
  let care = 0
  let other = 0
  for (const e of revenueEntries(input, from, to)) {
    if (e.care) care += e.cents
    else other += e.cents
  }
  return { careCents: care, otherCents: other }
}

const decimal = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

/** Rows for the accountant: pseudonymised (client numbers only, no service codes or free-text descriptions). */
export function exportRows(input: ReportInput): string[][] {
  const { year } = input
  const debtorName = (id: string) => input.debtors.find((d) => d.id === id)?.displayName ?? ''
  const rows: string[][] = []

  for (const invoice of input.invoices.filter((i) => inYear(i.date, year))) {
    for (const line of invoice.lines) {
      const account = input.services.find((s) => s.id === line.serviceId)?.revenueAccount ?? 'omzet-overig'
      const kind = invoice.kind === 'credit' ? 'creditnota' : 'factuur'
      rows.push([invoice.date, kind, accountName(account), debtorName(invoice.debtorId), `${kind === 'factuur' ? 'Factuur' : 'Creditnota'} ${invoice.number}`, decimal(lineNet(line))])
    }
  }
  for (const c of consultRevenue(input.consults).filter((c) => inYear(c.date, year))) {
    rows.push([c.date, 'sessie', accountName(consultAccount(c, input.debtors)), debtorName(c.debtorId), 'Sessie', decimal(consultAmount(c))])
  }
  for (const e of input.expenses.filter((e) => inYear(e.date, year))) {
    const category = categoryOf(e.category)
    const account = e.capitalize ? 'inventaris' : category?.account ?? 'kosten-kantoor'
    rows.push([e.date, 'uitgave', accountName(account), e.supplier, category?.label ?? '', decimal(-e.amountInclCents)])
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]))
  return [['datum', 'soort', 'rekening', 'debiteur', 'omschrijving', 'bedrag'], ...rows]
}
