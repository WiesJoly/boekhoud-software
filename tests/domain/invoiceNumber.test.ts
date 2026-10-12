import { describe, expect, test } from 'vitest'
import { allocateInvoiceNumber, chronologyProblem, extractInvoiceNumbers, invoiceCounterId, paymentReference, structuredCommunication } from '../../src/domain/invoiceNumber'

describe('allocateInvoiceNumber', () => {
  test('each year has its own counter document', () => {
    expect(invoiceCounterId(2026)).toBe('invoice-2026')
    expect(invoiceCounterId(2027)).toBe('invoice-2027')
  })
  test('starts at 0001 without a counter', () => {
    expect(allocateInvoiceNumber(null, 2026)).toEqual({ number: '2026-0001', next: 2 })
  })
  test('continues within the year of its own counter', () => {
    expect(allocateInvoiceNumber(42, 2026)).toEqual({ number: '2026-0042', next: 43 })
  })
  test('does not truncate beyond four digits', () => {
    expect(allocateInvoiceNumber(10000, 2026).number).toBe('2026-10000')
  })
})

describe('chronologyProblem', () => {
  const issued = [{ date: '2026-12-20', kind: 'invoice' as const }, { date: '2027-01-03', kind: 'invoice' as const }]
  test('date before the last invoice of that year is refused', () => {
    expect(chronologyProblem('2026-12-01', issued)).toContain('20 december 2026')
  })
  test('later date in the same year is fine', () => {
    expect(chronologyProblem('2026-12-30', issued)).toBeNull()
    expect(chronologyProblem('2027-01-03', issued)).toBeNull()
  })
  test('an earlier year is allowed only while it is the previous calendar year', () => {
    expect(chronologyProblem('2026-12-30', issued, '2027-01-05')).toBeNull()
    expect(chronologyProblem('2025-12-30', [], '2027-01-05')).toContain('2025')
  })
})

describe('gestructureerde mededeling', () => {
  test('derived from the invoice number with mod-97 check digits', () => {
    expect(structuredCommunication('2026-0142')).toBe('+++202/6000/14239+++')
  })
  test('remainder 0 becomes 97', () => {
    expect(structuredCommunication('2026-0006')).toBe('+++202/6000/00697+++')
  })
  test('payment reference is the OGM', () => {
    expect(paymentReference('2026-0142')).toBe('+++202/6000/14239+++')
  })
})

describe('extractInvoiceNumbers', () => {
  test('plain invoice numbers', () => {
    expect(extractInvoiceNumbers('Betaling factuur 2026-0142 en 2026-0143')).toEqual(['2026-0142', '2026-0143'])
    expect(extractInvoiceNumbers('IBAN BE12 3456')).toEqual([])
  })
  test('OGM in several notations', () => {
    expect(extractInvoiceNumbers('+++202/6000/14239+++')).toEqual(['2026-0142'])
    expect(extractInvoiceNumbers('***202/6000/14239***')).toEqual(['2026-0142'])
    expect(extractInvoiceNumbers('mededeling 202600014239')).toEqual(['2026-0142'])
  })
  test('OGM with wrong check digits is ignored', () => {
    expect(extractInvoiceNumbers('+++202/6000/14238+++')).toEqual([])
  })
  test('no duplicates when both notations appear', () => {
    expect(extractInvoiceNumbers('2026-0142 +++202/6000/14239+++')).toEqual(['2026-0142'])
  })
})
