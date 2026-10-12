import { describe, expect, test } from 'vitest'
import { ACCOUNTS } from '../../src/domain/accounts'
import { CATEGORIES, shouldCapitalize, suggestCategory, supplierKey } from '../../src/domain/expenses'
import { depreciationForYear, depreciationSchedule } from '../../src/domain/depreciation'

describe('accounts', () => {
  test('at least 40 unique accounts', () => {
    expect(ACCOUNTS.length).toBeGreaterThanOrEqual(40)
    expect(new Set(ACCOUNTS.map((a) => a.id)).size).toBe(ACCOUNTS.length)
  })
  test('Belgian debtor accounts exist', () => {
    for (const id of ['debiteuren-ziekenfondsen', 'debiteuren-netwerken', 'nog-te-factureren', 'omzet-riziv', 'omzet-annulering']) {
      expect(ACCOUNTS.map((a) => a.id)).toContain(id)
    }
  })
  test('every category books to an existing cost account', () => {
    expect(CATEGORIES).toHaveLength(15)
    for (const c of CATEGORIES) expect(ACCOUNTS.find((a) => a.id === c.account)?.group).toBe('costs')
  })
})

describe('supplier rules', () => {
  test('supplierKey normalises', () => {
    expect(supplierKey(' Zoom  B.V. ')).toBe('zoom')
    expect(supplierKey('Bol.com BV')).toBe('bol.com')
    expect(supplierKey('Proximus NV')).toBe('proximus')
    expect(supplierKey('Acme SRL')).toBe('acme')
    expect(supplierKey('Praktijk  Noord')).toBe('praktijk noord')
  })
  test('suggestCategory uses the normalised key', () => {
    expect(suggestCategory('ZOOM bv', { zoom: 'software-ict' })).toBe('software-ict')
    expect(suggestCategory('Onbekend', { zoom: 'software-ict' })).toBeNull()
  })
  test('capitalise strictly above threshold', () => {
    expect(shouldCapitalize(45000, 45000)).toBe(false)
    expect(shouldCapitalize(45001, 45000)).toBe(true)
  })
})

describe('depreciation', () => {
  test('monthly straight line from purchase month', () => {
    const s = depreciationSchedule(120000, '2026-07-15', 5)
    expect(s).toHaveLength(60)
    expect(s[0]).toEqual({ month: '2026-07', amountCents: 2000 })
    expect(s.at(-1)!.month).toBe('2031-06')
    expect(s.reduce((a, b) => a + b.amountCents, 0)).toBe(120000)
    expect(depreciationForYear(s, 2026)).toBe(12000)
  })
  test('rounding is absorbed in the last month', () => {
    const s = depreciationSchedule(100000, '2026-01-01', 3)
    expect(s.reduce((a, b) => a + b.amountCents, 0)).toBe(100000)
  })
  test('residual value is not depreciated', () => {
    const s = depreciationSchedule(100000, '2026-01-01', 1, 40000)
    expect(s.reduce((a, b) => a + b.amountCents, 0)).toBe(60000)
  })
})
