import { describe, expect, test } from 'vitest'
import { allocateInvoiceNumber, extractInvoiceNumbers, paymentReference, structuredCommunication } from '../../src/domain/invoiceNumber'

describe('allocateInvoiceNumber', () => {
  test('starts at 0001 without a counter', () => {
    expect(allocateInvoiceNumber(null, 2026)).toEqual({ number: '2026-0001', counter: { year: 2026, next: 2 } })
  })
  test('continues within a year', () => {
    expect(allocateInvoiceNumber({ year: 2026, next: 42 }, 2026).number).toBe('2026-0042')
  })
  test('restarts in a new year', () => {
    expect(allocateInvoiceNumber({ year: 2026, next: 43 }, 2027)).toEqual({ number: '2027-0001', counter: { year: 2027, next: 2 } })
  })
  test('does not truncate beyond four digits', () => {
    expect(allocateInvoiceNumber({ year: 2026, next: 10000 }, 2026).number).toBe('2026-10000')
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
