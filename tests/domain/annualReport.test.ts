import { describe, expect, test } from 'vitest'
import { balanceSheet, exportRows, profitAndLoss, revenueSplit, type ReportInput } from '../../src/domain/annualReport'
import type { BankTransaction, Consult, Expense, Invoice } from '../../src/domain/types'

const consult = (id: string, date: string, status: Consult['status'], o: Partial<Consult> = {}): Consult => ({ id, externalId: id, date, debtorId: 'cz', serviceCode: 'CO0012', amountCents: 13246, status, paidCents: status === 'paid' ? 13246 : 0, ...o })
const invoice = (o: Partial<Invoice>): Invoice => ({ id: 'i', number: '2026-0001', kind: 'invoice', date: '2026-03-01', dueDate: '2026-03-15', debtorId: 'c1', lines: [], netCents: 0, vatCents: 0, totalCents: 0, paymentReference: '', paidCents: 0, status: 'open', reminders: [], ...o })
const tx = (date: string, amountCents: number): BankTransaction => ({ id: date, date, amountCents, counterparty: '', description: '', importHash: date, confirmed: true })
const expense = (o: Partial<Expense>): Expense => ({ id: 'e', date: '2026-02-01', supplier: 'Zoom', category: 'software-ict', amountInclCents: 1210, vatCents: 210, vatAttribution: 'mixed', deductibleVatCents: 100, capitalize: false, ...o })

const input: ReportInput = {
  year: 2026,
  settings: { name: 'Praktijk', address: '', kvk: '', agbPractice: '', agbProvider: '', big: '', vatNumber: '', iban: '', vatProfile: 'mixed', openingBalanceCents: 300000, openingBalanceDate: '2026-01-01' },
  services: [
    { id: 's-care', name: 'Consult', code: 'CO0012', rateCents: 9500, vatCode: 'exempt', revenueAccount: 'omzet-zelfbetalers', isCare: true },
    { id: 's-coach', name: 'Coaching', code: 'COACH1', rateCents: 10000, vatCode: 'standard21', revenueAccount: 'omzet-coaching', isCare: false },
  ],
  debtors: [
    { id: 'cz', type: 'insurer', displayName: 'CZ', invoiceName: 'CZ', address: '', email: '', remindersEnabled: false },
    { id: 'c1', type: 'client', displayName: 'C-001', invoiceName: 'Anna Geheim', address: '', email: '', remindersEnabled: true },
    { id: 'o1', type: 'organisation', displayName: 'Bedrijf BV', invoiceName: 'Bedrijf BV', address: '', email: '', remindersEnabled: false },
  ],
  consults: [
    consult('k1', '2026-01-05', 'paid'),
    consult('k2', '2026-02-05', 'declared'),
    consult('k3', '2026-12-20', 'registered'),
    consult('k4', '2026-03-05', 'rejected'),
    consult('k5', '2026-02-20', 'paid', { invoiceId: 'i1', debtorId: 'c1', amountCents: 9500, paidCents: 9500 }),
  ],
  invoices: [
    invoice({ id: 'i1', debtorId: 'c1', lines: [{ serviceId: 's-care', description: 'Consult CO0012', date: '2026-02-20', qty: 1, unitCents: 9500, vatCode: 'exempt' }], netCents: 9500, totalCents: 9500, paidCents: 9500, status: 'paid' }),
    invoice({ id: 'i2', number: '2026-0002', date: '2026-04-01', debtorId: 'o1', lines: [{ serviceId: 's-coach', description: 'Coaching', date: '2026-04-01', qty: 1, unitCents: 10000, vatCode: 'standard21' }], netCents: 10000, vatCents: 2100, totalCents: 12100 }),
  ],
  expenses: [
    expense({ id: 'e1' }),
    expense({ id: 'e2', date: '2026-07-15', supplier: 'Apple', category: 'inventaris', amountInclCents: 145200, vatCents: 25200, deductibleVatCents: 25200, vatAttribution: 'taxed', capitalize: true, assetLifeYears: 5 }),
  ],
  transactions: [tx('2026-01-20', 13246), tx('2026-03-05', 9500), tx('2026-02-01', -1210), tx('2026-07-15', -145200), tx('2026-08-01', -50000), tx('2027-01-02', 999)],
  mileage: [{ id: 'm', date: '2026-05-01', from: 'A', to: 'B', km: 100, purpose: 'Intervisie' }],
  mileageRateCents: 23,
}

const lineOf = (lines: { account: string; cents: number }[], account: string) => lines.find((l) => l.account === account)?.cents

describe('profitAndLoss', () => {
  const pl = profitAndLoss(input)
  test('revenue per account; rejected and invoiced consults excluded', () => {
    expect(lineOf(pl.revenue, 'omzet-zorg-verzekeraar')).toBe(26492)
    expect(lineOf(pl.revenue, 'nog-te-declareren')).toBe(13246)
    expect(lineOf(pl.revenue, 'omzet-zelfbetalers')).toBe(9500)
    expect(lineOf(pl.revenue, 'omzet-coaching')).toBe(10000)
  })
  test('costs: VAT that cannot be reclaimed is cost, assets depreciate, mileage at the km rate', () => {
    expect(lineOf(pl.costs, 'kosten-ict')).toBe(1110)
    expect(lineOf(pl.costs, 'kosten-afschrijvingen')).toBe(12000)
    expect(lineOf(pl.costs, 'kosten-vervoer')).toBe(2300)
    expect(lineOf(pl.costs, 'kosten-kantoor')).toBeUndefined()
  })
  test('profit', () => {
    expect(pl.profitCents).toBe(59238 - 15410)
  })
})

describe('balanceSheet', () => {
  const bs = balanceSheet(input)
  test('asset lines at year end', () => {
    expect(lineOf(bs.assets, 'zakelijke-bank')).toBe(126336)
    expect(lineOf(bs.assets, 'inventaris')).toBe(108000)
    expect(lineOf(bs.assets, 'debiteuren-overig')).toBe(12100)
    expect(lineOf(bs.assets, 'debiteuren-verzekeraars')).toBe(13246)
    expect(lineOf(bs.assets, 'nog-te-declareren')).toBe(13246)
    expect(lineOf(bs.assets, 'btw-te-vorderen')).toBe(23200)
  })
  test('balances', () => {
    const sum = (l: { cents: number }[]) => l.reduce((s, x) => s + x.cents, 0)
    expect(sum(bs.assets) - sum(bs.liabilities)).toBe(bs.equityCents)
  })
  test('fully exempt practice has no VAT position', () => {
    const exempt = balanceSheet({ ...input, settings: { ...input.settings, vatProfile: 'exempt' } })
    expect(lineOf(exempt.assets, 'btw-te-vorderen')).toBeUndefined()
  })
})

describe('revenueSplit', () => {
  test('care vs other in a period', () => {
    expect(revenueSplit(input, '2026-01-01', '2026-12-31')).toEqual({ careCents: 13246 * 3 + 9500, otherCents: 10000 })
    expect(revenueSplit(input, '2026-04-01', '2026-04-30')).toEqual({ careCents: 0, otherCents: 10000 })
  })
})

describe('privacy', () => {
  test('export and P&L contain no client names or service codes', () => {
    const rows = exportRows(input)
    expect(rows[0]).toEqual(['datum', 'soort', 'rekening', 'debiteur', 'omschrijving', 'bedrag'])
    const text = JSON.stringify([rows, profitAndLoss(input), balanceSheet(input)])
    for (const secret of ['Anna Geheim', 'CO0012', 'COACH1']) expect(text).not.toContain(secret)
    expect(text).toContain('C-001')
  })
})
