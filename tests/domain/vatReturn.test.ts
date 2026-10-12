import { describe, expect, test } from 'vitest'
import { FISCAL_DEFAULTS_2026 } from '../../src/domain/fiscal'
import { korSignal, quarterOf, taxedTurnover, vatReturn } from '../../src/domain/vatReturn'
import type { Expense, Invoice, InvoiceLine } from '../../src/domain/types'

const line = (unitCents: number, vatCode: InvoiceLine['vatCode']): InvoiceLine => ({ serviceId: 's', description: '', date: '', qty: 1, unitCents, vatCode })
const inv = (id: string, date: string, lines: InvoiceLine[], kind: Invoice['kind'] = 'invoice'): Invoice => ({ id, number: id, kind, date, dueDate: date, debtorId: 'd', lines, netCents: 0, vatCents: 0, totalCents: 0, paymentReference: '', paidCents: 0, status: 'open', reminders: [] })
const exp = (date: string, deductibleVatCents: number): Expense => ({ id: date, date, supplier: '', category: 'kantoor', amountInclCents: 0, vatCents: deductibleVatCents, vatAttribution: 'taxed', deductibleVatCents, capitalize: false })

const invoices = [
  inv('a', '2026-02-10', [line(10000, 'standard21')]),
  inv('b', '2026-03-20', [line(9500, 'exempt')]),
  inv('c', '2026-04-01', [line(50000, 'standard21')]),
]

describe('vatReturn', () => {
  test('quarterOf', () => {
    expect(quarterOf('2026-05-31')).toEqual({ year: 2026, quarter: 2 })
    expect(quarterOf('2026-12-31')).toEqual({ year: 2026, quarter: 4 })
  })
  test('Q1 boxes', () => {
    expect(vatReturn(2026, 1, invoices, [exp('2026-01-15', 500), exp('2026-04-15', 999)])).toEqual({
      box1aNetCents: 10000, box1aVatCents: 2100, box1eNetCents: 9500, box5bCents: 500, payableCents: 1600,
    })
  })
  test('credit invoice in the quarter reduces 1a', () => {
    const credit = inv('cr', '2026-03-01', [{ ...line(10000, 'standard21'), qty: -1 }], 'credit')
    expect(vatReturn(2026, 1, [...invoices, credit], []).box1aVatCents).toBe(0)
  })
})

describe('KOR', () => {
  test('taxed turnover excludes exempt care', () => {
    expect(taxedTurnover(2026, invoices)).toBe(60000)
  })
  test('signal below threshold', () => {
    expect(korSignal(1500000, FISCAL_DEFAULTS_2026).eligible).toBe(true)
    expect(korSignal(2500000, FISCAL_DEFAULTS_2026).eligible).toBe(false)
    expect(korSignal(1500000, FISCAL_DEFAULTS_2026).explanation).toContain('vrijgestelde zorg')
  })
})
