import { describe, expect, test } from 'vitest'
import { buildCreditLines, dueReminders, fillReminder, invoiceTotals, outstandingCents } from '../../src/domain/invoices'
import type { Debtor, Invoice, InvoiceLine } from '../../src/domain/types'

const lines: InvoiceLine[] = [
  { serviceId: 's1', description: 'Consult', date: '2026-01-05', qty: 1, unitCents: 9500, vatCode: 'exempt' },
  { serviceId: 's2', description: 'Coaching', date: '2026-01-06', qty: 1, unitCents: 10000, vatCode: 'standard21' },
]
const inv = (o: Partial<Invoice> = {}): Invoice => ({ id: 'i1', number: '2026-0001', kind: 'invoice', date: '2026-01-01', dueDate: '2026-01-15', debtorId: 'd1', lines, netCents: 19500, vatCents: 2100, totalCents: 21600, paymentReference: '', paidCents: 0, status: 'open', reminders: [], ...o })
const client: Debtor = { id: 'd1', type: 'client', displayName: 'C-001', invoiceName: 'A. Jansen', address: '', email: '', remindersEnabled: true }

describe('totals and credits', () => {
  test('VAT per line, summed', () => {
    expect(invoiceTotals(lines)).toEqual({ netCents: 19500, vatCents: 2100, totalCents: 21600 })
  })
  test('quantity multiplies', () => {
    expect(invoiceTotals([{ ...lines[1], qty: 2 }])).toEqual({ netCents: 20000, vatCents: 4200, totalCents: 24200 })
  })
  test('credit mirrors the original', () => {
    expect(invoiceTotals(buildCreditLines(inv()))).toEqual({ netCents: -19500, vatCents: -2100, totalCents: -21600 })
  })
})

describe('outstandingCents', () => {
  test('open amount', () => {
    expect(outstandingCents(inv({ totalCents: 10000 }), [])).toBe(10000)
  })
  test('never negative after credit of a partly paid invoice', () => {
    const credit = inv({ id: 'c1', kind: 'credit', creditOf: 'i1', totalCents: -10000 })
    expect(outstandingCents(inv({ totalCents: 10000, paidCents: 4000 }), [credit])).toBe(0)
  })
  test('ignores credits of other invoices', () => {
    const credit = inv({ id: 'c1', kind: 'credit', creditOf: 'other', totalCents: -10000 })
    expect(outstandingCents(inv({ totalCents: 10000 }), [credit])).toBe(10000)
  })
})

describe('dueReminders', () => {
  test('nothing before 14 days', () => {
    expect(dueReminders([inv()], [client], '2026-01-14')).toEqual([])
  })
  test('first reminder at 14 days', () => {
    expect(dueReminders([inv()], [client], '2026-01-15')).toEqual([{ invoiceId: 'i1', level: 1 }])
  })
  test('second reminder at 28 days after the first', () => {
    expect(dueReminders([inv({ reminders: [{ level: 1, date: '2026-01-15' }] })], [client], '2026-01-29')).toEqual([{ invoiceId: 'i1', level: 2 }])
  })
  test('nothing after both reminders', () => {
    const reminders = [{ level: 1 as const, date: '2026-01-15' }, { level: 2 as const, date: '2026-01-29' }]
    expect(dueReminders([inv({ reminders })], [client], '2026-03-01')).toEqual([])
  })
  test('respects per-client opt-out, organisations and paid invoices', () => {
    expect(dueReminders([inv()], [{ ...client, remindersEnabled: false }], '2026-02-01')).toEqual([])
    expect(dueReminders([inv()], [{ ...client, type: 'organisation' }], '2026-02-01')).toEqual([])
    expect(dueReminders([inv({ status: 'paid' })], [client], '2026-02-01')).toEqual([])
  })
})

test('fillReminder fills number and date', () => {
  expect(fillReminder(1, inv())).toContain('de factuur 2026-0001 van 1 januari 2026 staat nog open')
})

describe('allocatePayment', () => {
  test('pays invoices in order up to what is outstanding', async () => {
    const { allocatePayment } = await import('../../src/domain/invoices')
    const a = inv({ id: 'a', totalCents: 7500 })
    const b = inv({ id: 'b', totalCents: 7500, paidCents: 2500 })
    expect(allocatePayment([a, b], [], 10000)).toEqual([
      { id: 'a', paidCents: 7500, status: 'paid' },
      { id: 'b', paidCents: 5000, status: 'open' },
    ])
  })
  test('overpayment stays on the last invoice', async () => {
    const { allocatePayment } = await import('../../src/domain/invoices')
    expect(allocatePayment([inv({ id: 'a', totalCents: 7500 })], [], 8000)).toEqual([{ id: 'a', paidCents: 8000, status: 'paid' }])
  })
})
