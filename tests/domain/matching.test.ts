import { describe, expect, test } from 'vitest'
import { suggestMatch, type MatchContext } from '../../src/domain/matching'
import type { BankTransaction, Consult, Debtor, Expense, Invoice } from '../../src/domain/types'

const tx = (o: Partial<BankTransaction>): BankTransaction => ({ id: 't', date: '2026-02-01', amountCents: 9500, counterparty: '', description: '', importHash: 'h', confirmed: false, ...o })
const invoice = (o: Partial<Invoice>): Invoice => ({ id: 'i1', number: '2026-0001', kind: 'invoice', date: '2026-01-10', dueDate: '2026-01-24', debtorId: 'd1', lines: [], netCents: 9500, vatCents: 0, totalCents: 9500, paymentReference: '', paidCents: 0, status: 'open', reminders: [], ...o })
const mutuality: Debtor = { id: 'cm', type: 'mutuality', displayName: 'CM', invoiceName: 'CM', address: '', email: '', remindersEnabled: false }
const consult = (id: string, date: string, paid: number, o: Partial<Consult> = {}): Consult => ({ id, externalId: id, date, debtorId: 'cm', serviceCode: 'X', amountCents: paid, status: 'paid', paidCents: paid, ...o })
const expense: Expense = { id: 'e1', date: '2026-01-30', supplier: 'Zoom', category: 'software-ict', amountInclCents: 1499, vatCents: 260, vatAttribution: 'mixed', deductibleVatCents: 0, capitalize: false }

const ctx = (o: Partial<MatchContext> = {}): MatchContext => ({ invoices: [], consults: [], debtors: [mutuality], expenses: [], transactions: [], ...o })

describe('suggestMatch', () => {
  test('invoice number in description of an incoming payment', () => {
    const result = suggestMatch(tx({ description: '+++202/6000/00192+++' }), ctx({ invoices: [invoice({})] }))
    expect(result).toMatchObject({ type: 'invoice', ids: ['i1'] })
  })
  test('multiple invoice numbers', () => {
    const r = suggestMatch(tx({ description: '2026-0001 2026-0002' }), ctx({ invoices: [invoice({}), invoice({ id: 'i2', number: '2026-0002' })] }))
    expect(r?.ids).toEqual(['i1', 'i2'])
  })
  test('already paid invoice is not matched', () => {
    expect(suggestMatch(tx({ description: 'factuur 2026-0001' }), ctx({ invoices: [invoice({ status: 'paid' })] }))).toBeNull()
  })
  test('ziekenfonds lump sum matched to oldest paid consults that add up', () => {
    const consults = [consult('c3', '2026-01-20', 3000), consult('c1', '2026-01-05', 5000), consult('c2', '2026-01-12', 4500)]
    const r = suggestMatch(tx({ counterparty: 'CM Christelijke Mutualiteit', amountCents: 9500 }), ctx({ consults }))
    expect(r).toMatchObject({ type: 'consults', ids: ['c1', 'c2'] })
  })
  test('consults already linked to a bank transaction are skipped', () => {
    const consults = [consult('c1', '2026-01-05', 5000, { bankTransactionId: 'old' }), consult('c2', '2026-01-12', 9500)]
    expect(suggestMatch(tx({ counterparty: 'CM', amountCents: 9500 }), ctx({ consults }))?.ids).toEqual(['c2'])
  })
  test('ziekenfonds payment without a summing set gives no match', () => {
    const consults = [consult('c1', '2026-01-05', 5000)]
    expect(suggestMatch(tx({ counterparty: 'CM', amountCents: 1234 }), ctx({ consults }))).toBeNull()
  })
  test('outgoing payment matched to expense by amount and supplier', () => {
    expect(suggestMatch(tx({ counterparty: 'ZOOM.US', amountCents: -1499 }), ctx({ expenses: [expense] }))).toMatchObject({ type: 'expense', ids: ['e1'] })
  })
  test('expense already matched by a confirmed transaction is skipped', () => {
    const done = tx({ id: 'other', confirmed: true, match: { type: 'expense', ids: ['e1'] } })
    expect(suggestMatch(tx({ counterparty: 'Zoom', amountCents: -1499 }), ctx({ expenses: [expense], transactions: [done] }))).toBeNull()
  })
  test('no match', () => {
    expect(suggestMatch(tx({ description: 'iets' }), ctx())).toBeNull()
  })
})
