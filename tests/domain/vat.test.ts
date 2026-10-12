import { describe, expect, test } from 'vitest'
import { inputVat, invoiceWarnings, lineVat, proRata } from '../../src/domain/vat'
import type { Debtor, InvoiceLine, Service } from '../../src/domain/types'

describe('lineVat', () => {
  test('21% rounded for standard21, zero otherwise', () => {
    expect(lineVat(10000, 'standard21')).toBe(2100)
    expect(lineVat(333, 'standard21')).toBe(70)
    expect(lineVat(10000, 'exempt')).toBe(0)
    expect(lineVat(10000, 'outside')).toBe(0)
    expect(lineVat(-10000, 'standard21')).toBe(-2100)
  })
})

describe('inputVat', () => {
  test('fully exempt practice: all input VAT is cost', () => {
    expect(inputVat(2100, 'exempt', 'mixed', 0.5)).toEqual({ deductibleVatCents: 0, nonDeductibleVatCents: 2100 })
  })
  test('fully taxed practice: all deductible', () => {
    expect(inputVat(2100, 'taxed', 'mixed', 0)).toEqual({ deductibleVatCents: 2100, nonDeductibleVatCents: 0 })
  })
  test('mixed practice follows attribution', () => {
    expect(inputVat(2100, 'mixed', 'taxed', 0.3)).toEqual({ deductibleVatCents: 2100, nonDeductibleVatCents: 0 })
    expect(inputVat(2100, 'mixed', 'exempt', 0.3)).toEqual({ deductibleVatCents: 0, nonDeductibleVatCents: 2100 })
    expect(inputVat(2100, 'mixed', 'mixed', 0.3)).toEqual({ deductibleVatCents: 630, nonDeductibleVatCents: 1470 })
  })
})

describe('proRata', () => {
  test('taxed share of turnover', () => {
    expect(proRata(3000, 10000)).toBe(0.3)
    expect(proRata(0, 0)).toBe(0)
  })
})

describe('invoiceWarnings', () => {
  const services: Service[] = [
    { id: 's1', name: 'Consult', code: 'CO0012', rateCents: 9500, vatCode: 'exempt', nzaMaxCents: 10000, revenueAccount: 'omzet-zelfbetalers', isCare: true },
    { id: 's2', name: 'Nieuw', code: '', rateCents: 5000, vatCode: null, revenueAccount: 'omzet-coaching', isCare: false },
  ]
  const client: Debtor = { id: 'd1', type: 'client', displayName: 'C-001', invoiceName: 'A. Jansen', address: '', email: '', remindersEnabled: true }
  const org: Debtor = { ...client, id: 'd2', type: 'organisation' }
  const line = (o: Partial<InvoiceLine>): InvoiceLine => ({ serviceId: 's1', description: 'Consult', date: '2026-01-05', qty: 1, unitCents: 9500, vatCode: 'exempt', ...o })

  test('clean invoice to a client has no warnings', () => {
    expect(invoiceWarnings([line({})], client, services)).toEqual([])
  })
  test('service without VAT code', () => {
    expect(invoiceWarnings([line({ serviceId: 's2' })], client, services)).toContain('MISSING_VAT_CODE')
  })
  test('exempt invoice to organisation', () => {
    expect(invoiceWarnings([line({}), line({})], org, services)).toEqual(['EXEMPT_TO_ORGANISATION'])
  })
  test('rate above NZa maximum', () => {
    expect(invoiceWarnings([line({ unitCents: 10001 })], client, services)).toEqual(['ABOVE_NZA_MAX'])
  })
})
