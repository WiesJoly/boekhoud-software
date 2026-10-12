import { describe, expect, test } from 'vitest'
import { allocateInvoiceNumber, extractInvoiceNumbers, paymentReference } from '../../src/domain/invoiceNumber'

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

describe('payment references', () => {
  test('neutral reference', () => {
    expect(paymentReference('Praktijk De Linde', '2026-0142')).toBe('Praktijk De Linde – factuur 2026-0142')
  })
  test('extracts invoice numbers from bank descriptions', () => {
    expect(extractInvoiceNumbers('Betaling factuur 2026-0142 en 2026-0143')).toEqual(['2026-0142', '2026-0143'])
    expect(extractInvoiceNumbers('IBAN NL12 3456')).toEqual([])
  })
})
