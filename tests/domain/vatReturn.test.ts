import { describe, expect, test } from 'vitest'
import { FISCAL_DEFAULTS_2026 } from '../../src/domain/fiscal'
import { quarterOf, smallBusinessSignal, taxedTurnover, vatReturn } from '../../src/domain/vatReturn'
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
  test('Q1 roosters', () => {
    expect(vatReturn(2026, 1, invoices, [exp('2026-01-15', 500), exp('2026-04-15', 999)])).toEqual({
      grid00Cents: 9500, grid03Cents: 10000, grid54Cents: 2100, grid59Cents: 500, grid71Cents: 1600, grid72Cents: 0,
    })
  })
  test('more deductible than due gives rooster 72', () => {
    expect(vatReturn(2026, 1, [], [exp('2026-01-15', 500)])).toMatchObject({ grid71Cents: 0, grid72Cents: 500 })
  })
  test('credit note in the quarter reduces 03 and 54', () => {
    const credit = inv('cr', '2026-03-01', [{ ...line(10000, 'standard21'), qty: -1 }], 'credit')
    expect(vatReturn(2026, 1, [...invoices, credit], [])).toMatchObject({ grid03Cents: 0, grid54Cents: 0 })
  })
})

describe('vrijstellingsregeling kleine ondernemingen', () => {
  test('taxed turnover excludes art. 44 care', () => {
    expect(taxedTurnover(2026, invoices)).toBe(60000)
  })
  test('signal below the € 25.000 threshold', () => {
    expect(smallBusinessSignal(1500000, FISCAL_DEFAULTS_2026).eligible).toBe(true)
    expect(smallBusinessSignal(2500000, FISCAL_DEFAULTS_2026).eligible).toBe(false)
    expect(smallBusinessSignal(1500000, FISCAL_DEFAULTS_2026).explanation).toContain('artikel 44')
  })
})
